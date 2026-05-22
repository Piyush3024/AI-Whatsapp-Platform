import type { Job } from "bullmq";
import { createJobLogger } from "../lib/logger.js";
import { withTenantContext } from "../lib/prisma.js";
// import { withTenantContext, prisma } from '../../lib/prisma.js';
import { env } from "../config/env.js";
import type { EmbeddingJob } from "../types/job-payloads.js";
import OpenAI from "openai";

// ============================================================
// EMBEDDINGS PROCESSOR
//
// Steps:
// 1. Document fetch karo DB se
// 2. fileUrl se text content fetch karo
// 3. Text ko chunks mein split karo
// 4. Har chunk ke liye OpenAI embedding generate karo
// 5. pgvector mein store karo ($executeRaw — Prisma vector support nahi)
// 6. Document status ACTIVE update karo
//
// Idempotency:
// documentId + chunkIndex = unique — duplicate chunks skip honge
// Document status check — already ACTIVE toh skip
//
// Embedding model: text-embedding-3-small
// - 1536 dimensions (matches vector(1536) column)
// - 5x cheaper than ada-002
// - Better multilingual performance
// ============================================================

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// Chunk settings — production tested values
const CHUNK_SIZE = 500; // tokens approximate (~400 words)
const CHUNK_OVERLAP = 50; // overlap for context continuity
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_BATCH_SIZE = 20; // OpenAI batch limit per request

export async function processEmbedding(job: Job<EmbeddingJob>): Promise<void> {
  const { tenantId, documentId, fileUrl, title } = job.data;

  const log = createJobLogger("embeddings", job.id, tenantId);

  log.info({ documentId, title }, "Processing embedding job");

  // ── Step 1: Document status check ────────────────────────────────────
  const document = await withTenantContext(tenantId, async (tx) => {
    return tx.knowledgeBaseDocument.findFirst({
      where: { id: documentId, deletedAt: null },
      select: { id: true, status: true, title: true },
    });
  });

  if (!document) {
    throw new Error(`Document not found: ${documentId}`);
  }

  if (document.status === "ACTIVE") {
    log.warn({ documentId }, "Document already processed — skipping");
    return;
  }

  if (document.status === "ARCHIVED") {
    log.warn({ documentId }, "Document is archived — skipping");
    return;
  }

  // ── Step 2: Text content fetch karo ──────────────────────────────────
  // fileUrl se text fetch karo — plain text files support karta hai Phase 2 mein
  // Phase 3 mein PDF parsing add karenge
  let rawText: string;

  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch file: ${response.status} ${response.statusText}`,
      );
    }
    rawText = await response.text();
  } catch (err) {
    // Document FAILED mark karo
    await withTenantContext(tenantId, async (tx) => {
      await tx.knowledgeBaseDocument.update({
        where: { id: documentId },
        data: { status: "FAILED" },
      });
    });
    log.error({ err, documentId, fileUrl }, "Failed to fetch document content");
    throw err;
  }

  log.info(
    { documentId, textLength: rawText.length },
    "Document content fetched",
  );

  // ── Step 3: Text chunking ─────────────────────────────────────────────
  const chunks = chunkText(rawText, CHUNK_SIZE, CHUNK_OVERLAP);

  log.info({ documentId, chunkCount: chunks.length }, "Text chunked");

  if (chunks.length === 0) {
    log.warn({ documentId }, "No chunks generated — empty document?");
    await withTenantContext(tenantId, async (tx) => {
      await tx.knowledgeBaseDocument.update({
        where: { id: documentId },
        data: { status: "FAILED" },
      });
    });
    return;
  }

  // ── Step 4: Existing chunks delete karo (re-processing case) ─────────
  // Raw SQL — RLS set_config pehle se transaction mein hai
  await withTenantContext(tenantId, async (tx) => {
    await tx.$executeRaw`
      DELETE FROM knowledge_base_chunks
      WHERE "documentId" = ${documentId}::uuid
      AND "tenantId" = ${tenantId}::uuid
    `;
  });

  // ── Step 5: Embeddings generate + store karo (batch mein) ────────────
  // Batch processing — OpenAI rate limits ke saath compatible
  let processedChunks = 0;

  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);

    log.debug(
      { documentId, batchStart: i, batchSize: batch.length },
      "Processing embedding batch",
    );

    // OpenAI embeddings — batch request
    let embeddings: number[][];
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch.map((c) => c.text),
        dimensions: 1536, // Explicit — must match vector(1536) column
      });

      embeddings = response.data.map((d) => d.embedding);
    } catch (err) {
      log.error(
        { err, documentId, batchStart: i },
        "OpenAI embedding API failed",
      );
      throw err; // BullMQ retry karega
    }

    // pgvector mein store karo — $executeRaw mandatory (Prisma vector support nahi)
    // RLS context withTenantContext se set hoga
    await withTenantContext(tenantId, async (tx) => {
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j]!;
        const embedding = embeddings[j]!;
        const chunkIndex = i + j;

        // Vector ko PostgreSQL format mein convert karo: [0.1, 0.2, ...]
        const vectorStr = `[${embedding.join(",")}]`;

        await tx.$executeRaw`
          INSERT INTO knowledge_base_chunks (
            id,
            "tenantId",
            "documentId",
            content,
            "chunkIndex",
            embedding,
            "isActive",
            "createdAt",
            "updatedAt"
          ) VALUES (
            gen_random_uuid(),
            ${tenantId}::uuid,
            ${documentId}::uuid,
            ${chunk.text},
            ${chunkIndex},
            ${vectorStr}::vector,
            true,
            NOW(),
            NOW()
          )
          ON CONFLICT DO NOTHING
        `;
      }
    });

    processedChunks += batch.length;

    log.info(
      { documentId, processedChunks, totalChunks: chunks.length },
      "Embedding batch stored",
    );
  }

  // ── Step 6: Document ACTIVE mark karo ────────────────────────────────
  await withTenantContext(tenantId, async (tx) => {
    await tx.knowledgeBaseDocument.update({
      where: { id: documentId },
      data: { status: "ACTIVE" },
    });
  });

  log.info(
    { documentId, totalChunks: processedChunks },
    "Document embedding complete — status set to ACTIVE",
  );
}

// ============================================================
// HELPER: Text chunking
// Simple word-boundary chunking with overlap
// Phase 3 mein: proper tokenizer (tiktoken) add karenge
// ============================================================

interface TextChunk {
  text: string;
  index: number;
}

function chunkText(
  text: string,
  chunkSize: number,
  overlap: number,
): TextChunk[] {
  // Normalize whitespace
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) return [];

  // Word-based splitting
  const words = normalized.split(" ");
  const chunks: TextChunk[] = [];
  let index = 0;
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunkWords = words.slice(start, end);
    const chunkText = chunkWords.join(" ").trim();

    if (chunkText) {
      chunks.push({ text: chunkText, index: index++ });
    }

    // Overlap — step back by overlap amount
    start = end - overlap;

    // Prevent infinite loop
    if (start >= end) break;
  }

  return chunks;
}

// ============================================================
// EXPORT: Embedding generation utility
// ai-reply processor mein bhi use hoga query embedding ke liye
// ============================================================

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: 1536,
  });

  return response.data[0]!.embedding;
}
