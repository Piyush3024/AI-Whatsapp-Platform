import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

/**
 * Customers module for managing customer operations.
 *
 * Best Practices:
 * - PrismaModule for database access
 * - PassportModule for JWT strategy if needed
 * - Service exported for other modules (e.g., BookingModule)
 */
@Module({
  imports: [PrismaModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
