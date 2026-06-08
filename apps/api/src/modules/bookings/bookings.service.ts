import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateBookingDto,
  UpdateBookingDto,
  BookingQueryDto,
  BookingSortBy,
  SortOrder,
} from './dto/index.js';
import {
  BookingStatus,
  BookingSource,
  Prisma,
  Service,
} from '@whatsapp-ai/db/generated/prisma';
import { RemindersService } from '../reminders/reminders.service.js';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../constants/queues.js';
import type { FollowUpJob } from '../../constants/job-payloads.js';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly remindersService: RemindersService,
    @InjectQueue(QUEUE_NAMES.FOLLOW_UPS) private readonly followUpsQueue: Queue,
  ) {}

  async findAll(query: BookingQueryDto) {
    const {
      page = 1,
      limit = 20,
      status,
      staffId,
      customerId,
      locationId,
      source,
      dateFrom,
      dateTo,
      sortBy = BookingSortBy.START_TIME,
      sortOrder = SortOrder.ASC,
    } = query;

    const skip = (page - 1) * limit;
    const tenantId = this.prisma.getTenantId();

    const where: Prisma.BookingWhereInput = { tenantId };

    if (status) where.status = status;
    if (staffId) where.staffId = staffId;
    if (customerId) where.customerId = customerId;
    if (locationId) where.locationId = locationId;
    if (source) where.source = source;

    if (dateFrom || dateTo) {
      where.startTime = {};
      if (dateFrom) where.startTime.gte = new Date(dateFrom);
      if (dateTo) where.startTime.lte = new Date(dateTo);
    }

    const orderBy: Prisma.BookingOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    const [bookings, total] = await this.prisma.db.$transaction([
      this.prisma.db.booking.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          customer: {
            select: { id: true, name: true, phone: true },
          },
          staff: {
            select: { id: true, name: true },
          },
          location: {
            select: { id: true, name: true },
          },
          services: {
            include: {
              service: {
                select: { id: true, name: true, price: true, duration: true },
              },
            },
          },
        },
      }),
      this.prisma.db.booking.count({ where }),
    ]);

    return {
      items: bookings.map((b) => this.transformBooking(b)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const tenantId = this.prisma.getTenantId();

    const booking = await this.prisma.db.booking.findFirst({
      where: { id, tenantId },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        staff: {
          select: { id: true, name: true, phone: true },
        },
        location: {
          select: { id: true, name: true, address: true },
        },
        services: {
          include: {
            service: {
              select: { id: true, name: true, price: true, duration: true },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException({
        errorCode: 'BOOKING_NOT_FOUND',
        message: `Booking with ID ${id} not found`,
      });
    }

    return this.transformBooking(booking);
  }

  async create(dto: CreateBookingDto) {
    const tenantId = this.prisma.getTenantId();
    const startTime = new Date(dto.startTime);

    const customer = await this.prisma.db.customer.findFirst({
      where: { id: dto.customerId, tenantId },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException({
        errorCode: 'CUSTOMER_NOT_FOUND',
        message: 'Customer not found',
      });
    }

    const services = await this.prisma.db.service.findMany({
      where: {
        id: { in: dto.serviceIds },
        tenantId,
        isActive: true,
      },
      select: { id: true, name: true, price: true, duration: true },
    });

    if (services.length !== dto.serviceIds.length) {
      const foundIds = services.map((s) => s.id);
      const missingIds = dto.serviceIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException({
        errorCode: 'INVALID_SERVICE_IDS',
        message: 'One or more services not found or inactive',
        metadata: { missingServiceIds: missingIds },
      });
    }

    const totalAmount = services.reduce((sum, s) => sum + s.price, 0);
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
    const endTime = new Date(startTime.getTime() + totalDuration * 60 * 1000);

    if (dto.staffId) {
      const staff = await this.prisma.db.staff.findFirst({
        where: { id: dto.staffId, tenantId, isActive: true },
        select: { id: true },
      });

      if (!staff) {
        throw new NotFoundException({
          errorCode: 'STAFF_NOT_FOUND',
          message: 'Staff member not found or inactive',
        });
      }

      await this.checkStaffAvailability(
        dto.staffId,
        startTime,
        endTime,
        tenantId,
      );
    }

    const booking = await this.prisma.db.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          tenantId,
          customerId: dto.customerId,
          staffId: dto.staffId,
          locationId: dto.locationId,
          startTime,
          endTime,
          status: BookingStatus.PENDING,
          source: dto.source ?? BookingSource.WHATSAPP,
          notes: dto.notes,
          totalAmount,
          currency: 'NPR',
        },
      });

      await tx.bookingService.createMany({
        data: services.map((service) => ({
          tenantId,
          bookingId: newBooking.id,
          serviceId: service.id,
          price: service.price,
          duration: service.duration,
        })),
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'CREATED',
          resource: 'Booking',
          resourceId: newBooking.id,
          metadata: { source: dto.source ?? BookingSource.WHATSAPP },
        },
      });

      return newBooking;
    });

    this.logger.log(
      `Booking created: ${booking.id} for customer: ${dto.customerId}`,
    );

    await this.remindersService.scheduleRemindersForBooking(booking.id);

    return this.findOne(booking.id);
  }

  async update(id: string, dto: UpdateBookingDto) {
    const tenantId = this.prisma.getTenantId();

    const existing = await this.prisma.db.booking.findFirst({
      where: { id, tenantId },
      select: { id: true, startTime: true, endTime: true, staffId: true },
    });

    if (!existing) {
      throw new NotFoundException({
        errorCode: 'BOOKING_NOT_FOUND',
        message: `Booking with ID ${id} not found`,
      });
    }

    if (
      dto.startTime &&
      existing &&
      new Date(dto.startTime).getTime() !== existing.startTime.getTime()
    ) {
      await this.remindersService.scheduleRemindersForBooking(id);
    }

    if (dto.staffId || dto.startTime) {
      const newStaffId = dto.staffId ?? existing.staffId;
      const newStartTime = dto.startTime
        ? new Date(dto.startTime)
        : existing.startTime;

      if (newStaffId) {
        await this.checkStaffAvailability(
          newStaffId,
          newStartTime,
          existing.endTime,
          tenantId,
          id,
        );
      }
    }

    const updateData: Prisma.BookingUpdateInput = {};

    if (dto.staffId !== undefined) {
      updateData.staff = { connect: { id: dto.staffId } };
    }

    if (dto.locationId !== undefined) {
      updateData.location = { connect: { id: dto.locationId } };
    }

    if (dto.startTime !== undefined) {
      updateData.startTime = new Date(dto.startTime);
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    await this.prisma.db.booking.update({
      where: { id, tenantId },
      data: updateData,
    });

    this.logger.log(`Booking updated: ${id}`);

    return this.findOne(id);
  }

  async updateStatus(id: string, status: BookingStatus) {
    const tenantId = this.prisma.getTenantId();

    const existing = await this.prisma.db.booking.findFirst({
      where: { id, tenantId },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new NotFoundException({
        errorCode: 'BOOKING_NOT_FOUND',
        message: `Booking with ID ${id} not found`,
      });
    }

    if (status === BookingStatus.CANCELLED) {
      await this.remindersService.cancelRemindersForBooking(id);
    }

    if (status === BookingStatus.COMPLETED) {
      await this.scheduleFollowUps(id, tenantId);
    }

    const previousStatus = existing.status;

    await this.prisma.db.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id, tenantId },
        data: { status },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'UPDATED',
          resource: 'Booking',
          resourceId: id,
          metadata: {
            previousStatus,
            newStatus: status,
            field: 'status',
          },
        },
      });
    });

    this.logger.log(
      `Booking ${id} status changed: ${previousStatus} → ${status}`,
    );

    return this.findOne(id);
  }

  async remove(id: string) {
    const tenantId = this.prisma.getTenantId();

    const booking = await this.prisma.db.booking.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!booking) {
      throw new NotFoundException({
        errorCode: 'BOOKING_NOT_FOUND',
        message: `Booking with ID ${id} not found`,
      });
    }

    await this.prisma.db.booking.delete({ where: { id, tenantId } });

    this.logger.log(`Booking deleted: ${id}`);
  }

  async getStats() {
    const tenantId = this.prisma.getTenantId();
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      total,
      pending,
      confirmed,
      completed,
      cancelled,
      todayCount,
      weekCount,
    ] = await this.prisma.db.$transaction([
      this.prisma.db.booking.count({ where: { tenantId } }),
      this.prisma.db.booking.count({
        where: { tenantId, status: BookingStatus.PENDING },
      }),
      this.prisma.db.booking.count({
        where: { tenantId, status: BookingStatus.CONFIRMED },
      }),
      this.prisma.db.booking.count({
        where: { tenantId, status: BookingStatus.COMPLETED },
      }),
      this.prisma.db.booking.count({
        where: { tenantId, status: BookingStatus.CANCELLED },
      }),
      this.prisma.db.booking.count({
        where: {
          tenantId,
          startTime: {
            gte: startOfToday,
            lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.db.booking.count({
        where: {
          tenantId,
          startTime: { gte: startOfWeek },
        },
      }),
    ]);

    return {
      total,
      pending,
      confirmed,
      completed,
      cancelled,
      todayBookings: todayCount,
      weekBookings: weekCount,
    };
  }

  async getCalendar(query: {
    dateFrom: string;
    dateTo: string;
    staffId?: string;
    locationId?: string;
  }) {
    const tenantId = this.prisma.getTenantId();
    const dateFrom = new Date(query.dateFrom);
    const dateTo = new Date(query.dateTo);

    const where: Prisma.BookingWhereInput = {
      tenantId,
      startTime: { gte: dateFrom },
      endTime: { lte: dateTo },
    };

    if (query.staffId) where.staffId = query.staffId;
    if (query.locationId) where.locationId = query.locationId;

    const bookings = await this.prisma.db.booking.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        staff: { select: { id: true, name: true } },
        location: {
          select: { id: true, name: true },
        },
        services: {
          include: {
            service: {
              select: { id: true, name: true, price: true, duration: true },
            },
          },
        },
      },
    });

    return {
      items: bookings.map((b) => this.transformBooking(b)),
      meta: { total: bookings.length },
    };
  }

  private async checkStaffAvailability(
    staffId: string,
    startTime: Date,
    endTime: Date,
    tenantId: string,
    excludeBookingId?: string,
  ) {
    type DayOfWeekKey =
      | 'SUNDAY'
      | 'MONDAY'
      | 'TUESDAY'
      | 'WEDNESDAY'
      | 'THURSDAY'
      | 'FRIDAY'
      | 'SATURDAY';
    const dayOfWeekKeys: DayOfWeekKey[] = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];
    const dayOfWeek = dayOfWeekKeys[startTime.getDay()];

    const schedule = await this.prisma.db.staffSchedule.findFirst({
      where: { staffId, dayOfWeek: { equals: dayOfWeek } },
    });

    const override = await this.prisma.db.staffScheduleOverride.findFirst({
      where: { staffId, date: startTime },
    });
    if (
      (!schedule || !schedule.isWorking) &&
      (!override || !override.isWorking)
    ) {
      throw new BadRequestException({
        errorCode: 'STAFF_NOT_AVAILABLE',
        message: 'Staff member is not scheduled to work on this day',
      });
    }

    const conflictWhere: Prisma.BookingWhereInput = {
      staffId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      OR: [
        {
          startTime: { lte: startTime },
          endTime: { gt: startTime },
        },
        {
          startTime: { lt: endTime },
          endTime: { gte: endTime },
        },
        {
          startTime: { gte: startTime },
          endTime: { lte: endTime },
        },
      ],
    };

    const conflict = await this.prisma.db.booking.findFirst({
      where: conflictWhere,
      select: { id: true, startTime: true, endTime: true },
    });

    if (conflict) {
      throw new ConflictException({
        errorCode: 'BOOKING_CONFLICT',
        message: 'Staff member already has a booking during this time',
        metadata: {
          conflictingBookingId: conflict.id,
          conflictingStartTime: conflict.startTime,
          conflictingEndTime: conflict.endTime,
        },
      });
    }
  }

  private transformBooking(booking: Record<string, unknown>) {
    const services =
      (booking.services as Array<{
        service: Service;
        price: number;
        duration: number;
      }>) ?? [];

    return {
      id: booking.id,
      tenantId: booking.tenantId,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      source: booking.source,
      notes: booking.notes,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      customer: booking.customer,
      staff: booking.staff,
      location: booking.location,
      services: services.map((bs) => ({
        id: bs.service.id,
        name: bs.service.name,
        price: bs.price,
        duration: bs.duration,
      })),
    };
  }

  private async scheduleFollowUps(
    bookingId: string,
    tenantId: string,
  ): Promise<void> {
    const booking = await this.prisma.db.booking.findFirst({
      where: { id: bookingId, tenantId },
      include: {
        customer: {
          select: { id: true, phone: true, name: true, optInStatus: true },
        },
        services: {
          include: {
            service: { select: { name: true } },
          },
        },
      },
    });

    if (!booking || !booking.customer) return;

    if (booking.customer.optInStatus === 'OPTED_OUT') {
      this.logger.log(
        `Follow-up skipped — customer opted out: ${booking.customer.id}`,
      );
      return;
    }

    const serviceNames = booking.services
      .map((bs) => bs.service.name)
      .join(', ');

    const customerName = booking.customer.name ?? 'valued customer';

    const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    const baseJob: Omit<FollowUpJob, 'followUpType' | 'messageBody'> = {
      tenantId,
      bookingId,
      customerId: booking.customer.id,
      customerPhone: booking.customer.phone,
    };

    await this.followUpsQueue.add(
      'send-follow-up',
      {
        ...baseJob,
        followUpType: 'post_appointment',
        messageBody: `Hi ${customerName}! Thank you for visiting us today for ${serviceNames}. We hope you had a great experience. How was your service? 😊`,
      } satisfies FollowUpJob,
      {
        delay: FOUR_HOURS_MS,
        jobId: `follow-up-post-${bookingId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: { age: 24 * 3600 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    );

    await this.followUpsQueue.add(
      'send-follow-up',
      {
        ...baseJob,
        followUpType: 're_booking',
        messageBody: `Hi ${customerName}! It's been a month since your last visit. We'd love to see you again! Book your next appointment by replying to this message. 📅`,
      } satisfies FollowUpJob,
      {
        delay: THIRTY_DAYS_MS,
        jobId: `follow-up-rebooking-${bookingId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: { age: 24 * 3600 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    );

    this.logger.log(`Follow-ups scheduled for booking: ${bookingId}`);
  }

  async exportCsv(query: BookingQueryDto): Promise<string> {
    const tenantId = this.prisma.getTenantId();

    const where: Prisma.BookingWhereInput = { tenantId };

    if (query.status) where.status = query.status;
    if (query.staffId) where.staffId = query.staffId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.locationId) where.locationId = query.locationId;
    if (query.source) where.source = query.source;

    if (query.dateFrom || query.dateTo) {
      where.startTime = {};
      if (query.dateFrom) where.startTime.gte = new Date(query.dateFrom);
      if (query.dateTo) where.startTime.lte = new Date(query.dateTo);
    }

    const bookings = await this.prisma.db.booking.findMany({
      where,
      orderBy: { startTime: 'asc' },
      // Cap at 10,000 rows for safety
      take: 10_000,
      include: {
        customer: {
          select: { name: true, phone: true, email: true },
        },
        staff: { select: { name: true } },
        location: { select: { name: true } },
        services: {
          include: {
            service: {
              select: { name: true, price: true },
            },
          },
        },
      },
    });

    const headers = [
      'ID',
      'Status',
      'Source',
      'Customer Name',
      'Customer Phone',
      'Customer Email',
      'Staff',
      'Location',
      'Services',
      'Total Amount (Rs.)',
      'Start Time',
      'End Time',
      'Notes',
      'Created At',
    ];

    const escape = (value: string | null | undefined): string => {
      if (value == null) return '';
      // Wrap in quotes and escape internal quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    };

    const rows = bookings.map((b) => {
      const services = b.services.map((bs) => bs.service.name).join('; ');

      return [
        escape(b.id),
        escape(b.status),
        escape(b.source),
        escape(b.customer?.name),
        escape(b.customer?.phone),
        escape(b.customer?.email),
        escape(b.staff?.name),
        escape(b.location?.name),
        escape(services),
        escape(b.totalAmount != null ? (b.totalAmount / 100).toFixed(2) : null),
        escape(b.startTime.toISOString()),
        escape(b.endTime.toISOString()),
        escape(b.notes),
        escape(b.createdAt.toISOString()),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
