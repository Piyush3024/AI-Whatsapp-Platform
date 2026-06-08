import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import type {
  WhatsAppWebhookPayload,
  WhatsAppMessage,
  WhatsAppMessageStatus,
} from './dto/webhook-payload.dto.js';

export const QUEUE_NAMES = {
  WHATSAPP_INBOUND: 'whatsapp-inbound',
  WHATSAPP_OUTBOUND: 'whatsapp-outbound',
  AI_REPLY: 'ai-reply',
  REMINDERS: 'reminders',
  EMBEDDINGS: 'embeddings',
  FOLLOW_UPS: 'follow_ups',
  ANALYTICS: 'analytics',
} as const;

export interface InboundMessageJob {
  phoneNumberId: string;
  wabaId: string;
  message: WhatsAppMessage;
  senderPhone: string;
  senderName?: string;
  timestamp: string;
}

export interface StatusUpdateJob {
  phoneNumberId: string;
  wabaId: string;
  status: WhatsAppMessageStatus;
}

@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.WHATSAPP_INBOUND)
    private readonly inboundQueue: Queue<InboundMessageJob>,

    @InjectQueue(QUEUE_NAMES.ANALYTICS)
    private readonly analyticsQueue: Queue<StatusUpdateJob>,
  ) {}

  async processWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const { value } = change;
        const phoneNumberId = value.metadata.phone_number_id;
        const wabaId = entry.id;

        if (value.messages && value.messages.length > 0) {
          for (const message of value.messages) {
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
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2_000,
              },
              removeOnComplete: {
                age: 24 * 3600,
                count: 1000,
              },
              removeOnFail: {
                age: 7 * 24 * 3600,
              },
            });

            this.logger.log(
              `Inbound message queued — from: ${message.from}, type: ${message.type}, msgId: ${message.id}`,
              'WhatsAppWebhookService',
            );
          }
        }

        if (value.statuses && value.statuses.length > 0) {
          for (const status of value.statuses) {
            const job: StatusUpdateJob = {
              phoneNumberId,
              wabaId,
              status,
            };

            await this.analyticsQueue.add('status-update', job, {
              attempts: 2,
              backoff: { type: 'exponential', delay: 1_000 },
              removeOnComplete: { age: 3600 },
              removeOnFail: { age: 24 * 3600 },
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
