import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller.js';
import { WhatsAppWebhookService } from './whatsapp-webhook.service.js';
import { QUEUE_NAMES } from './whatsapp-webhook.service.js';

@Module({
  imports: [
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
