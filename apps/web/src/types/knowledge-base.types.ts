// ─── Enums ────────────────────────────────────────────────────────────────────

export type DocumentStatus =
  | "UPLOADING"
  | "PROCESSING"
  | "EMBEDDING"
  | "READY"
  | "ARCHIVED"
  | "FAILED";

// ─── Core Model ───────────────────────────────────────────────────────────────

export interface KnowledgeBaseDocument {
  id: string;
  tenantId: string;
  title: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  storagePath: string;
  checksum: string;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ─── Query ────────────────────────────────────────────────────────────────────

export interface KnowledgeBaseQuery {
  page?: number;
  limit?: number;
  status?: DocumentStatus;
}

// ─── Response ─────────────────────────────────────────────────────────────────

export interface KnowledgeBaseListResponse {
  items: KnowledgeBaseDocument[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadDocumentDto {
  title: string;
  fileName: string;
  file: File;
}
