/**
 * Typed configuration factory for @nestjs/config.
 *
 * Loaded via ConfigModule.forRoot({ load: [configuration] }).
 * Provides a single typed config object injectable via:
 *   ConfigService.get<AppConfig>('app')
 *   ConfigService.get<DbConfig>('database')
 *   etc.
 *
 * This means NO magic strings scattered across services — only typed
 * config keys resolved here once, at startup.
 */

export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigin: string[];
}

export interface DatabaseConfig {
  url: string;
}

export interface RedisConfig {
  url: string;
}

export interface JwtConfig {
  secret: string;
  refreshSecret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface MailConfig {
  resendApiKey: string;
  fromAddress: string;
  appUrl: string;
  appName: string;
}

export interface WhatsAppConfig {
  verifyToken: string;
  appSecret: string;
  phoneNumberId: string;
  accessToken: string;
}

export interface OpenAIConfig {
  apiKey: string;
}

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
}
export interface EsewaConfig {
  merchantId: string;
  secretKey: string;
  successUrl: string;
  failureUrl: string;
  mode: 'sandbox' | 'live';
}

export interface ThrottleConfig {
  ttlMs: number;
  limit: number;
}

export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3001', 10),
    // Supports comma-separated origins: "https://app.com,https://admin.app.com"
    corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim()),
  } satisfies AppConfig,

  database: {
    url: process.env.DATABASE_URL!,
  } satisfies DatabaseConfig,

  redis: {
    url: process.env.REDIS_URL!,
  } satisfies RedisConfig,

  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  } satisfies JwtConfig,

  whatsapp: {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN!,
    appSecret: process.env.WHATSAPP_APP_SECRET!,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
  } satisfies WhatsAppConfig,

  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
  } satisfies OpenAIConfig,

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  } satisfies StripeConfig,
  esewa: {
    merchantId: process.env.ESEWA_MERCHANT_ID!,
    secretKey: process.env.ESEWA_SECRET_KEY!,
    successUrl: process.env.ESEWA_SUCCESS_URL!,
    failureUrl: process.env.ESEWA_FAILURE_URL!,
    mode: (process.env.ESEWA_MODE ?? 'sandbox') as 'sandbox' | 'live',
  } satisfies EsewaConfig,

  mail: {
    resendApiKey: process.env.RESEND_API_KEY!,
    fromAddress: process.env.MAIL_FROM_ADDRESS!,
    appUrl: process.env.MAIL_APP_URL!,
    appName: process.env.MAIL_APP_NAME ?? 'WhatsApp AI Platform',
  } satisfies MailConfig,

  throttle: {
    ttlMs: parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
  } satisfies ThrottleConfig,
});
