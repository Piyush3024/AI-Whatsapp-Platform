import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller.js';
import { WhatsAppWebhookService } from './whatsapp-webhook.service.js';
import { QUEUE_NAMES } from './whatsapp-webhook.service.js';

/**
 * WhatsAppModule
 *
 * Registers:
 * - WhatsAppWebhookController: GET/POST /whatsapp/webhook
 * - WhatsAppWebhookService: payload process karke queue mein push
 * - BullMQ queues: WHATSAPP_INBOUND aur ANALYTICS
 *
 * Note: BullMQModule.forFeature() sirf queue register karta hai —
 * connection AppModule mein globally configure hoga (next step).
 */
@Module({
  imports: [
    // WHATSAPP_INBOUND queue — inbound messages ke liye
    BullModule.registerQueue(
      { name: QUEUE_NAMES.WHATSAPP_INBOUND },
      { name: QUEUE_NAMES.ANALYTICS },
    ),
  ],
  controllers: [WhatsAppWebhookController],
  providers: [WhatsAppWebhookService],
  exports: [WhatsAppWebhookService],
})
export class WhatsAppModule {}
