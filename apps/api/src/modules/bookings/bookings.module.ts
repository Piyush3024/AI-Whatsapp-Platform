import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { RemindersModule } from '../reminders/reminders.module.js';

/**
 * Bookings module for managing bookings.
 */
@Module({
  imports: [
    PrismaModule,
    RemindersModule,
    BullModule.registerQueue({ name: 'follow_ups' }),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
