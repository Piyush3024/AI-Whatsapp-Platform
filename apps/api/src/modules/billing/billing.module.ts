// apps/api/src/modules/billing/billing.module.ts

import { Module } from '@nestjs/common';
import { BillingService } from './billing.service.js';
import { EsewaService } from './esewa.service.js';
import { BillingController } from './billing.controller.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, EsewaService],
  exports: [BillingService, EsewaService],
})
export class BillingModule {}
