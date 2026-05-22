import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service.js';
import { TenantController } from './tenant.controller.js';

/**
 * TenantModule
 *
 * Tenant management — settings, members, locations, business hours.
 * PrismaModule globally registered hai — yahan import nahi karna.
 */
@Module({
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
