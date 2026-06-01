export type AuditAction =
  | "CREATED"
  | "UPDATED"
  | "DELETED"
  | "LOGIN"
  | "LOGOUT"
  | "INVITED"
  | "PLAN_CHANGED"
  | "WHATSAPP_CONNECTED"
  | "DOCUMENT_UPLOADED";

export interface AuditLogUser {
  id: string;
  name: string;
  email: string;
}

export interface AuditLogItem {
  id: string;
  action: AuditAction;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string | null;
  user: AuditLogUser | null;
  createdAt: string;
}

export interface PaginatedAuditLogs {
  items: AuditLogItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  action?: AuditAction;
  userId?: string;
  from?: string;
  to?: string;
}
