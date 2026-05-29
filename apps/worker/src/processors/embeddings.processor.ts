import type { Job } from "bullmq";
import { createJobLogger } from "../lib/logger.js";
import { withTenantContext } from "../lib/prisma.js";

import { env } from "../config/env.js";
import type { EmbeddingJob } from "../types/job-payloads.js";
import OpenAI from "openai";
import SmartParser from "pdf-parse-new/lib/SmartPDFParser";
import mammoth from "mammoth";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const smartParser = new SmartParser();

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_BATCH_SIZE = 20;

export async function processEmbedding(job: Job<EmbeddingJob>): Promise<void> {
  const { tenantId, documentId, fileUrl, title } = job.data;

  const log = createJobLogger("embeddings", job.id, tenantId);

  log.info({ documentId, title }, "Processing embedding job");

  const document = await withTenantContext(tenantId, async (tx) => {
    return tx.knowledgeBaseDocument.findFirst({
      where: { id: documentId, deletedAt: null },
      select: { id: true, status: true, title: true, fileType: true },
    });
  });

  if (!document) {
    throw new Error(`Document not found: ${documentId}`);
  }

  if (document.status === "READY") {
    log.warn({ documentId }, "Document already processed — skipping");
    return;
  }

  if (document.status === "ARCHIVED") {
    log.warn({ documentId }, "Document is archived — skipping");
    return;
  }

  let rawText: string;

  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch file: ${response.status} ${response.statusText}`,
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (document.fileType === "application/pdf") {
      const pdfData = await smartParser.parse(buffer);
      rawText = pdfData.text;
    } else if (
      document.fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const docxResult = await mammoth.extractRawText({ buffer });
      rawText = docxResult.value;
    } else if (document.fileType === "text/plain") {
      rawText = buffer.toString("utf-8");
    } else {
      throw new Error(`Unsupported file type: ${document.fileType}`);
    }
  } catch (err) {
    await withTenantContext(tenantId, async (tx) => {
      await tx.knowledgeBaseDocument.update({
        where: { id: documentId },
        data: { status: "FAILED" },
      });
    });
    log.error(
      { err, documentId, fileUrl },
      "Failed to fetch or parse document content",
    );
    throw err;
  }

  log.info(
    { documentId, textLength: rawText.length },
    "Document content fetched",
  );

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

  await withTenantContext(tenantId, async (tx) => {
    await tx.$executeRaw`
      DELETE FROM knowledge_base_chunks
      WHERE "documentId" = ${documentId}::uuid
      AND "tenantId" = ${tenantId}::uuid
    `;
  });

  let processedChunks = 0;

  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);

    log.debug(
      { documentId, batchStart: i, batchSize: batch.length },
      "Processing embedding batch",
    );

    let embeddings: number[][];
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch.map((c) => c.text),
        dimensions: 1536,
      });

      embeddings = response.data.map((d) => d.embedding);
    } catch (err) {
      log.error(
        { err, documentId, batchStart: i },
        "OpenAI embedding API failed",
      );
      throw err;
    }

    await withTenantContext(tenantId, async (tx) => {
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j]!;
        const embedding = embeddings[j]!;
        const chunkIndex = i + j;

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

  await withTenantContext(tenantId, async (tx) => {
    await tx.knowledgeBaseDocument.update({
      where: { id: documentId },
      data: { status: "READY" },
    });
  });

  log.info(
    { documentId, totalChunks: processedChunks },
    "Document embedding complete — status set to READY",
  );
}

interface TextChunk {
  text: string;
  index: number;
}

function chunkText(
  text: string,
  chunkSize: number,
  overlap: number,
): TextChunk[] {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) return [];

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

    start = end - overlap;

    if (start >= end) break;
  }

  return chunks;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: 1536,
  });

  return response.data[0]!.embedding;
}
