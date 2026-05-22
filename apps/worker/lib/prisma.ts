import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

// ============================================================
// PRISMA SERVICE WITH RLS CONTEXT
//
// API ke saath same pattern:
// - PrismaPg driver adapter (Prisma 7 mandatory)
// - Soft-delete $extends
// - RLS context: set_config('app.current_tenant_id', tenantId, true)
//   har query se pehle $transaction ke andar
//
// CRITICAL: Har DB operation withTenantContext() se wrap hona CHAHIYE
// Direct prisma.model.find() call karna = RLS bypass = DATA LEAK
// ============================================================

// PrismaPg adapter — Prisma 7 requires driver adapter
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

// Base client with soft-delete extension
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
  // Soft-delete extension — deletedAt filter automatically apply
  // Same as API — consistency ke liye
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
});

export type ExtendedPrismaClient = typeof basePrisma;

// ============================================================
// withTenantContext — MANDATORY wrapper for all DB operations
//
// Usage:
//   const result = await withTenantContext(tenantId, async (tx) => {
//     return tx.customer.findFirst({ where: { phone } });
//   });
//
// System operations (no RLS needed):
//   await withTenantContext('', async (tx) => { ... })
// ============================================================

export async function withTenantContext<T>(
  tenantId: string,
  operation: (prisma: ExtendedPrismaClient) => Promise<T>,
): Promise<T> {
  return basePrisma.$transaction(async (tx) => {
    // RLS context set karo — transaction-scoped (3rd param = true = local)
    await tx.$executeRaw`
      SELECT set_config('app.current_tenant_id', ${tenantId}, true)
    `;

    // Cast to ExtendedPrismaClient — $extends transaction ke andar bhi work karta hai
    return operation(tx as unknown as ExtendedPrismaClient);
  });
}

// ============================================================
// CONNECT / DISCONNECT
// ============================================================

export async function connectPrisma(): Promise<void> {
  await basePrisma.$connect();
  logger.info("Prisma connected");
}

export async function disconnectPrisma(): Promise<void> {
  await basePrisma.$disconnect();
  logger.info("Prisma disconnected");
}

// Named export for direct use (always via withTenantContext)
export { basePrisma as prisma };
