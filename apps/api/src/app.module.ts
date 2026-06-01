import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { LoggerModule } from 'nestjs-pino';
import { IncomingMessage } from 'http';
import configuration from './config/configuration.js';
import { envValidationSchema } from './config/env.validation.js';
import { HealthController } from './health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ClsModule } from 'nestjs-cls';
import { JwtModule } from '@nestjs/jwt';
import { TenantMiddleware } from './common/middleware/tenant.middleware.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BullModule } from '@nestjs/bullmq';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module.js';
import { TenantModule } from './modules/tenant/tenant.module.js';
import { StaffModule } from './modules/staff/staff.module.js';
import { ServicesModule } from './modules/services/services.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { BookingsModule } from './modules/bookings/bookings.module.js';
import { WhatsAppNumberModule } from './modules/whatsapp-number/whatsapp-number.module.js';
import { RemindersModule } from './modules/reminders/reminders.module.js';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { MailModule } from './modules/mail/mail.module.js';
import { InvitationModule } from './modules/invitation/invitation.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { ConversationsModule } from './modules/conversations/conversations.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get<string>('app.nodeEnv') === 'development';
        return {
          pinoHttp: {
            level: isDev ? 'debug' : 'info',
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers["x-api-key"]',
                'req.body.password',
                'req.body.accessToken',
                'req.body.refreshToken',
              ],
              censor: '[Redacted]',
            },
            genReqId: (req: IncomingMessage) =>
              (req.headers['x-request-id'] as string) ?? crypto.randomUUID(),
            serializers: {
              req: (req: {
                method: string;
                url: string;
                id: string;
                headers: Record<string, string>;
              }) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                userAgent: req.headers['user-agent'],
              }),
              res: (res: { statusCode: number }) => ({
                statusCode: res.statusCode,
              }),
            },
            ...(isDev && {
              transport: {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:HH:MM:ss.l',
                  ignore: 'pid,hostname',
                },
              },
            }),
          },
        };
      },
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('throttle.ttlMs')!,
            limit: config.get<number>('throttle.limit')!,
          },
          {
            name: 'strict',
            ttl: 60_000,
            limit: 10,
          },
        ],
        storage: new ThrottlerStorageRedisService(
          config.get<string>('redis.url'),
        ),
      }),
    }),
    PrismaModule,
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: () => crypto.randomUUID(),
      },
    }),

    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
    AuthModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(
          config.get<string>('redis.url') ?? 'redis://localhost:6379',
        );
        return {
          connection: {
            host: redisUrl.hostname,
            port: parseInt(redisUrl.port ?? '6379', 10),
            ...(redisUrl.password && { password: redisUrl.password }),
          },
        };
      },
    }),
    WhatsAppModule,
    TenantModule,
    StaffModule,
    ServicesModule,
    CustomersModule,
    BookingsModule,
    WhatsAppNumberModule,
    RemindersModule,
    MailModule,
    KnowledgeBaseModule,
    BillingModule,
    InvitationModule,
    AnalyticsModule,
    ConversationsModule,
    NotificationsModule,
  ],

  controllers: [HealthController],

  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
