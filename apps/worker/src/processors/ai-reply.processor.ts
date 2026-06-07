import type { Job } from "bullmq";
import OpenAI from "openai";
import { createJobLogger } from "../lib/logger.js";
import { withTenantContext } from "../lib/prisma.js";
import { outboundQueue, notificationsQueue } from "../lib/queues.js";
import type { HumanHandoffNotifyJob } from "../types/job-payloads.js";
import { generateEmbedding } from "./embeddings.processor.js";
import { env } from "../config/env.js";
import { detectLanguage } from "../lib/language-detect.js";
import type { AiReplyJob, OutboundMessageJob } from "../types/job-payloads.js";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const CHAT_MODEL = "gpt-4o-mini";
const MAX_TOKENS = 500;
const TEMPERATURE = 0.7;
const RAG_TOP_K = 5;
const HISTORY_LIMIT = 10;
const MAX_RESPONSE_CHARS = 1500;

const HANDOFF_TRIGGERS = [
  "human agent",
  "staff member",
  "representative",
  "connect you with",
  "transfer you",
  "someone will assist",
  "team will reach",
  "please wait",
  "escalat",
];

function detectsHandoff(text: string): boolean {
  const lower = text.toLowerCase();
  return HANDOFF_TRIGGERS.some((trigger) => lower.includes(trigger));
}

