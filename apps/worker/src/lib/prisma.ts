import { PrismaClient } from "@whatsapp-ai/db/generated/prisma";

import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

const basePrisma = new PrismaClient({
  adapter,
  log:
    env.NODE_ENV === "development"
      ? [
          { level: "query", emit: "event" },
          { level: "error", emit: "stdout" },
          { level: "warn", emit: "stdout" },
        ]
      : [{ level: "error", emit: "stdout" }],
}).$extends({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findFirst({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findUnique({ args, query }) {
        return query(args);
      },
    },
  },
}) as unknown as PrismaClient;

export type ExtendedPrismaClient = PrismaClient;

export async function withTenantContext<T>(
  tenantId: string,
  operation: (prisma: ExtendedPrismaClient) => Promise<T>,
): Promise<T> {
  return basePrisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT set_config('app.current_tenant_id', ${tenantId}, true)
    `;

    return operation(tx as unknown as ExtendedPrismaClient);
  });
}

export type TenantTxClient = Parameters<
  Parameters<typeof withTenantContext>[1]
>[0];

export async function connectPrisma(): Promise<void> {
  await basePrisma.$connect();
  logger.info("Prisma connected");
}

export async function disconnectPrisma(): Promise<void> {
  await basePrisma.$disconnect();
  logger.info("Prisma disconnected");
}

export { basePrisma as prisma };
