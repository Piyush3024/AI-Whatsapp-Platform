import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { BullModule } from '@nestjs/bullmq';
import { KnowledgeBaseService } from './knowledge-base.service.js';
import { KnowledgeBaseController } from './knowledge-base.controller.js';
import { R2Client } from '../../lib/r2-client.js';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'embeddings',
    }),
  ],
  providers: [KnowledgeBaseService, R2Client],
  controllers: [KnowledgeBaseController],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
