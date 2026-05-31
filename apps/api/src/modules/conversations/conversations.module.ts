import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConversationsController } from './conversations.controller.js';
import { ConversationsService } from './conversations.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'whatsapp-outbound' }),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
