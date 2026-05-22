import { Logger } from 'nestjs-pino';
import { NestFactory } from '@nestjs/core';
import { VersioningType, ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

/**
 * Bootstraps the NestJS application with Fastify adapter.
 *
 * Configuration summary:
 * - Fastify adapter (2× throughput vs Express)
 * - Pino structured logging (JSON in prod, pretty in dev)
 * - @fastify/helmet for secure HTTP headers
 * - @fastify/compress for gzip/deflate response compression
 * - Global /api prefix + URI versioning (/api/v1/...)
 * - Strict ValidationPipe (whitelist, forbidNonWhitelisted, transform)
 * - Swagger UI only in non-production environments
 * - Graceful shutdown hooks for Prisma + BullMQ cleanup
 * - Unhandled rejection / uncaught exception safety net
 */
async function bootstrap(): Promise<void> {
  // ─── Fastify Adapter ──────────────────────────────────────────────────────
  // keepAliveTimeout: slightly above AWS ALB's 60s to avoid race conditions.
  // connectionTimeout: drop idle connections quickly.
  // bodyLimit: 10 MB — protects against oversized payload attacks.
  // logger: false — we hand logging off entirely to nestjs-pino below.
  const adapter = new FastifyAdapter({
    logger: false,
    keepAliveTimeout: 65_000,
    connectionTimeout: 10_000,
    bodyLimit: 10 * 1024 * 1024, // 10 MB
  });

  // ─── App Creation ─────────────────────────────────────────────────────────
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    {
      // Disable NestJS built-in logger; nestjs-pino takes over after init.
      bufferLogs: true,
      rawBody: true,
    },
  );

  // ─── Pino Logger ──────────────────────────────────────────────────────────
  // nestjs-pino integrates with Fastify's native pino instance.
  // bufferLogs: true above ensures no logs are lost during startup.
  app.useLogger(app.get(Logger));

  // ─── Security — @fastify/helmet ───────────────────────────────────────────
  // Must be registered BEFORE Swagger so the CSP can whitelist Swagger assets.
  // We conditionally relax CSP directives in non-prod to allow Swagger UI JS/CSS.
  const isProduction = process.env.NODE_ENV === 'production';

  await app.register(fastifyHelmet, {
    // Content-Security-Policy: tighten in prod, relax for Swagger in dev/staging.
    contentSecurityPolicy: isProduction
      ? true // Use helmet's strict defaults in production
      : {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"], // Swagger UI inline styles
            imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Swagger UI JS bundles
          },
        },
    // Cross-Origin policies
    crossOriginEmbedderPolicy: false, // Required for Swagger UI to load external fonts
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  // ─── Compression — @fastify/compress ─────────────────────────────────────
  // Brotli is too CPU-expensive for API payloads; gzip is the right tradeoff.
  // In large-scale prod, delegate this to your reverse proxy (Nginx/Cloudflare).
  await app.register(fastifyCompress, {
    encodings: ['gzip', 'deflate'],
    // Only compress responses above 1 KB — tiny payloads waste CPU.
    threshold: 1024,
  });

  // ─── CORS ─────────────────────────────────────────────────────────────────
  // Origin is env-driven — never hardcoded. Comma-separated list supported.
  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: isProduction ? allowedOrigins : true, // Allow all origins in dev
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
    exposedHeaders: ['x-request-id'],
    credentials: true,
    maxAge: 86_400, // Cache preflight for 24h
  });

  // ─── Global Prefix + URI Versioning ───────────────────────────────────────
  // Result: /api/v1/auth/login, /api/v1/whatsapp/webhook, etc.
  // 'health' is excluded so /health works for Kubernetes liveness probes.
  app.setGlobalPrefix('api', {
    exclude: ['health', '/health'],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ─── Global Validation Pipe ───────────────────────────────────────────────
  // whitelist: strips unknown properties before they reach controllers.
  // forbidNonWhitelisted: rejects the request outright (don't silently strip).
  // transform: auto-casts plain objects into typed DTO class instances.
  // transformOptions.enableImplicitConversion: lets @Type() work without explicit
  //   decorators on every primitive (e.g. number query params auto-cast).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Swagger (non-production only) ────────────────────────────────────────
  // Never expose API docs in production — it's a security risk and a scraping
  // surface. Use a VPN-gated staging environment for docs access.
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('WhatsApp AI Platform API')
      .setDescription(
        'Multi-tenant WhatsApp AI Business Automation SaaS — API Reference',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
        'access-token', // Security scheme name — referenced on controllers
      )
      .addTag('auth', 'Authentication & token management')
      .addTag('tenants', 'Tenant management')
      .addTag('whatsapp', 'WhatsApp webhook & messaging')
      .addTag('ai', 'AI conversation engine')
      .addTag('bookings', 'Booking management')
      .addTag('billing', 'Subscriptions & invoices')
      .addTag('analytics', 'Usage analytics')
      .addServer(`http://localhost:${process.env.PORT ?? 3001}`, 'Local Dev')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true, // JWT survives page refresh in Swagger UI
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  // ─── Graceful Shutdown ────────────────────────────────────────────────────
  // Allows Prisma connections and BullMQ workers to drain before the process
  // exits. Critical for zero-downtime deployments in Kubernetes / Docker.
  app.enableShutdownHooks();

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // ─── Start Listening ──────────────────────────────────────────────────────
  // '0.0.0.0' is required for Docker — '127.0.0.1' would be unreachable from host.
  const port = parseInt(process.env.PORT ?? '3001', 10);
  const host = '0.0.0.0';

  await app.listen(port, host);

  // Use app.get(Logger) — Pino is initialized at this point.
  const logger = app.get(Logger);
  logger.log(`API running on http://localhost:${port}/api/v1`, 'Bootstrap');

  if (!isProduction) {
    logger.log(
      `Swagger docs at http://localhost:${port}/api/docs`,
      'Bootstrap',
    );
  }
}

// ─── Unhandled Rejection Safety Net ────────────────────────────────────────
// These handlers catch anything that escapes NestJS exception filters.
// We log and exit — let the process manager (Docker/K8s) restart us cleanly.
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[FATAL] Unhandled promise rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  console.error('[FATAL] Uncaught exception:', error);
  process.exit(1);
});

bootstrap();
