// ============================================================
// Queue Names (Must match worker/src/constants/queues.ts)
// ============================================================
export const QUEUE_NAMES = {
  WHATSAPP_INBOUND: 'whatsapp-inbound',
  WHATSAPP_OUTBOUND: 'whatsapp-outbound',
  AI_REPLY: 'ai-reply',
  REMINDERS: 'reminders',
  EMBEDDINGS: 'embeddings', // Used for Knowledge Base embeddings
  FOLLOW_UPS: 'follow_ups',
  ANALYTICS: 'analytics',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
