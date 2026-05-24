import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { PrismaService } from '../../prisma/prisma.service.js';
import { QUEUE_NAMES } from '../../constants/queues.js';
import { CreateReminderRuleDto, UpdateReminderRuleDto } from './dto/index.js';
import {
  Prisma,
  ReminderRuleType,
  SystemReminderRule,
  TenantReminderRule,
} from '@whatsapp-ai/db/generated/prisma';

// ============================================================
// Types
// ============================================================

export type ReminderRuleWithSystem = TenantReminderRule & {
  systemRule: SystemReminderRule | null;
};

interface BookingWithDetails {
  id: string;
  tenantId: string;
  customerId: string;
  staffId: string | null;
  startTime: Date;
  endTime: Date;
  status: string;
  totalAmount: number | null;
  customer: {
    id: string;
    phone: string;
    name: string | null;
    optInStatus: string;
  };
  staff: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  services: {
    service: {
      name: string;
    };
  }[];
  location: {
    name: string;
    phone: string | null;
  } | null;
}

// ============================================================
// Constants
// ============================================================

// Timing unit conversions to minutes
const TIMING_UNIT_TO_MINUTES: Record<string, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
};

// Default reminder timings per type
const DEFAULT_REMINDER_TIMINGS: Record<
  ReminderRuleType,
  { offset: number; unit: string }
> = {
  PRE_APPOINTMENT_24H: { offset: 1440, unit: 'minutes' }, // 24 hours
  PRE_APPOINTMENT_2H: { offset: 120, unit: 'minutes' }, // 2 hours
  POST_APPOINTMENT_4H: { offset: 240, unit: 'minutes' }, // 4 hours
  RE_BOOKING_30D: { offset: 43200, unit: 'minutes' }, // 30 days
  PAYMENT_1D: { offset: 1440, unit: 'minutes' }, // 1 day
};

// ============================================================
// Reminder Message Templates
// ============================================================

const REMINDER_TEMPLATES: Record<ReminderRuleType, string> = {
  PRE_APPOINTMENT_24H: `Hi {{customerName}}! This is a reminder that your appointment at {{locationName}} is scheduled for {{appointmentTime}}. We look forward to seeing you!`,
  PRE_APPOINTMENT_2H: `Hi {{customerName}}! Just 2 hours left for your appointment at {{locationName}}. See you soon!`,
  POST_APPOINTMENT_4H: `Thank you for visiting {{locationName}}, {{customerName}}! How was your experience? Feel free to book your next appointment anytime.`,
  RE_BOOKING_30D: `Hi {{customerName}}! It's been a while since your last visit to {{locationName}}. We'd love to see you again! Book your next appointment here.`,
  PAYMENT_1D: `Hi {{customerName}}! You have a pending payment of {{amount}} for your appointment at {{locationName}}. Please complete the payment.`,
};

// ============================================================
// Service
// ============================================================

