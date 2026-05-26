import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ClsService } from 'nestjs-cls';
import type { AnalyticsDateRangeDto } from './dto/analytics-date-range.dto.js';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    return this.cls.get<string>('tenantId');
  }

  private buildDateRange(
    from?: string,
    to?: string,
  ): { gte?: Date; lte?: Date } {
    const range: { gte?: Date; lte?: Date } = {};
    if (from) {
      range.gte = new Date(`${from}T00:00:00.000Z`);
    }
    if (to) {
      range.lte = new Date(`${to}T23:59:59.999Z`);
    }
    return range;
  }

  async getOverview() {
    const tenantId = this.tenantId;

    const [
      totalBookings,
      totalCustomers,
      totalMessages,
      totalLocations,
      activeStaff,
    ] = await Promise.all([
      this.prisma.db.booking.count({ where: { tenantId } }),
      this.prisma.db.customer.count({ where: { tenantId } }),
      this.prisma.db.message.count({ where: { tenantId } }),
      this.prisma.db.location.count({ where: { tenantId } }),
      this.prisma.db.staff.count({ where: { tenantId, isActive: true } }),
    ]);

    const revenueResult = await this.prisma.db.booking.aggregate({
      where: {
        tenantId,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
      _sum: { totalAmount: true },
    });

    return {
      totalBookings,
      totalCustomers,
      totalMessages,
      totalLocations,
      activeStaff,
      totalRevenuePaisa: revenueResult._sum.totalAmount ?? 0,
    };
  }

  async getUsage(query: AnalyticsDateRangeDto) {
    const tenantId = this.tenantId;
    const dateRange = this.buildDateRange(query.from, query.to);

    const rows = await this.prisma.db.dailyUsageAggregate.findMany({
      where: {
        tenantId,
        ...(Object.keys(dateRange).length > 0 && { date: dateRange }),
      },
      orderBy: { date: 'asc' },
    });

    return rows;
  }

  async getMessageStats(query: AnalyticsDateRangeDto) {
    const tenantId = this.tenantId;
    const dateRange = this.buildDateRange(query.from, query.to);

    const params: (string | Date)[] = [tenantId];
    const conditions: string[] = ['"tenantId" = $1', '"deletedAt" IS NULL'];

    let paramIdx = 2;
    if (dateRange.gte) {
      conditions.push(`"createdAt" >= $${paramIdx++}`);
      params.push(dateRange.gte);
    }
    if (dateRange.lte) {
      conditions.push(`"createdAt" <= $${paramIdx++}`);
      params.push(dateRange.lte);
    }

    const whereClause = conditions.join(' AND ');

    const rows = await this.prisma.db.$queryRawUnsafe<
      { date: Date; direction: string; count: bigint }[]
    >(
      `
      SELECT
        DATE_TRUNC('day', "createdAt") AS date,
        direction,
        COUNT(*) AS count
      FROM "messages"
      WHERE ${whereClause}
      GROUP BY DATE_TRUNC('day', "createdAt"), direction
      ORDER BY date ASC, direction ASC
      `,
      ...params,
    );

    return rows.map((r) => ({
      date: r.date,
      direction: r.direction,
      count: Number(r.count),
    }));
  }

  async getBookingStats(query: AnalyticsDateRangeDto) {
    const tenantId = this.tenantId;
    const dateRange = this.buildDateRange(query.from, query.to);

    const createdAtFilter =
      Object.keys(dateRange).length > 0 ? { createdAt: dateRange } : {};

    const locationFilter = query.locationId
      ? { locationId: query.locationId }
      : {};

    const baseWhere = {
      tenantId,
      ...createdAtFilter,
      ...locationFilter,
    };

    const byStatus = await this.prisma.db.booking.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    const byLocation = await this.prisma.db.booking.groupBy({
      by: ['locationId'],
      where: baseWhere,
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    const locationIds = byLocation
      .map((r) => r.locationId)
      .filter(Boolean) as string[];
    const locations = await this.prisma.db.location.findMany({
      where: { id: { in: locationIds }, tenantId },
      select: { id: true, name: true },
    });
    const locationMap = new Map(locations.map((l) => [l.id, l.name]));

    const revenueResult = await this.prisma.db.booking.aggregate({
      where: {
        ...baseWhere,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
      _sum: { totalAmount: true },
    });

    return {
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: r._count.id,
        totalAmountPaisa: r._sum.totalAmount ?? 0,
      })),
      byLocation: byLocation.map((r) => ({
        locationId: r.locationId,
        locationName: r.locationId
          ? (locationMap.get(r.locationId) ?? 'Unknown')
          : 'Unassigned',
        count: r._count.id,
        totalAmountPaisa: r._sum.totalAmount ?? 0,
      })),
      totalRevenuePaisa: revenueResult._sum.totalAmount ?? 0,
    };
  }
}
