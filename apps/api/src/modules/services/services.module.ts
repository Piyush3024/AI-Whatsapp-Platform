import { Module } from '@nestjs/common';
import { ServicesService } from './services.service.js';
import { ServicesController } from './services.controller.js';

/**
 * ServicesModule — Business services management.
 * PrismaModule globally registered hai — import nahi karna.
 * ServicesService export kiya — BookingModule use karega.
 */
@Module({
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
