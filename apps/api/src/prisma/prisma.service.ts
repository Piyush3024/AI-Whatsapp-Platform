import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { ClsService } from 'nestjs-cls';

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

  constructor(private readonly cls: ClsService) {
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
   * Get current tenant ID from CLS context.
   * Use this in services when you need the tenantId for custom queries.
   */
  getTenantId(): string {
    const tenantId = this.cls.get<string>('tenantId');
    if (!tenantId) {
      throw new Error(
        'Tenant context not set. Ensure TenantMiddleware is applied.',
      );
    }
    return tenantId;
  }

  /**
   * Builds the soft-delete extended client.
   * All find*, count operations automatically exclude soft-deleted rows.
   * delete/deleteMany are converted to soft deletes.
   */

  private _buildDb() {
    const cls = this.cls;
    const baseClient = this;
    return this.$extends({
      name: 'softDelete+tenantRLS',
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }: any) {
            // ── Soft delete filter ──────────────────────────────────────
            const readOps = [
              'findMany',
              'findFirst',
              'findUnique',
              'findFirstOrThrow',
              'findUniqueOrThrow',
              'count',
            ];
            if (readOps.includes(operation) && SOFT_DELETE_MODELS.has(model)) {
              args.where = { deletedAt: null, ...args.where };
            }

            // ── RLS tenant context ──────────────────────────────────────
            // Set config atomically with the query in the same transaction.
            // This is safe for connection pooling — context never leaks
            // to another request's query on the same connection.
            const tenantId = cls.get<string>('tenantId');
            if (tenantId) {
              const [, result] = await baseClient.$transaction([
                baseClient.$executeRaw`
                SELECT set_config('app.current_tenant_id', ${tenantId}, true)
              `,
                query(args),
              ]);
              return result;
            }

            return query(args);
          },
        },
      },
    });
  }
}
