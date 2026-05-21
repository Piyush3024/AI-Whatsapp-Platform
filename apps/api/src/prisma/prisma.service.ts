// import {
//   Injectable,
//   Logger,
//   OnModuleDestroy,
//   OnModuleInit,
// } from '@nestjs/common';
// import { PrismaClient } from "./generated/prisma/client.js";

// /**
//  * Soft-delete models — keep in sync with schema.
//  * Only models that have a deletedAt field are listed here.
//  */
// const SOFT_DELETE_MODELS = new Set([
//   'Tenant', 'User', 'TenantMember', 'RefreshToken', 'Plan',
//   'Subscription', 'Invoice', 'InvoiceLineItem', 'SystemAIPromptTemplate',
//   'SystemMessageTemplate', 'SystemReminderRule', 'Location',
//   'LocationBusinessHour', 'WhatsAppNumber', 'Customer', 'Conversation',
//   'Message', 'Staff', 'StaffSchedule', 'StaffScheduleOverride', 'Service',
//   'Booking', 'BookingService', 'TenantReminderRule', 'ScheduledReminder',
//   'TenantAIPrompt', 'KnowledgeBaseDocument', 'TenantMessageTemplate',
// ]);

// /**
//  * PrismaService
//  *
//  * Uses composition (not inheritance) — the correct pattern for Prisma 7+.
//  * Exposes a `client` property with soft-delete extension applied.
//  *
//  * Usage in services:
//  *   constructor(private prisma: PrismaService) {}
//  *   this.prisma.client.user.findMany(...)
//  *
//  * RLS context is set per-request by TenantMiddleware (Step 4).
//  */
// @Injectable()
// export class PrismaService implements OnModuleInit, OnModuleDestroy {
//   private readonly logger = new Logger(PrismaService.name);
//   private readonly base: PrismaClient;

//   /**
//    * The extended Prisma client with soft-delete filter applied globally.
//    * Inject PrismaService and use `prismaService.client` for all queries.
//    */
//   readonly client: ReturnType<typeof this._buildClient>;

//   constructor() {
//     this.base = new PrismaClient({
//       log: [
//         { emit: 'event', level: 'error' },
//         { emit: 'event', level: 'warn' },
//         ...(process.env.NODE_ENV === 'development'
//           ? [{ emit: 'event' as const, level: 'query' as const }]
//           : []),
//       ],
//     });

//     // Forward Prisma events to NestJS logger
//     (this.base as any).$on('error', (e: { message: string }) =>
//       this.logger.error(e.message, 'Prisma'),
//     );
//     (this.base as any).$on('warn', (e: { message: string }) =>
//       this.logger.warn(e.message, 'Prisma'),
//     );
//     (this.base as any).$on(
//       'query',
//       (e: { query: string; duration: number }) => {
//         if (process.env.NODE_ENV === 'development') {
//           this.logger.debug(`${e.query} (${e.duration}ms)`, 'Prisma');
//         }
//       },
//     );

//     this.client = this._buildClient();
//   }

//   async onModuleInit(): Promise<void> {
//     await this.base.$connect();
//     this.logger.log('Database connection established', 'PrismaService');
//   }

//   async onModuleDestroy(): Promise<void> {
//     await this.base.$disconnect();
//     this.logger.log('Database connection closed', 'PrismaService');
//   }

//   /**
//    * Set PostgreSQL RLS tenant context for the current transaction.
//    * Called by TenantMiddleware on every authenticated request.
//    * `true` = LOCAL scope — resets automatically when transaction ends.
//    */
//   async setTenantContext(tenantId: string): Promise<void> {
//     await this.base.$executeRaw`
//       SELECT set_config('app.current_tenant_id', ${tenantId}, true)
//     `;
//   }

//   /**
//    * Clear tenant context for system/admin operations that bypass RLS.
//    * Use for: billing jobs, global analytics, migrations.
//    */
//   async clearTenantContext(): Promise<void> {
//     await this.base.$executeRaw`
//       SELECT set_config('app.current_tenant_id', '', true)
//     `;
//   }

