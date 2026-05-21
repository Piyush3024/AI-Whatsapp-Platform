import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * PrismaModule
 *
 * @Global() means this module is registered once in AppModule and
 * PrismaService is available for injection across the entire application
 * without needing to import PrismaModule in every feature module.
 *
 * This follows the same pattern as ConfigModule.forRoot({ isGlobal: true }).
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
