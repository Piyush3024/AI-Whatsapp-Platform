import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z
    .string()
    .min(1)
    .startsWith(
      "postgresql://",
      "DATABASE_URL must be a PostgreSQL connection string",
    ),

  // Redis
  REDIS_URL: z
    .string()
    .min(1)
    .startsWith("redis://", "REDIS_URL must start with redis://"),

  // OpenAI
  OPENAI_API_KEY: z
    .string()
    .min(1)
    .startsWith("sk-", "OPENAI_API_KEY must start with sk-"),

  // WhatsApp Cloud API
  WHATSAPP_ACCESS_TOKEN: z.string().min(1, "WHATSAPP_ACCESS_TOKEN is required"),

  WHATSAPP_PHONE_NUMBER_ID: z
    .string()
    .min(1, "WHATSAPP_PHONE_NUMBER_ID is required"),

  // Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Optional — worker concurrency tuning
  WORKER_CONCURRENCY: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 5))
    .pipe(z.number().min(1).max(50)),
});

// Parse and validate — throw on failure
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1); // Hard fail — misconfigured worker shouldn't start
}

export const env = parsed.data;

// Type export for use in other files
export type Env = typeof env;
