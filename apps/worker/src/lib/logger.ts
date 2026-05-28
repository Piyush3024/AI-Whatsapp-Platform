import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",

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

  base: {
    service: "worker",
    env: env.NODE_ENV,
  },

  timestamp: pino.stdTimeFunctions.isoTime,

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
