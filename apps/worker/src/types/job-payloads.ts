import { ReminderRuleType } from "@whatsapp-ai/db/generated/prisma";

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
  id: string;
  from: string;
  timestamp: string;
} & (
  | WhatsAppTextMessage
  | WhatsAppInteractiveMessage
  | WhatsAppMediaMessage
  | { type: string; [key: string]: unknown }
);

export interface WhatsAppMessageStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
  }>;
}

export interface InboundMessageJob {
  phoneNumberId: string;
  wabaId: string;
  message: WhatsAppMessage;
  senderPhone: string;
  senderName?: string;
  timestamp: string;
  tenantId: string;
}
export interface AiReplyJob {
  tenantId: string;
  conversationId: string;
  customerId: string;
  messageId: string;
  metaMessageId: string;
  inboundContent: string;
  phoneNumberId: string;
  senderPhone: string;
}

export interface OutboundMessageJob {
  tenantId: string;
  conversationId: string;
  messageId: string;
  phoneNumberId: string;
  toPhone: string;
  content: string;
  messageType: "text" | "template";
  templateName?: string;
  templateParams?: string[];
}

export interface StatusUpdateJob {
  phoneNumberId: string;
  wabaId: string;
  status: WhatsAppMessageStatus;
  tenantId: string;
}

export interface ReminderMessageJob {
  tenantId: string;
  scheduledReminderId: string;
  bookingId: string;
  customerPhone: string;
  messageBody: string;
  ruleType: string;
}

export interface FollowUpJob {
  tenantId: string;
  bookingId: string;
  customerId: string;
  customerPhone: string;
  followUpType: "post_appointment" | "re_booking";
  messageBody: string;
}

export interface EmbeddingJob {
  tenantId: string;
  documentId: string;
  fileUrl: string;
  title: string;
}

export interface WhatsAppTestMessageJob {
  tenantId: string;
  whatsAppNumberId: string;
  phoneNumberId: string;
  recipientPhone: string;
  message: string;
}

export interface ReminderJobPayload {
  tenantId: string;
  bookingId: string;
  ruleType: ReminderRuleType;
}

export interface HumanHandoffNotifyJob {
  tenantId: string;
  conversationId: string;
  customerId: string;
  customerPhone: string;
  customerName: string | null;
  assignedStaffId: string | null;
}

export interface QualityScoreSyncJob {
  sweep: true;
}

export type RemindersQueuePayload = ReminderJobPayload | { sweep?: boolean };
