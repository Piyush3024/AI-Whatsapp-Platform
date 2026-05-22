// CRITICAL: These must match EXACTLY with apps/api queue names
// Any mismatch = worker will never pick up jobs
// No colons allowed in BullMQ queue names

export const QUEUE_NAMES = {
  WHATSAPP_INBOUND: "whatsapp-inbound",
  WHATSAPP_OUTBOUND: "whatsapp-outbound",
  AI_REPLY: "ai-reply",
  REMINDERS: "reminders",
  EMBEDDINGS: "embeddings",
  FOLLOW_UPS: "follow_ups",
  ANALYTICS: "analytics",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
