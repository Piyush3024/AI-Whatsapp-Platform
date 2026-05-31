import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service.js';
import { TenantController } from './tenant.controller.js';
import { BillingModule } from '../billing/billing.module.js';

@Module({
  imports: [BillingModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
