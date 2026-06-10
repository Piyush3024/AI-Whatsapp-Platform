import { Logger } from 'nestjs-pino';
import { NestFactory } from '@nestjs/core';
import { VersioningType, ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import fastifyMultipart from '@fastify/multipart';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

async function bootstrap(): Promise<void> {
  const adapter = new FastifyAdapter({
    logger: false,
    keepAliveTimeout: 65_000,
    connectionTimeout: 10_000,
    bodyLimit: 10 * 1024 * 1024,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    {
      bufferLogs: true,
      rawBody: true,
    },
  );

  app.useLogger(app.get(Logger));
  const isProduction = process.env.NODE_ENV === 'production';

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: isProduction
      ? true
      : {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
            scriptSrc: ["'self'", "'unsafe-inline'"],
          },
        },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  await app.register(fastifyCompress, {
    encodings: ['gzip', 'deflate'],
    threshold: 1024,
  });
  await app.register(fastifyMultipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 1_000_000,
      fields: 10,
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
    },
  });

  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET ?? 'fallback-secret-change-in-production',
  });

  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: isProduction ? allowedOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
    exposedHeaders: ['x-request-id'],
    credentials: true,
    maxAge: 86_400,
  });
  app.setGlobalPrefix('api', {
    exclude: ['health', '/health'],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

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
        'access-token',
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
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  app.enableShutdownHooks();

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = parseInt(process.env.PORT ?? '3001', 10);
  const host = '0.0.0.0';

  await app.listen(port, host);

  const logger = app.get(Logger);
  logger.log(`API running on http://localhost:${port}/api/v1`, 'Bootstrap');

  if (!isProduction) {
    logger.log(
      `Swagger docs at http://localhost:${port}/api/docs`,
      'Bootstrap',
    );
  }
}

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[FATAL] Unhandled promise rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  console.error('[FATAL] Uncaught exception:', error);
  process.exit(1);
});

void bootstrap();
