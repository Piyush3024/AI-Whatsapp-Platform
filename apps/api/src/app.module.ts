import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { LoggerModule } from 'nestjs-pino';
import { IncomingMessage } from 'http';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { HealthController } from './health.controller';

/**
 * Root application module.
 *
 * Responsibility: wire up ONLY global infrastructure concerns.
 * Business modules (auth, whatsapp, ai, billing…) are imported here
 * as they are built in later phases.
 *
 * Global infrastructure registered here:
 *  1. ConfigModule  — env loading, Joi validation, typed config factory
 *  2. LoggerModule  — Pino structured logging (JSON prod / pretty dev)
 *  3. ThrottlerModule — Redis-backed rate limiting (works across all pods)
 *  4. ThrottlerGuard  — applied globally via APP_GUARD
 *  5. HealthController — /health endpoint for orchestration probes
 */
@Module({
  imports: [
    // ── 1. Config ────────────────────────────────────────────────────────────
    // isGlobal: true  → no need to import ConfigModule in every feature module.
    // cache: true     → process.env reads are cached after first access (perf).
    // validationSchema → Joi validates every env var at startup; app won't boot
    //                    if a required var is missing or has wrong type/format.
    // load            → typed config factory; access via ConfigService.get<T>('key').
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        // 'strip' removes unknown keys from process.env (keeps it clean).
        // 'abortEarly: false' collects ALL validation errors in one shot.
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // ── 2. Logger (nestjs-pino) ───────────────────────────────────────────────
    // forRootAsync lets us read NODE_ENV from ConfigService at startup.
    //
    // Production  → raw JSON to stdout (ingested by Datadog / CloudWatch / ELK).
    // Development → pino-pretty: human-readable, colourised, single-line.
    //
    // autoLogging: true  → every HTTP request/response is logged automatically
    //                       with method, url, statusCode, responseTime, reqId.
    // redact         → strips secrets from log output (never log auth headers).
    // genReqId       → uses x-request-id header if present, otherwise uuid v4.
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get<string>('app.nodeEnv') === 'development';
        return {
          pinoHttp: {
            level: isDev ? 'debug' : 'info',
            // Redact sensitive fields — they will appear as [Redacted] in logs.
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
            // Attach a unique request ID to every log within that request's scope.
            genReqId: (req: IncomingMessage) =>
              (req.headers['x-request-id'] as string) ?? crypto.randomUUID(),
            // Serializers shape what ends up in the log object.
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
                // Never log full headers in prod — too verbose & risky.
                userAgent: req.headers['user-agent'],
              }),
              res: (res: { statusCode: number }) => ({
                statusCode: res.statusCode,
              }),
            },
            // Development: pretty-print with colours and timestamps.
            // Production: no transport = raw JSON to stdout (fastest).
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

    // ── 3. Rate Limiting (Redis-backed) ───────────────────────────────────────
    // CRITICAL: The default in-memory store is PER-PROCESS.
    // In a multi-pod / Docker setup, each pod has its own counter —
    // a client can bypass limits by rotating across pods.
    // Redis store shares counters across ALL instances.
    //
    // Two throttle tiers:
    //  'default' — 120 req/min  for normal API usage.
    //  'strict'  — 10 req/min   applied via @Throttle({ strict: ... })
    //              on sensitive endpoints (login, register, webhook verify).
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
            ttl: 60_000, // 1 minute
            limit: 10, // 10 req/min — for auth / sensitive routes
          },
        ],
        storage: new ThrottlerStorageRedisService(
          config.get<string>('redis.url')!,
        ),
      }),
    }),
  ],

  controllers: [
    // /health — excluded from /api prefix in main.ts for orchestration probes.
    HealthController,
  ],

  providers: [
    // ── 4. Global Throttler Guard ─────────────────────────────────────────────
    // Registering via APP_GUARD means EVERY endpoint is rate-limited by default.
    // Use @SkipThrottle() on controllers/routes that should be exempt.
    // Use @Throttle({ strict: { ... } }) to override per-route.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
