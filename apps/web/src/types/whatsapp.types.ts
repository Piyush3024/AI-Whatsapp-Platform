// ─── Enums ────────────────────────────────────────────────────────────────────

export type WhatsAppVerificationStatus =
  | "PENDING"
  | "VERIFIED"
  | "NOT_VERIFIED"
  | "FLAGGED";

// ─── Core Model ───────────────────────────────────────────────────────────────

export interface WhatsAppNumber {
  id: string;
  tenantId: string;
  locationId: string | null;
  phoneNumber: string;
  phoneNumberId: string | null;
  displayName: string;
  greetingMessage: string | null;
  autoReplyEnabled: boolean;
  isDefault: boolean;
  isActive: boolean;
  verificationStatus: WhatsAppVerificationStatus;
  qualityScore: number | null;
  createdAt: string;
  updatedAt: string;
  location?: { id: string; name: string; address?: string } | null;
  _count?: { conversations: number };
}

// ─── Query ────────────────────────────────────────────────────────────────────

export interface WhatsAppQuery {
  limit?: number;
  offset?: number;
  locationId?: string;
  isActive?: boolean;
  verificationStatus?: WhatsAppVerificationStatus;
}

// ─── Response ─────────────────────────────────────────────────────────────────

export interface WhatsAppListResponse {
  data: WhatsAppNumber[];
  total: number;
  limit: number;
  offset: number;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateWhatsAppNumberDto {
  phoneNumber: string;
  displayName: string;
  locationId?: string;
  phoneNumberId?: string;
  isDefault?: boolean;
  greetingMessage?: string;
  autoReplyEnabled?: boolean;
}

export interface UpdateWhatsAppNumberDto {
  displayName?: string;
  locationId?: string;
  isActive?: boolean;
  autoReplyEnabled?: boolean;
  greetingMessage?: string;
}

export interface SendTestMessageDto {
  recipientPhone: string;
  message: string;
}
