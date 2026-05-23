import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateStaffDto } from './dto/create-staff.dto.js';
import type { UpdateStaffDto } from './dto/update-staff.dto.js';
import type { SetStaffScheduleDto } from './dto/set-staff-schedule.dto.js';
import type { CreateScheduleOverrideDto } from './dto/create-schedule-override.dto.js';

/**
 * StaffService
 *
 * Staff management business logic:
 * - Staff CRUD (create, read, update, soft delete)
 * - Weekly schedule management (bulk upsert)
 * - Schedule overrides (specific date exceptions)
 */
@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Staff CRUD ────────────────────────────────────────────────────────────

  /**
   * Tenant ke saare active staff members list karta hai.
   * isActive: false wale by default exclude hote hain.
   */
  async findAll(tenantId: string, includeInactive = false) {
    return this.prisma.db.staff.findMany({
      where: {
        tenantId,
        ...(!includeInactive && { isActive: true }),
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        locationId: true,
        userId: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  /**
   * Staff member by ID — tenant check ke saath.
   */
  async findById(tenantId: string, staffId: string) {
    const staff = await this.prisma.db.staff.findFirst({
      where: { id: staffId, tenantId },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found.');
    }

    return staff;
  }

  /**
   * Naya staff member create karta hai.
   * Agar locationId diya toh verify karta hai ki wo is tenant ki hai.
   */
  async create(tenantId: string, dto: CreateStaffDto) {
    // Location verify karo agar diya hai
    if (dto.locationId) {
      const location = await this.prisma.db.location.findFirst({
        where: { id: dto.locationId, tenantId },
      });
      if (!location) {
        throw new NotFoundException(
          'Location not found or does not belong to this tenant.',
        );
      }
    }

    const staff = await this.prisma.db.staff.create({
      data: {
        tenantId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        locationId: dto.locationId,
        userId: dto.userId,
        isActive: dto.isActive ?? true,
      },
    });

    this.logger.log(
      `Staff created: ${staff.id} for tenant: ${tenantId}`,
      'StaffService',
    );

    return staff;
  }

  /**
   * Staff member update karta hai.
   */
  async update(tenantId: string, staffId: string, dto: UpdateStaffDto) {
    // Exist check
    await this.findById(tenantId, staffId);

    // Location verify karo agar change ho rahi hai
    if (dto.locationId) {
      const location = await this.prisma.db.location.findFirst({
        where: { id: dto.locationId, tenantId },
      });
      if (!location) {
        throw new NotFoundException(
          'Location not found or does not belong to this tenant.',
        );
      }
    }

    const updated = await this.prisma.db.staff.update({
      where: { id: staffId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.locationId !== undefined && { locationId: dto.locationId }),
        ...(dto.userId !== undefined && { userId: dto.userId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.logger.log(`Staff updated: ${staffId}`, 'StaffService');
    return updated;
  }

  /**
   * Staff member soft delete karta hai.
   */
  async remove(tenantId: string, staffId: string) {
    await this.findById(tenantId, staffId);

    await this.prisma.db.staff.delete({ where: { id: staffId } });

    this.logger.log(`Staff deleted: ${staffId}`, 'StaffService');
    return { message: 'Staff member successfully removed.' };
  }

  // ── Schedule ─────────────────────────────────────────────────────────────

  /**
   * Staff ki weekly recurring schedule return karta hai.
   */
  async getSchedule(tenantId: string, staffId: string) {
    await this.findById(tenantId, staffId);

    return this.prisma.db.staffSchedule.findMany({
      where: { tenantId, staffId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  /**
   * Staff ki weekly schedule set karta hai — full replacement.
   * Transaction mein delete all + create all.
   */
  async setSchedule(
    tenantId: string,
    staffId: string,
    dto: SetStaffScheduleDto,
  ) {
    await this.findById(tenantId, staffId);

    // Duplicate day check
    const days = dto.schedule.map((s) => s.dayOfWeek);
    const uniqueDays = new Set(days);
    if (uniqueDays.size !== days.length) {
      throw new BadRequestException(
        'Duplicate days found in schedule. Har din sirf ek baar hona chahiye.',
      );
    }

    // Transaction — delete + create atomically
    await this.prisma.db.$transaction([
      this.prisma.db.staffSchedule.deleteMany({
        where: { tenantId, staffId },
      }),
      this.prisma.db.staffSchedule.createMany({
        data: dto.schedule.map((item) => ({
          tenantId,
          staffId,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          isWorking: item.isWorking,
        })),
      }),
    ]);

    this.logger.log(`Schedule updated for staff: ${staffId}`, 'StaffService');
    return this.getSchedule(tenantId, staffId);
  }

  // ── Overrides ─────────────────────────────────────────────────────────────

  /**
   * Staff ke schedule overrides list karta hai.
   * Future overrides only by default.
   */
  async getOverrides(tenantId: string, staffId: string) {
    await this.findById(tenantId, staffId);

    return this.prisma.db.staffScheduleOverride.findMany({
      where: {
        tenantId,
        staffId,
        date: { gte: new Date() }, // Sirf future/today ke overrides
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Specific date ke liye schedule override create karta hai.
   * Agar us date pe already override hai toh upsert karta hai.
   */
  async createOverride(
    tenantId: string,
    staffId: string,
    dto: CreateScheduleOverrideDto,
  ) {
    await this.findById(tenantId, staffId);

    // isWorking: true pe startTime aur endTime required
    if (dto.isWorking && (!dto.startTime || !dto.endTime)) {
      throw new BadRequestException(
        'isWorking: true pe startTime aur endTime required hain.',
      );
    }

    const date = new Date(dto.date);

    // Upsert — same date pe dobara set karna allowed hai
    const override = await this.prisma.db.staffScheduleOverride.upsert({
      where: { staffId_date: { staffId, date } },
      create: {
        tenantId,
        staffId,
        date,
        isWorking: dto.isWorking,
        startTime: dto.startTime,
        endTime: dto.endTime,
        reason: dto.reason,
      },
      update: {
        isWorking: dto.isWorking,
        startTime: dto.startTime ?? null,
        endTime: dto.endTime ?? null,
        reason: dto.reason ?? null,
      },
    });

    this.logger.log(
      `Override created/updated for staff: ${staffId} on date: ${dto.date}`,
      'StaffService',
    );

    return override;
  }

  /**
   * Specific override delete karta hai.
   */
  async removeOverride(tenantId: string, staffId: string, overrideId: string) {
    await this.findById(tenantId, staffId);

    const override = await this.prisma.db.staffScheduleOverride.findFirst({
      where: { id: overrideId, tenantId, staffId },
    });

    if (!override) {
      throw new NotFoundException('Override not found.');
    }

    await this.prisma.db.staffScheduleOverride.delete({
      where: { id: overrideId },
    });

    return { message: 'Override successfully removed.' };
  }
}
