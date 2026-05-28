import { DocumentStatus } from '@whatsapp-ai/db/generated/prisma';

// Main Document Interface
export interface KnowledgeBaseDocument {
  id: string;
  tenantId: string;
  title: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string | null;
  storagePath: string;
  checksum: string;
  version: number;
  status: DocumentStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Interface with Relations
export interface KnowledgeBaseDocumentWithRelations extends KnowledgeBaseDocument {
  chunks: KnowledgeBaseChunk[];
}

// Chunk Interface
export interface KnowledgeBaseChunk {
  id: string;
  tenantId: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  embedding: unknown; // pgvector type (typed as `unknown` by Prisma)
  metadata: Record<string, unknown>;
  tokenCount: number | null;
  isActive: boolean;
  createdAt: Date;
}