@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue(QUEUE_NAMES.REMINDERS)
    private readonly remindersQueue: Queue,
  ) {}

  // ============================================================
  // Reminder Rules CRUD
  // ============================================================

  async createReminderRule(
    tenantId: string,
    dto: CreateReminderRuleDto,
  ): Promise<ReminderRuleWithSystem> {
    // Check if rule already exists for this type
    const existingRule = await this.prisma.db.tenantReminderRule.findUnique({
      where: {
        tenantId_type: {
          tenantId,
          type: dto.type,
        },
      },
    });

    if (existingRule) {
      throw new ForbiddenException(
        `Reminder rule of type '${dto.type}' already exists. Use PATCH to update.`,
      );
    }

    // Fetch system rule for default template
    const systemRule = await this.prisma.db.systemReminderRule.findUnique({
      where: { type: dto.type },
    });

    const rule = await this.prisma.db.tenantReminderRule.create({
      data: {
        tenantId,
        systemRuleId: systemRule?.id,
        type: dto.type,
        isEnabled: dto.isEnabled ?? true,
        timingOffset:
          dto.timingOffset ?? DEFAULT_REMINDER_TIMINGS[dto.type].offset,
        timingUnit: dto.timingUnit ?? DEFAULT_REMINDER_TIMINGS[dto.type].unit,
        customBody:
          dto.customBody ??
          systemRule?.defaultBody ??
          REMINDER_TEMPLATES[dto.type],
      },
      include: {
        systemRule: true,
      },
    });

    return rule;
  }

  async getReminderRules(
    tenantId: string,
    query: { type?: ReminderRuleType; isEnabled?: boolean },
  ) {
    const where: Record<string, unknown> = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.isEnabled !== undefined) {
      where.isEnabled = query.isEnabled;
    }

    const rules = await this.prisma.db.tenantReminderRule.findMany({
      where: {
        tenantId,
        ...where,
      },
      include: {
        systemRule: true,
      },
      orderBy: { type: 'asc' },
    });

    return rules;
  }

  async getReminderRuleByType(tenantId: string, type: ReminderRuleType) {
    const rule = await this.prisma.db.tenantReminderRule.findUnique({
      where: {
        tenantId_type: {
          tenantId,
          type,
        },
      },
      include: {
        systemRule: true,
      },
    });

    if (!rule) {
      throw new NotFoundException(`Reminder rule of type '${type}' not found.`);
    }

    return rule;
  }

  async updateReminderRule(
    tenantId: string,
    type: ReminderRuleType,
    dto: UpdateReminderRuleDto,
  ) {
    const rule = await this.prisma.db.tenantReminderRule.findUnique({
      where: {
        tenantId_type: {
          tenantId,
          type,
        },
      },
    });

    if (!rule) {
      throw new NotFoundException(`Reminder rule of type '${type}' not found.`);
    }

    const updatedRule = await this.prisma.db.tenantReminderRule.update({
      where: { id: rule.id },
      data: {
        isEnabled: dto.isEnabled ?? rule.isEnabled,
        timingOffset: dto.timingOffset ?? rule.timingOffset,
        timingUnit: dto.timingUnit ?? rule.timingUnit,
        customBody: dto.customBody ?? rule.customBody,
      },
      include: {
        systemRule: true,
      },
    });

    return updatedRule;
  }

  async deleteReminderRule(tenantId: string, type: ReminderRuleType) {
    const rule = await this.prisma.db.tenantReminderRule.findUnique({
      where: {
        tenantId_type: {
          tenantId,
          type,
        },
      },
    });

    if (!rule) {
      throw new NotFoundException(`Reminder rule of type '${type}' not found.`);
    }

    await this.prisma.db.tenantReminderRule.delete({
      where: { id: rule.id },
    });

    return { deleted: true };
  }

  // ============================================================
  // Scheduled Reminders
  // ============================================================

  async getScheduledReminders(
    tenantId: string,
    query: {
      bookingId?: string;
      status?: string;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Record<string, unknown> = {};

    if (query.bookingId) {
      where.bookingId = query.bookingId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.fromDate || query.toDate) {
      where.scheduledAt = {};
      if (query.fromDate) {
        (where.scheduledAt as Record<string, Date>).gte = query.fromDate;
      }
      if (query.toDate) {
        (where.scheduledAt as Record<string, Date>).lte = query.toDate;
      }
    }

    const [reminders, total] = await Promise.all([
      this.prisma.db.scheduledReminder.findMany({
        where: {
          tenantId,
          ...where,
        },
        include: {
          booking: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      this.prisma.db.scheduledReminder.count({
        where: {
          tenantId,
          ...where,
        },
      }),
    ]);

    return {
      data: reminders,
      pagination: {
        total,
        limit: query.limit ?? 50,
        offset: query.offset ?? 0,
      },
    };
  }

  // ============================================================
  // Schedule Reminders for Booking
  // ============================================================

  async scheduleRemindersForBooking(bookingId: string): Promise<void> {
    // Fetch booking with all required details
    const booking = await this.prisma.db.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        staff: true,
        location: true,
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking '${bookingId}' not found.`);
    }

    // Get all enabled reminder rules for tenant
    const rules = await this.prisma.db.tenantReminderRule.findMany({
      where: {
        tenantId: booking.tenantId,
        isEnabled: true,
      },
      include: {
        systemRule: true,
      },
    });

    if (rules.length === 0) {
      return; // No reminders configured
    }

    // Cancel existing pending reminders for this booking
    await this.prisma.db.scheduledReminder.updateMany({
      where: {
        bookingId,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
      },
    });

    // Calculate and schedule new reminders
    const scheduledReminders: Prisma.ScheduledReminderCreateManyInput[] = [];

    for (const rule of rules) {
      const scheduledAt = this.calculateReminderTime(
        booking.startTime,
        rule.type,
        rule.timingOffset ?? 0,
        rule.timingUnit ?? 'minutes',
      );

      // Skip if reminder time is in the past
      if (scheduledAt <= new Date()) {
        continue;
      }

      // Build message from template
      const message = this.buildReminderMessage(
        rule.customBody ?? REMINDER_TEMPLATES[rule.type],
        booking,
      );

      scheduledReminders.push({
        tenantId: booking.tenantId,
        bookingId: booking.id,
        ruleType: rule.type,
        scheduledAt,
        status: 'PENDING' as const,
        message,
      });
    }

    // Bulk create scheduled reminders
    if (scheduledReminders.length > 0) {
      await this.prisma.db.scheduledReminder.createMany({
        data: scheduledReminders,
      });

      // Queue immediate processing for reminders with scheduledAt in the past
      const now = new Date();
      const immediateReminders = scheduledReminders.filter(
        (r) => r.scheduledAt <= new Date(now.getTime() + 60000), // Within next minute
      );

      for (const reminder of immediateReminders) {
        await this.remindersQueue.add(
          'process-reminder',
          {
            tenantId: reminder.tenantId,
            bookingId: reminder.bookingId,
            ruleType: reminder.ruleType,
          },
          {
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
      }
    }
  }

  // ============================================================
  // Cancel Reminders for Booking
  // ============================================================

  async cancelRemindersForBooking(bookingId: string): Promise<void> {
    await this.prisma.db.scheduledReminder.updateMany({
      where: {
        bookingId,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * Calculate reminder scheduled time based on booking start time
   */
  private calculateReminderTime(
    appointmentTime: Date,
    ruleType: ReminderRuleType,
    offset: number,
    unit: string,
  ): Date {
    const unitMinutes = TIMING_UNIT_TO_MINUTES[unit] ?? 1;
    const offsetMinutes = offset * unitMinutes;

    // For PRE_* rules: subtract from appointment time
    // For POST_* rules: add to appointment time or appointment end time
    if (ruleType.startsWith('PRE_')) {
      return new Date(appointmentTime.getTime() - offsetMinutes * 60000);
    } else if (ruleType.startsWith('POST_')) {
      // POST_APPOINTMENT: add to appointment time
      return new Date(appointmentTime.getTime() + offsetMinutes * 60000);
    } else if (ruleType === 'RE_BOOKING_30D') {
      // RE_BOOKING: add to current time (for follow-up after past appointment)
      // We'll handle this differently - scheduled at booking end time + offset
      return new Date(appointmentTime.getTime() + offsetMinutes * 60000);
    } else if (ruleType === 'PAYMENT_1D') {
      // PAYMENT: add to appointment time
      return new Date(appointmentTime.getTime() + offsetMinutes * 60000);
    }

    return new Date(appointmentTime.getTime() - offsetMinutes * 60000);
  }

  /**
   * Build reminder message with variable substitution
   */
  private buildReminderMessage(
    template: string,
    booking: BookingWithDetails,
  ): string {
    const customerName = booking.customer?.name ?? 'Customer';
    const locationName = booking.location?.name ?? 'our business';
    const appointmentTime = this.formatAppointmentTime(booking.startTime);
    const amount = booking.totalAmount
      ? `Rs. ${(booking.totalAmount / 100).toFixed(2)}`
      : 'pending';

    return template
      .replace(/\{\{customerName\}\}/g, customerName)
      .replace(/\{\{locationName\}\}/g, locationName)
      .replace(/\{\{appointmentTime\}\}/g, appointmentTime)
      .replace(/\{\{amount\}\}/g, amount)
      .replace(/\{\{staffName\}\}/g, booking.staff?.name ?? 'your therapist');
  }

  /**
   * Format appointment time for display
   */
  private formatAppointmentTime(date: Date): string {
    return new Intl.DateTimeFormat('en-NP', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}
