import { Module } from '@nestjs/common';
import { WhatsAppNumberController } from './whatsapp-number.controller.js';
import { WhatsAppNumberService } from './whatsapp-number.service.js';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'whatsapp-outbound',
    }),
  ],
  controllers: [WhatsAppNumberController],
  providers: [WhatsAppNumberService],
  exports: [WhatsAppNumberService],
})
export class WhatsAppNumberModule {}
