import { Module } from '@nestjs/common';
import { BillingService } from './billing.service.js';
import { EsewaService } from './esewa.service.js';
import { BillingController } from './billing.controller.js';
import { UsageLimitService } from './usage-limit.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, EsewaService, UsageLimitService],
  exports: [BillingService, EsewaService, UsageLimitService],
})
export class BillingModule {}