export async function processAiReply(job: Job<AiReplyJob>): Promise<void> {
  const {
    tenantId,
    conversationId,
    // customerId,
    messageId,
    metaMessageId,
    inboundContent,
    phoneNumberId,
    senderPhone,
  } = job.data;

  const log = createJobLogger("ai-reply", job.id, tenantId);

  log.info(
    { conversationId, messageId, contentLength: inboundContent.length },
    "Processing AI reply",
  );

  const detectedLanguage = await detectLanguage(inboundContent);

  log.debug({ conversationId, detectedLanguage }, "Customer language detected");

  const aiPrompt = await withTenantContext(tenantId, async (tx) => {
    if (detectedLanguage !== "auto") {
      const languagePrompt = await tx.tenantAIPrompt.findFirst({
        where: {
          tenantId,
          isActive: true,
          deletedAt: null,
          language: detectedLanguage,
        },
        orderBy: { version: "desc" },
        select: { id: true, systemPrompt: true, persona: true, language: true },
      });

      if (languagePrompt) {
        return languagePrompt;
      }
    }

    return tx.tenantAIPrompt.findFirst({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        language: "auto",
      },
      orderBy: { version: "desc" },
      select: { id: true, systemPrompt: true, persona: true, language: true },
    });
  });

  if (!aiPrompt) {
    log.warn(
      { tenantId, conversationId, detectedLanguage },
      "No active AI prompt found for tenant — using built-in default",
    );
  } else {
    log.debug(
      { conversationId, promptLanguage: aiPrompt.language, detectedLanguage },
      "AI prompt selected",
    );
  }

  const systemPrompt =
    aiPrompt?.systemPrompt ??
    "You are a helpful WhatsApp business assistant. " +
      "Be concise, friendly, and professional. " +
      "Keep responses under 150 words suitable for WhatsApp.";

  const history = await withTenantContext(tenantId, async (tx) => {
    return tx.message.findMany({
      where: {
        conversationId,
        tenantId,
        deletedAt: null,

        id: { not: messageId },
      },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
      select: {
        direction: true,
        content: true,
        messageType: true,
      },
    });
  });

  const chronologicalHistory = history.reverse();

  log.debug(
    { conversationId, historyCount: chronologicalHistory.length },
    "Conversation history fetched",
  );

  let ragContext = "";

  try {
    const queryEmbedding = await generateEmbedding(inboundContent);

    const vectorStr = `[${queryEmbedding.join(",")}]`;

    const similarChunks = await withTenantContext(tenantId, async (tx) => {
      return tx.$queryRaw<Array<{ content: string; similarity: number }>>`
        SELECT
          content,
          1 - (embedding <=> ${vectorStr}::vector) AS similarity
        FROM knowledge_base_chunks
        WHERE "tenantId" = ${tenantId}::uuid
          AND "isActive" = true
        ORDER BY embedding <=> ${vectorStr}::vector
        LIMIT ${RAG_TOP_K}
      `;
    });

    if (similarChunks.length > 0) {
      ragContext = similarChunks
        .map((chunk, i) => `[${i + 1}] ${chunk.content}`)
        .join("\n\n");

      log.debug(
        {
          conversationId,
          chunksFound: similarChunks.length,
          topSimilarity: similarChunks[0]?.similarity,
        },
        "RAG context retrieved",
      );
    } else {
      log.debug({ conversationId }, "No relevant knowledge base chunks found");
    }
  } catch (err) {
    log.error(
      { err, conversationId },
      "RAG search failed — continuing without context",
    );
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  const fullSystemPrompt = ragContext
    ? `${systemPrompt}\n\n` +
      `RELEVANT BUSINESS INFORMATION:\n${ragContext}\n\n` +
      `Use the above information to answer accurately. ` +
      `If the information doesn't cover the question, be honest about it.`
    : systemPrompt;

  messages.push({
    role: "system",
    content: fullSystemPrompt,
  });

  for (const msg of chronologicalHistory) {
    if (!msg.content) continue;
    messages.push({
      role: msg.direction === "inbound" ? "user" : "assistant",
      content: msg.content,
    });
  }

  messages.push({
    role: "user",
    content: inboundContent,
  });

  let aiResponseText: string;

  try {
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
    });

    aiResponseText = completion.choices[0]?.message?.content?.trim() ?? "";

    if (!aiResponseText) {
      throw new Error("OpenAI returned empty response");
    }

    if (aiResponseText.length > MAX_RESPONSE_CHARS) {
      aiResponseText = aiResponseText.slice(0, MAX_RESPONSE_CHARS - 3) + "...";
    }

    log.info(
      {
        conversationId,
        responseLength: aiResponseText.length,
        model: CHAT_MODEL,
        tokensUsed: completion.usage?.total_tokens,
      },
      "AI response generated",
    );
  } catch (err) {
    log.error({ err, conversationId }, "OpenAI chat completion failed");
    throw err;
  }

  const savedMessage = await withTenantContext(tenantId, async (tx) => {
    return tx.message.create({
      data: {
        tenantId,
        conversationId,
        messageType: "TEXT",
        direction: "outbound",
        content: aiResponseText,
        status: "QUEUED",
        metadata: {
          aiGenerated: true,
          model: CHAT_MODEL,
          ragChunksUsed: ragContext ? RAG_TOP_K : 0,
          inReplyToMetaId: metaMessageId,
          detectedLanguage,
          promptLanguage: aiPrompt?.language ?? "default",
        },
      },
      select: { id: true },
    });
  });

  log.info(
    { messageId: savedMessage.id, conversationId },
    "AI response saved to DB",
  );

  if (detectsHandoff(aiResponseText)) {
    log.info(
      { conversationId, messageId: savedMessage.id },
      "Handoff trigger detected in AI response — updating conversation state",
    );

    const convDetails = await withTenantContext(tenantId, async (tx) => {
      return tx.conversation.findFirst({
        where: { id: conversationId },
        select: {
          state: true,
          assignedStaffId: true,
          customer: {
            select: { id: true, phone: true, name: true },
          },
        },
      });
    });

    if (convDetails && convDetails.state !== "HUMAN_HANDOFF") {
      await withTenantContext(tenantId, async (tx) => {
        await tx.conversation.update({
          where: { id: conversationId },
          data: {
            state: "HUMAN_HANDOFF",
            status: "HUMAN_HANDOFF",
          },
        });
      });

      const handoffJob: HumanHandoffNotifyJob = {
        tenantId,
        conversationId,
        customerId: convDetails.customer.id,
        customerPhone: convDetails.customer.phone,
        customerName: convDetails.customer.name,
        assignedStaffId: convDetails.assignedStaffId,
      };

      await notificationsQueue.add("human-handoff-notify", handoffJob, {
        attempts: 3,
        backoff: { type: "exponential", delay: 2_000 },
      });

      log.info(
        { conversationId, assignedStaffId: convDetails.assignedStaffId },
        "Human handoff notification job enqueued",
      );
    }
  }

  const outboundJob: OutboundMessageJob = {
    tenantId,
    conversationId,
    messageId: savedMessage.id,
    phoneNumberId,
    toPhone: senderPhone,
    content: aiResponseText,
    messageType: "text",
  };

  await outboundQueue.add("send-whatsapp-message", outboundJob);

  log.info(
    { messageId: savedMessage.id, toPhone: senderPhone },
    "Outbound message queued",
  );
}
