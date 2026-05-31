import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PaymentRequiredException } from '../../common/exceptions/index.js';

export type LimitType = 'maxMessages' | 'maxStaff' | 'maxLocations';

interface PlanLimits {
  maxMessages?: number;
  maxStaff?: number;
  maxLocations?: number;
  [key: string]: unknown;
}

export interface UsageStatus {
  used: number;
  limit: number | null; // null = unlimited
  isExceeded: boolean;
}

export interface TenantUsageSummary {
  maxMessages: UsageStatus;
  maxStaff: UsageStatus;
  maxLocations: UsageStatus;
}

@Injectable()
export class UsageLimitService {
  private readonly logger = new Logger(UsageLimitService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Throws 402 if the given limit is exceeded for the tenant.
   * Used by API guards and worker processors before performing write operations.
   */
  async assertLimit(tenantId: string, limitType: LimitType): Promise<void> {
    const limits = await this._getPlanLimits(tenantId);
    const limitValue = limits[limitType];

    // null or undefined = no limit configured = unlimited
    if (limitValue == null) return;

    const used = await this._getUsage(tenantId, limitType);

    if (used >= limitValue) {
      this.logger.warn(
        { tenantId, limitType, used, limit: limitValue },
        'Plan limit exceeded',
      );

      throw new PaymentRequiredException(
        `You have reached your plan limit for ${this._humanize(limitType)} (${used}/${limitValue}). Please upgrade your plan.`,
      );
    }
  }

  /**
   * Returns full usage summary for the billing page — no throws.
   */
  async getUsageSummary(tenantId: string): Promise<TenantUsageSummary> {
    const limits = await this._getPlanLimits(tenantId);

    const [messagesUsed, staffUsed, locationsUsed] = await Promise.all([
      this._getUsage(tenantId, 'maxMessages'),
      this._getUsage(tenantId, 'maxStaff'),
      this._getUsage(tenantId, 'maxLocations'),
    ]);

    const toStatus = (
      used: number,
      limit: number | undefined,
    ): UsageStatus => ({
      used,
      limit: limit ?? null,
      isExceeded: limit != null && used >= limit,
    });

    return {
      maxMessages: toStatus(messagesUsed, limits.maxMessages),
      maxStaff: toStatus(staffUsed, limits.maxStaff),
      maxLocations: toStatus(locationsUsed, limits.maxLocations),
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async _getPlanLimits(tenantId: string): Promise<PlanLimits> {
    const subscription = await this.prisma.db.subscription.findFirst({
      where: { tenantId, deletedAt: null },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      // No subscription — tenant is on trial, apply conservative defaults
      return { maxMessages: 100, maxStaff: 2, maxLocations: 1 };
    }

    return (subscription.plan.limits as PlanLimits) ?? {};
  }

  private async _getUsage(
    tenantId: string,
    limitType: LimitType,
  ): Promise<number> {
    switch (limitType) {
      case 'maxMessages':
        return this._getMessageUsageToday(tenantId);
      case 'maxStaff':
        return this._getActiveStaffCount(tenantId);
      case 'maxLocations':
        return this._getActiveLocationCount(tenantId);
    }
  }

  private async _getMessageUsageToday(tenantId: string): Promise<number> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const aggregate = await this.prisma.db.dailyUsageAggregate.findUnique({
      where: { tenantId_date: { tenantId, date: today } },
      select: { messagesOut: true },
    });

    return aggregate?.messagesOut ?? 0;
  }

  private async _getActiveStaffCount(tenantId: string): Promise<number> {
    return this.prisma.db.staff.count({
      where: { tenantId, isActive: true, deletedAt: null },
    });
  }

  private async _getActiveLocationCount(tenantId: string): Promise<number> {
    return this.prisma.db.location.count({
      where: { tenantId, deletedAt: null },
    });
  }

  private _humanize(limitType: LimitType): string {
    const map: Record<LimitType, string> = {
      maxMessages: 'daily messages',
      maxStaff: 'staff members',
      maxLocations: 'locations',
    };
    return map[limitType];
  }
}
