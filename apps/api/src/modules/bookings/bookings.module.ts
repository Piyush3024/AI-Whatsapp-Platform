import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { RemindersModule } from '../reminders/reminders.module.js';

/**
 * Bookings module for managing bookings.
 */
@Module({
  imports: [PrismaModule, RemindersModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
