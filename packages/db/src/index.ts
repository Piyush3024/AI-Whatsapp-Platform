/**
 * @whatsapp-ai/db - Shared Prisma Client
 *
 * Usage in API/Worker:
 * import { PrismaClient } from '@whatsapp-ai/db/generated/prisma';
 * import type { ... } from '@whatsapp-ai/db/generated/prisma';
 */

// Re-export everything from generated client for convenience
export * from "./generated/prisma/client.js";
