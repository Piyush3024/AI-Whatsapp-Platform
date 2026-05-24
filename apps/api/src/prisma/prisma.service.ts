import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@whatsapp-ai/db/generated/prisma';
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

const READ_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findUnique',
  'findFirstOrThrow',
  'findUniqueOrThrow',
  'count',
]);

type PrismaQueryArgs = {
  where?: Record<string, unknown>;
  [key: string]: unknown;
};

interface PrismaExtensionQueryParams {
  model?: string;
  operation: string;
  args: PrismaQueryArgs;
  query: (args: PrismaQueryArgs) => Prisma.PrismaPromise<unknown>;
}

function buildExtendedPrismaClient(baseClient: PrismaClient, cls: ClsService) {
  return baseClient.$extends({
    name: 'softDelete+tenantRLS',
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: PrismaExtensionQueryParams): Promise<unknown> {
          if (
            model &&
            READ_OPERATIONS.has(operation) &&
            SOFT_DELETE_MODELS.has(model)
          ) {
            args.where = { deletedAt: null, ...args.where };
          }

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

/**
 * PrismaService
 *
 * Extends PrismaClient using the driver adapter pattern.
 * Use this.db for all database queries so soft-delete and tenant RLS context
 * are applied consistently.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

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

  getTenantId(): string {
    const tenantId = this.cls.get<string>('tenantId');
    if (!tenantId) {
      throw new Error(
        'Tenant context not set. Ensure TenantMiddleware is applied.',
      );
    }
    return tenantId;
  }

  private _buildDb() {
    return buildExtendedPrismaClient(this, this.cls);
  }
}
