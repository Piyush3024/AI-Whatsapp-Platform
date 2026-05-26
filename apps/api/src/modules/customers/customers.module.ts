import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
