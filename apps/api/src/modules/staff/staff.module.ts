import { Module } from '@nestjs/common';
import { StaffService } from './staff.service.js';
import { StaffController } from './staff.controller.js';
import { BillingModule } from '../billing/billing.module.js';

@Module({
  imports: [BillingModule],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
