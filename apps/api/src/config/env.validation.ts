import Joi from 'joi';
/**
 * Joi validation schema for all environment variables.
 *
 * This runs at application startup via ConfigModule.forRoot({ validationSchema }).
 * If any required variable is missing or has the wrong type/value, the app
 * will REFUSE to start and print a clear error — catching config mistakes
 * before they cause mysterious runtime failures in production.
 *
 * Rules:
 * - Required vars have no .default() — missing them is a hard error.
 * - Optional vars have .default() — safe to omit in development.
 * - Secrets are validated for presence only (never log their values).
 */
export const envValidationSchema = Joi.object({
  // ── Application ──────────────────────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),

  PORT: Joi.number().integer().min(1024).max(65535).default(3001),

  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),

  // ── Database ──────────────────────────────────────────────────────────────
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  // ── Redis ─────────────────────────────────────────────────────────────────
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required(),

  // ── JWT ───────────────────────────────────────────────────────────────────
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  WHATSAPP_VERIFY_TOKEN: Joi.string().required(),
  WHATSAPP_APP_SECRET: Joi.string().required(),
  WHATSAPP_PHONE_NUMBER_ID: Joi.string().required(),
  WHATSAPP_ACCESS_TOKEN: Joi.string().required(),

  // ── OpenAI ────────────────────────────────────────────────────────────────
  OPENAI_API_KEY: Joi.string().pattern(/^sk-/).required(),

  // ── Stripe ────────────────────────────────────────────────────────────────
  STRIPE_SECRET_KEY: Joi.string()
    .pattern(/^sk_(test|live)_/)
    .required(),
  STRIPE_WEBHOOK_SECRET: Joi.string()
    .pattern(/^whsec_/)
    .required(),

  // ── eSewa ─────────────────────────────────────────────────────────────────
  ESEWA_MERCHANT_ID: Joi.string().required(),
  ESEWA_SECRET_KEY: Joi.string().required(),
  ESEWA_SUCCESS_URL: Joi.string().uri().required(),
  ESEWA_FAILURE_URL: Joi.string().uri().required(),
  ESEWA_MODE: Joi.string().valid('sandbox', 'live').default('sandbox'),

  // ── Rate Limiting (optional — has sane defaults) ──────────────────────────
  THROTTLE_TTL_MS: Joi.number().integer().default(60_000), // 1 minute window
  THROTTLE_LIMIT: Joi.number().integer().default(120), // 120 req/min
});
