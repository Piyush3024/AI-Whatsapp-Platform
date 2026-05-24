// ============================================================
// JOB PAYLOAD TYPES
// These must match EXACTLY what apps/api enqueues into BullMQ
// Any field mismatch = runtime errors in processors
// ============================================================

// ----------------------------------------------------------
// WhatsApp Message Object (Meta API format)
// ----------------------------------------------------------
export interface WhatsAppTextMessage {
  type: "text";
  text: { body: string };
}

export interface WhatsAppInteractiveMessage {
  type: "interactive";
  interactive: {
    type: string;
    body?: { text: string };
    action?: Record<string, unknown>;
  };
}

export interface WhatsAppMediaMessage {
  type: "image" | "audio" | "video" | "document" | "sticker";
  [key: string]: unknown;
}

export type WhatsAppMessage = {
  id: string; // Meta message ID — idempotency key
  from: string; // sender phone E.164
  timestamp: string; // Unix timestamp string
} & (
  | WhatsAppTextMessage
  | WhatsAppInteractiveMessage
  | WhatsAppMediaMessage
  | { type: string; [key: string]: unknown }
);

// ----------------------------------------------------------
// WhatsApp Message Status (Meta API format)
// ----------------------------------------------------------
export interface WhatsAppMessageStatus {
  id: string; // Meta message ID
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
  }>;
}

// ----------------------------------------------------------
// Queue: whatsapp-inbound
// ----------------------------------------------------------
export interface InboundMessageJob {
  phoneNumberId: string; // Tumhara WhatsApp number ID (Meta)
  wabaId: string; // WhatsApp Business Account ID
  message: WhatsAppMessage;
  senderPhone: string; // E.164 format e.g. "+9779800000000"
  senderName?: string;
  timestamp: string;
  tenantId: string; // RLS ke liye mandatory
}

// ----------------------------------------------------------
// Queue: ai-reply
// ----------------------------------------------------------
export interface AiReplyJob {
  tenantId: string;
  conversationId: string;
  customerId: string;
  messageId: string; // DB message ID (our UUID)
  metaMessageId: string; // Meta message ID
  inboundContent: string; // Customer ka message text
  phoneNumberId: string;
  senderPhone: string;
}

// ----------------------------------------------------------
// Queue: whatsapp-outbound
// ----------------------------------------------------------
export interface OutboundMessageJob {
  tenantId: string;
  conversationId: string;
  messageId: string; // DB message ID — update status baad mein
  phoneNumberId: string;
  toPhone: string; // E.164 recipient
  content: string; // Message text to send
  messageType: "text" | "template";
  templateName?: string;
  templateParams?: string[];
}

// ----------------------------------------------------------
// Queue: analytics (status updates)
// ----------------------------------------------------------
export interface StatusUpdateJob {
  phoneNumberId: string;
  wabaId: string;
  status: WhatsAppMessageStatus;
  tenantId: string;
}

// ----------------------------------------------------------
// Queue: reminders
// ----------------------------------------------------------
export interface ReminderJob {
  tenantId: string;
  scheduledReminderId: string; // DB ID — idempotency key
  bookingId: string;
  customerPhone: string;
  messageBody: string;
  ruleType: string;
}

// ----------------------------------------------------------
// Queue: follow_ups
// ----------------------------------------------------------
export interface FollowUpJob {
  tenantId: string;
  bookingId: string;
  customerId: string;
  customerPhone: string;
  followUpType: "post_appointment" | "re_booking";
  messageBody: string;
}

// ----------------------------------------------------------
// Queue: embeddings
// ----------------------------------------------------------
export interface EmbeddingJob {
  tenantId: string;
  documentId: string; // KnowledgeBaseDocument ID
  fileUrl: string;
  title: string;
}

/**
 * WhatsApp Test Message Job
 *
 * Used for sending test messages to verify number configuration.
 * Does NOT create DB message record — just sends and returns result.
 */
export interface WhatsAppTestMessageJob {
  tenantId: string;
  whatsAppNumberId: string;
  phoneNumberId: string;
  recipientPhone: string;
  message: string;
}
