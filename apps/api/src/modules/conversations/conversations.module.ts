import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConversationsController } from './conversations.controller.js';
import { ConversationsService } from './conversations.service.js';
import { ConversationsGateway } from './conversations.gateway.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { BillingModule } from '../billing/billing.module.js';
import { SocketSubscriberService } from './socket-subscriber.service.js';

@Module({
  imports: [
    PrismaModule,
    BillingModule,
    BullModule.registerQueue({ name: 'whatsapp-outbound' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    ConversationsGateway,
    SocketSubscriberService,
  ],
  exports: [ConversationsService, ConversationsGateway],
})
export class ConversationsModule {}