//   /**
//    * Build the extended Prisma client with soft-delete applied globally.
//    * - find* operations automatically filter out rows where deletedAt IS NOT NULL
//    * - delete/deleteMany are converted to soft deletes (set deletedAt = now())
//    * - count automatically filters out soft-deleted rows
//    */
//   private _buildClient() {
//     return this.base.$extends({
//       name: 'softDelete',
//       query: {
//         $allModels: {
//           async findMany({ model, args, query }: any) {
//             if (SOFT_DELETE_MODELS.has(model)) {
//               args.where = { deletedAt: null, ...args.where };
//             }
//             return query(args);
//           },
//           async findFirst({ model, args, query }: any) {
//             if (SOFT_DELETE_MODELS.has(model)) {
//               args.where = { deletedAt: null, ...args.where };
//             }
//             return query(args);
//           },
//           async findUnique({ model, args, query }: any) {
//             if (SOFT_DELETE_MODELS.has(model)) {
//               args.where = { ...args.where, deletedAt: null };
//             }
//             return query(args);
//           },
//           async findFirstOrThrow({ model, args, query }: any) {
//             if (SOFT_DELETE_MODELS.has(model)) {
//               args.where = { deletedAt: null, ...args.where };
//             }
//             return query(args);
//           },
//           async findUniqueOrThrow({ model, args, query }: any) {
//             if (SOFT_DELETE_MODELS.has(model)) {
//               args.where = { ...args.where, deletedAt: null };
//             }
//             return query(args);
//           },
//           async count({ model, args, query }: any) {
//             if (SOFT_DELETE_MODELS.has(model)) {
//               args.where = { deletedAt: null, ...args.where };
//             }
//             return query(args);
//           },
//         },
//       },
//     });
//   }
// }

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const SOFT_DELETE_MODELS = new Set([
  'Tenant',
  'User',
  'TenantMember',
  'RefreshToken',
  'Plan',
  'Subscription',
  'Invoice',
  'InvoiceLineItem',
  'SystemAIPromptTemplate',
  'SystemMessageTemplate',
  'SystemReminderRule',
  'Location',
  'LocationBusinessHour',
  'WhatsAppNumber',
  'Customer',
  'Conversation',
  'Message',
  'Staff',
  'StaffSchedule',
  'StaffScheduleOverride',
  'Service',
  'Booking',
  'BookingService',
  'TenantReminderRule',
  'ScheduledReminder',
  'TenantAIPrompt',
  'KnowledgeBaseDocument',
  'TenantMessageTemplate',
]);

/**
 * PrismaService
 *
 * Extends PrismaClient using the driver adapter pattern (official Prisma 7 + NestJS approach).
 * Uses PrismaPg adapter — required for Prisma 7's ESM client with PostgreSQL.
 *
 * Responsibilities:
 *  1. Connect/disconnect via NestJS lifecycle hooks
 *  2. Expose setTenantContext() / clearTenantContext() for RLS (called by TenantMiddleware)
 *  3. Expose a soft-delete extended client via this.db for all queries
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Use this.db for all database queries in your services.
   * It has the soft-delete extension applied globally.
   *
   * Example: this.prisma.db.user.findMany()
   */
  readonly db: ReturnType<typeof this._buildDb>;

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({ adapter });
    this.db = this._buildDb();
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connection established', 'PrismaService');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed', 'PrismaService');
  }

  /**
   * Set PostgreSQL RLS tenant context for the current transaction.
   * Called by TenantMiddleware at the start of every authenticated request.
   * true = LOCAL scope — resets automatically when transaction ends.
   */
  async setTenantContext(tenantId: string): Promise<void> {
    await this.$executeRaw`
      SELECT set_config('app.current_tenant_id', ${tenantId}, true)
    `;
  }

  /**
   * Clear tenant context for system/admin operations that bypass RLS.
   */
  async clearTenantContext(): Promise<void> {
    await this.$executeRaw`
      SELECT set_config('app.current_tenant_id', '', true)
    `;
  }

  /**
   * Builds the soft-delete extended client.
   * All find*, count operations automatically exclude soft-deleted rows.
   * delete/deleteMany are converted to soft deletes.
   */
  private _buildDb() {
    return this.$extends({
      name: 'softDelete',
      query: {
        $allModels: {
          async findMany({ model, args, query }: any) {
            if (SOFT_DELETE_MODELS.has(model))
              args.where = { deletedAt: null, ...args.where };
            return query(args);
          },
          async findFirst({ model, args, query }: any) {
            if (SOFT_DELETE_MODELS.has(model))
              args.where = { deletedAt: null, ...args.where };
            return query(args);
          },
          async findUnique({ model, args, query }: any) {
            if (SOFT_DELETE_MODELS.has(model))
              args.where = { ...args.where, deletedAt: null };
            return query(args);
          },
          async findFirstOrThrow({ model, args, query }: any) {
            if (SOFT_DELETE_MODELS.has(model))
              args.where = { deletedAt: null, ...args.where };
            return query(args);
          },
          async findUniqueOrThrow({ model, args, query }: any) {
            if (SOFT_DELETE_MODELS.has(model))
              args.where = { ...args.where, deletedAt: null };
            return query(args);
          },
          async count({ model, args, query }: any) {
            if (SOFT_DELETE_MODELS.has(model))
              args.where = { deletedAt: null, ...args.where };
            return query(args);
          },
        },
      },
    });
  }
}
