import pino from "pino";
import { env } from "../config/env.js";

// ============================================================
// STRUCTURED LOGGER
// Production: JSON (machine readable, log aggregators ke liye)
// Development: pino-pretty (human readable)
//
// Har log mein context fields mandatory:
// - tenantId (RLS context)
// - jobId (BullMQ job ID)
// - queue (queue name)
// ============================================================

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",

  // Production mein pretty print band — JSON only
  ...(env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  }),

  // Base fields har log mein
  base: {
    service: "worker",
    env: env.NODE_ENV,
  },

  // Timestamp ISO format
  timestamp: pino.stdTimeFunctions.isoTime,

  // Sensitive fields redact karo
  redact: {
    paths: [
      "WHATSAPP_ACCESS_TOKEN",
      "OPENAI_API_KEY",
      "DATABASE_URL",
      "*.token",
      "*.password",
      "*.passwordHash",
      "*.accessToken",
    ],
    censor: "[REDACTED]",
  },
});

// ============================================================
// CHILD LOGGER FACTORY
// Har processor/job ke liye context-aware child logger
// Usage: const log = createJobLogger('whatsapp-inbound', job.id, tenantId)
// ============================================================

export function createJobLogger(
  queue: string,
  jobId: string | undefined,
  tenantId: string,
) {
  return logger.child({
    queue,
    jobId: jobId ?? "unknown",
    tenantId,
  });
}

export type Logger = typeof logger;
export type JobLogger = ReturnType<typeof createJobLogger>;
