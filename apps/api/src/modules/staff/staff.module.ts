import { Module } from '@nestjs/common';
import { StaffService } from './staff.service.js';
import { StaffController } from './staff.controller.js';

/**
 * StaffModule — Staff management, scheduling, overrides.
 * PrismaModule globally registered hai — import nahi karna.
 */
@Module({
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService], // BookingModule use karega
})
export class StaffModule {}
