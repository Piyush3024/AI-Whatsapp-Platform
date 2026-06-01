import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { NotificationQueryDto } from './dto/notification-query.dto.js';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
}

export interface PaginatedNotifications {
  items: NotificationItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    tenantId: string,
    query: NotificationQueryDto,
  ): Promise<PaginatedNotifications> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      tenantId,
      ...(query.unreadOnly && { readAt: null }),
    };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          metadata: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.prisma.db.notification.count({ where }),
      this.prisma.db.notification.count({
        where: { userId, tenantId, readAt: null },
      }),
    ]);

    return {
      items: items.map((n) => ({
        ...n,
        metadata: (n.metadata as Record<string, unknown>) ?? {},
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  async markRead(
    notificationId: string,
    userId: string,
    tenantId: string,
  ): Promise<NotificationItem> {
    const notification = await this.prisma.db.notification.findFirst({
      where: { id: notificationId, userId, tenantId },
    });

    if (!notification) {
      throw new NotFoundException({
        errorCode: 'NOTIFICATION_NOT_FOUND',
        message: `Notification ${notificationId} not found.`,
      });
    }

    const updated = await this.prisma.db.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        metadata: true,
        readAt: true,
        createdAt: true,
      },
    });

    return {
      ...updated,
      metadata: (updated.metadata as Record<string, unknown>) ?? {},
    };
  }

  async markAllRead(
    userId: string,
    tenantId: string,
  ): Promise<{ count: number }> {
    const result = await this.prisma.db.notification.updateMany({
      where: { userId, tenantId, readAt: null },
      data: { readAt: new Date() },
    });

    this.logger.log(
      `Marked ${result.count} notifications as read for user: ${userId}`,
    );

    return { count: result.count };
  }

  async getUnreadCount(userId: string, tenantId: string): Promise<number> {
    return this.prisma.db.notification.count({
      where: { userId, tenantId, readAt: null },
    });
  }
}
