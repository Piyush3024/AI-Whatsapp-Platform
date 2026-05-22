import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import type {
  WhatsAppWebhookPayload,
  WhatsAppMessage,
  WhatsAppMessageStatus,
} from './dto/webhook-payload.dto.js';

/**
 * Queue names — worker ke saath exactly match karna chahiye.
 * Ek jagah define karo, dono jagah import karo.
 */
export const QUEUE_NAMES = {
  WHATSAPP_INBOUND: 'whatsapp-inbound',
  WHATSAPP_OUTBOUND: 'whatsapp-outbound',
  AI_REPLY: 'ai-reply',
  REMINDERS: 'reminders',
  EMBEDDINGS: 'embeddings',
  FOLLOW_UPS: 'follow_ups',
  ANALYTICS: 'analytics',
} as const;

/**
 * Inbound message job ka shape — worker yahi expect karta hai.
 */
export interface InboundMessageJob {
  phoneNumberId: string; // Tumhara WhatsApp number ID
  wabaId: string; // WhatsApp Business Account ID
  message: WhatsAppMessage;
  senderPhone: string; // E.164 format
  senderName?: string;
  timestamp: string;
}

/**
 * Status update job ka shape.
 */
export interface StatusUpdateJob {
  phoneNumberId: string;
  wabaId: string;
  status: WhatsAppMessageStatus;
}

/**
 * WhatsAppWebhookService
 *
 * Webhook payload ko process karta hai:
 * 1. Entry aur changes iterate karta hai
 * 2. Messages ko WHATSAPP_INBOUND queue mein push karta hai
 * 3. Status updates ko ANALYTICS queue mein push karta hai
 *
 * ⚠️  Yahan koi heavy processing nahi hoti — sirf queue mein push.
 * Heavy work worker mein hogi (Phase 4+).
 *
 * Kyun queue?
 * - Meta 5 seconds mein 200 expect karta hai
 * - AI reply, DB operations sab async hain
 * - Queue retry logic built-in hai — crash hone pe message lost nahi hoga
 */
@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.WHATSAPP_INBOUND)
    private readonly inboundQueue: Queue<InboundMessageJob>,

    @InjectQueue(QUEUE_NAMES.ANALYTICS)
    private readonly analyticsQueue: Queue<StatusUpdateJob>,
  ) {}

  /**
   * Webhook payload process karta hai.
   * Har message ke liye ek job queue mein jaata hai.
   */
  async processWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        // Sirf 'messages' field handle karte hain
        if (change.field !== 'messages') continue;

        const { value } = change;
        const phoneNumberId = value.metadata.phone_number_id;
        const wabaId = entry.id;

        // ── Inbound messages ────────────────────────────────────────────
        if (value.messages && value.messages.length > 0) {
          for (const message of value.messages) {
            // Sender ka naam contacts se nikalo agar available ho
            const senderName = value.contacts?.find(
              (c) => c.wa_id === message.from,
            )?.profile.name;

            const job: InboundMessageJob = {
              phoneNumberId,
              wabaId,
              message,
              senderPhone: message.from,
              senderName,
              timestamp: message.timestamp,
            };

            await this.inboundQueue.add('process-inbound', job, {
              // BullMQ job options — production grade
              attempts: 3, // 3 baar try karo failure pe
              backoff: {
                type: 'exponential',
                delay: 2_000, // 2s, 4s, 8s
              },
              removeOnComplete: {
                age: 24 * 3600, // 24 hours baad completed jobs remove
                count: 1000, // Max 1000 completed jobs rakho
              },
              removeOnFail: {
                age: 7 * 24 * 3600, // Failed jobs 7 days rakho (debugging)
              },
            });

            this.logger.log(
              `Inbound message queued — from: ${message.from}, type: ${message.type}, msgId: ${message.id}`,
              'WhatsAppWebhookService',
            );
          }
        }

        // ── Status updates ──────────────────────────────────────────────
        if (value.statuses && value.statuses.length > 0) {
          for (const status of value.statuses) {
            const job: StatusUpdateJob = {
              phoneNumberId,
              wabaId,
              status,
            };

            await this.analyticsQueue.add('message-status-update', job, {
              attempts: 2,
              backoff: { type: 'exponential', delay: 1_000 },
              removeOnComplete: { age: 3600 }, // 1 hour
              removeOnFail: { age: 24 * 3600 }, // 24 hours
            });

            this.logger.debug(
              `Status update queued — msgId: ${status.id}, status: ${status.status}`,
              'WhatsAppWebhookService',
            );
          }
        }
      }
    }
  }
}
