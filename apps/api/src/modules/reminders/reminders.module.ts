import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { QUEUE_NAMES } from '../../constants/queues.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { RemindersController } from './reminders.controller.js';
import { RemindersService } from './reminders.service.js';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.REMINDERS,
    }),
  ],
  controllers: [RemindersController],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
