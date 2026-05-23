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
  Customer,
  Staff,
  Service,
  Booking,
} from '../../generated/prisma/client.js';

/**
 * Booking service for managing bookings.
 *
 * Best Practices:
 * - All queries include tenantId for RLS
 * - Transaction for create (Booking + BookingServices)
 * - Staff availability + conflict checking
 * - Audit logging for status changes
 */
@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all bookings with pagination, search, and filters.
   */
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

    // Build where clause
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

    // Build orderBy
    const orderBy: Prisma.BookingOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    // Execute query with count
    const [bookings, total] = await this.prisma.db.$transaction([
      this.prisma.db.booking.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          staff: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
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

  /**
   * Find a single booking by ID.
   */
  async findOne(id: string) {
    const tenantId = this.prisma.getTenantId();

    const booking = await this.prisma.db.booking.findFirst({
      where: { id, tenantId },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        staff: { select: { id: true, name: true, phone: true } },
        location: { select: { id: true, name: true, address: true } },
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

  /**
   * Create a new booking with services.
   */
  async create(dto: CreateBookingDto) {
    const tenantId = this.prisma.getTenantId();
    const startTime = new Date(dto.startTime);

    // 1. Verify customer exists
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

    // 2. Verify all services exist, active, and belong to tenant
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

    // 3. Calculate totalAmount and totalDuration
    const totalAmount = services.reduce((sum, s) => sum + s.price, 0);
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
    const endTime = new Date(startTime.getTime() + totalDuration * 60 * 1000);

    // 4. Verify staff exists if provided
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

      // 5. Check staff availability and conflicts
      await this.checkStaffAvailability(
        dto.staffId,
        startTime,
        endTime,
        tenantId,
      );
    }

    // 6. Create booking with services in transaction
    const booking = await this.prisma.db.$transaction(async (tx) => {
      // Create booking
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

      // Create booking services
      await tx.bookingService.createMany({
        data: services.map((service) => ({
          tenantId,
          bookingId: newBooking.id,
          serviceId: service.id,
          price: service.price,
          duration: service.duration,
        })),
      });

      // Log audit
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

    return this.findOne(booking.id);
  }

  /**
   * Update an existing booking.
   */
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

    // If changing staff or time, check conflicts
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

    // Build update data
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

    const booking = await this.prisma.db.booking.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Booking updated: ${id}`);

    return this.findOne(id);
  }

  /**
   * Update booking status only.
   */
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

    const previousStatus = existing.status;

    const booking = await this.prisma.db.$transaction(async (tx) => {
      // Update status
      const updated = await tx.booking.update({
        where: { id },
        data: { status },
      });

      // Audit log
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

      return updated;
    });

    this.logger.log(
      `Booking ${id} status changed: ${previousStatus} → ${status}`,
    );

    return this.findOne(id);
  }

  /**
   * Soft delete a booking.
   */
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

    await this.prisma.db.booking.delete({ where: { id } });

    this.logger.log(`Booking deleted: ${id}`);
  }

  /**
   * Get booking statistics for dashboard.
   */
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

  /**
   * Get calendar view of bookings.
   */
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
        location: { select: { id: true, name: true } },
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

  /**
   * Check staff availability and conflicts.
   */
  private async checkStaffAvailability(
    staffId: string,
    startTime: Date,
    endTime: Date,
    tenantId: string,
    excludeBookingId?: string,
  ) {
    // Check staff schedule for the day
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

    // Check regular schedule
    const schedule = await this.prisma.db.staffSchedule.findFirst({
      where: { staffId, dayOfWeek: { equals: dayOfWeek } },
    });

    // Check override
    const override = await this.prisma.db.staffScheduleOverride.findFirst({
      where: { staffId, date: startTime },
    });

    // If no schedule or override says not working
    if (
      (!schedule || !schedule.isWorking) &&
      (!override || !override.isWorking)
    ) {
      throw new BadRequestException({
        errorCode: 'STAFF_NOT_AVAILABLE',
        message: 'Staff member is not scheduled to work on this day',
      });
    }

    // Check for conflicting bookings
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

  /**
   * Transform booking to response format.
   */
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
}
