import { Module } from '@nestjs/common';
import { WhatsAppNumberController } from './whatsapp-number.controller.js';
import { WhatsAppNumberService } from './whatsapp-number.service.js';
import { BullModule } from '@nestjs/bullmq';

/**
 * WhatsAppNumberModule
 *
 * Manages WhatsApp Business numbers for tenants.
 *
 * Features:
 * - CRUD operations with E.164 phone validation
 * - Test message functionality via BullMQ
 * - Location-based assignment
 *
 * Note: BullModule is globally registered in AppModule.
 * PrismaModule is globally registered in AppModule.
 */
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
