import OpenAI from "openai";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const SUPPORTED_LANGUAGES = new Set([
  "en",
  "ne",
  "hi",
  "zh",
  "ar",
  "es",
  "fr",
  "de",
  "pt",
  "bn",
]);

export async function detectLanguage(text: string): Promise<string> {
  if (text.trim().length < 3) return "auto";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Detect the language of the following message. " +
            "Reply with ONLY the ISO 639-1 two-letter language code (e.g. en, ne, hi, zh, ar, es, fr, de, pt, bn). " +
            "If unsure, reply with 'en'. No explanation, no punctuation — just the code.",
        },
        {
          role: "user",
          content: text.slice(0, 200),
        },
      ],
      max_tokens: 5,
      temperature: 0,
    });

    const detected =
      completion.choices[0]?.message?.content?.trim().toLowerCase() ?? "auto";

    if (SUPPORTED_LANGUAGES.has(detected)) {
      return detected;
    }

    logger.debug(
      { detected, text: text.slice(0, 50) },
      "Detected language not in supported set — using auto",
    );
    return "auto";
  } catch (err) {
    logger.error({ err }, "Language detection failed — falling back to auto");
    return "auto";
  }
}
