import type { Job } from "bullmq";
import OpenAI from "openai";
import { createJobLogger } from "../../lib/logger.js";
import { withTenantContext } from "../../lib/prisma.js";
import { outboundQueue } from "../../lib/queues.js";
import { generateEmbedding } from "./embeddings.processor.js";
import { env } from "../../config/env.js";
import type {
  AiReplyJob,
  OutboundMessageJob,
} from "../../types/job-payloads.js";

// ============================================================
// AI REPLY PROCESSOR
//
// Steps:
// 1. Tenant ka active TenantAIPrompt fetch karo
// 2. Conversation history fetch karo (last 10 messages)
// 3. RAG — query embedding generate karo
// 4. pgvector cosine similarity search (top 5 chunks)
// 5. OpenAI gpt-4o-mini chat completion
// 6. AI response DB mein save karo (outbound message)
// 7. whatsapp-outbound queue mein push karo
//
// Model: gpt-4o-mini
// - Cost efficient for high-volume WhatsApp responses
// - Fast response time
// - Good instruction following
//
// RAG: cosine similarity (<=> operator)
// - Top 5 chunks — enough context without bloating prompt
// - tenantId filter — RLS + explicit filter for safety
// ============================================================

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const CHAT_MODEL = "gpt-4o-mini";
const MAX_TOKENS = 500; // WhatsApp message limit ke andar
const TEMPERATURE = 0.7; // Balanced creativity/consistency
const RAG_TOP_K = 5; // Top 5 similar chunks
const HISTORY_LIMIT = 10; // Last 10 messages for context
const MAX_RESPONSE_CHARS = 1500; // WhatsApp practical limit

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

  // ── Step 1: Active AI prompt fetch karo ──────────────────────────────
  const aiPrompt = await withTenantContext(tenantId, async (tx) => {
    return tx.tenantAIPrompt.findFirst({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { version: "desc" }, // Latest version
      select: {
        id: true,
        systemPrompt: true,
        persona: true,
      },
    });
  });

  if (!aiPrompt) {
    log.warn(
      { tenantId, conversationId },
      "No active AI prompt found for tenant — using default",
    );
  }

  // Default system prompt agar tenant ne set nahi kiya
  const systemPrompt =
    aiPrompt?.systemPrompt ??
    "You are a helpful WhatsApp business assistant. " +
      "Be concise, friendly, and professional. " +
      "Keep responses under 150 words suitable for WhatsApp.";

  // ── Step 2: Conversation history fetch karo ───────────────────────────
  const history = await withTenantContext(tenantId, async (tx) => {
    return tx.message.findMany({
      where: {
        conversationId,
        tenantId,
        deletedAt: null,
        // Current message exclude karo
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

  // Chronological order ke liye reverse karo
  const chronologicalHistory = history.reverse();

  log.debug(
    { conversationId, historyCount: chronologicalHistory.length },
    "Conversation history fetched",
  );

  // ── Step 3: RAG — Query embedding generate karo ───────────────────────
  let ragContext = "";

  try {
    const queryEmbedding = await generateEmbedding(inboundContent);

    // ── Step 4: pgvector cosine similarity search ─────────────────────
    // $queryRaw mandatory — Prisma vector operator (<=>)  support nahi karta
    // tenantId filter = RLS + explicit double safety
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
    // RAG fail hone pe bhi continue karo — bina context ke reply do
    log.error(
      { err, conversationId },
      "RAG search failed — continuing without context",
    );
  }

  // ── Step 5: OpenAI chat completion ───────────────────────────────────
  // Message array build karo
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  // System message — AI prompt + RAG context
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

  // Conversation history add karo
  for (const msg of chronologicalHistory) {
    if (!msg.content) continue;
    messages.push({
      role: msg.direction === "inbound" ? "user" : "assistant",
      content: msg.content,
    });
  }

  // Current user message
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

    // WhatsApp character limit enforce karo
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
    throw err; // BullMQ retry karega
  }

  // ── Step 6: AI response DB mein save karo ────────────────────────────
  const savedMessage = await withTenantContext(tenantId, async (tx) => {
    return tx.message.create({
      data: {
        tenantId,
        conversationId,
        messageType: "TEXT",
        direction: "outbound",
        content: aiResponseText,
        status: "QUEUED", // Abhi queue mein hai — sent nahi hua
        metadata: {
          aiGenerated: true,
          model: CHAT_MODEL,
          ragChunksUsed: ragContext ? RAG_TOP_K : 0,
          inReplyToMetaId: metaMessageId,
        },
      },
      select: { id: true },
    });
  });

  log.info(
    { messageId: savedMessage.id, conversationId },
    "AI response saved to DB",
  );

  // ── Step 7: whatsapp-outbound queue mein push karo ────────────────────
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
