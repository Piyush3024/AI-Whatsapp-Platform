import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserRole } from '../../generated/prisma/client.js';
import type { UpdateTenantDto } from './dto/update-tenant.dto.js';
import type { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import type { CreateLocationDto } from './dto/create-location.dto.js';
import type { UpdateLocationDto } from './dto/update-location.dto.js';
import type { SetBusinessHoursDto } from './dto/set-business-hours.dto.js';

/**
 * TenantService
 *
 * Saari tenant management business logic yahan hai:
 * - Tenant info get/update
 * - Member management (list, role change, remove)
 * - Location CRUD
 * - Business hours bulk upsert
 *
 * RLS automatically handle ho raha hai PrismaService mein —
 * yahan explicitly tenantId filter karna zaroori nahi for tenant-scoped tables.
 * Lekin hum explicitly daalte hain clarity ke liye.
 */
@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Tenant ───────────────────────────────────────────────────────────────

  /**
   * Current tenant ki full info return karta hai.
   */
  async getTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    return tenant;
  }

  /**
   * Tenant settings update karta hai.
   * Sirf OWNER aur ADMIN kar sakte hain.
   */
  async updateTenant(tenantId: string, dto: UpdateTenantDto) {
    // Tenant exist karta hai? (RLS already ensure karta hai but explicit check better hai)
    await this.getTenant(tenantId);

    const updated = await this.prisma.db.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.settings && { settings: dto.settings }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        settings: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Tenant updated: ${tenantId}`, 'TenantService');

    return updated;
  }

  // ── Members ───────────────────────────────────────────────────────────────

  /**
   * Tenant ke saare active members list karta hai.
   */
  async getMembers(tenantId: string) {
    return this.prisma.db.tenantMember.findMany({
      where: { tenantId },
      select: {
        id: true,
        role: true,
        status: true,
        createdAt: true,
        userId: true,
      },
    });
  }

  /**
   * Member ka role change karta hai.
   * Sirf OWNER kar sakta hai.
   * OWNER apna khud ka role change nahi kar sakta — tenant orphan ho jaayega.
   */
  async updateMemberRole(
    tenantId: string,
    requestingUserId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    // Apna role change karna allowed nahi
    if (requestingUserId === targetUserId) {
      throw new BadRequestException(
        'Aap apna khud ka role change nahi kar sakte.',
      );
    }

    // Target member exist karta hai?
    const member = await this.prisma.db.tenantMember.findFirst({
      where: { tenantId, userId: targetUserId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this tenant.');
    }

    // Ek tenant mein sirf ek OWNER ho sakta hai
    if (dto.role === UserRole.OWNER) {
      throw new BadRequestException(
        'Tenant mein sirf ek OWNER ho sakta hai. Pehle current OWNER ka role change karo.',
      );
    }

    const updated = await this.prisma.db.tenantMember.update({
      where: { id: member.id },
      data: { role: dto.role },
      select: { id: true, role: true, userId: true, updatedAt: true },
    });

    this.logger.log(
      `Member role updated — userId: ${targetUserId}, newRole: ${dto.role}`,
      'TenantService',
    );

    return updated;
  }

  /**
   * Member ko tenant se remove karta hai (soft delete).
   * OWNER ko remove nahi kar sakte.
   * Apne aap ko remove nahi kar sakte.
   */
  async removeMember(
    tenantId: string,
    requestingUserId: string,
    targetUserId: string,
  ) {
    if (requestingUserId === targetUserId) {
      throw new BadRequestException(
        'Aap khud ko tenant se remove nahi kar sakte.',
      );
    }

    const member = await this.prisma.db.tenantMember.findFirst({
      where: { tenantId, userId: targetUserId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this tenant.');
    }

    if (member.role === UserRole.OWNER) {
      throw new ForbiddenException('OWNER ko tenant se remove nahi kar sakte.');
    }

    // Soft delete — deletedAt set ho jaata hai
    await this.prisma.db.tenantMember.delete({
      where: { id: member.id },
    });

    this.logger.log(
      `Member removed — userId: ${targetUserId} from tenant: ${tenantId}`,
      'TenantService',
    );

    return { message: 'Member successfully removed.' };
  }

  // ── Locations ─────────────────────────────────────────────────────────────

  /**
   * Tenant ki saari locations return karta hai.
   */
  async getLocations(tenantId: string) {
    return this.prisma.db.location.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Location by ID — tenant check ke saath.
   */
  async getLocationById(tenantId: string, locationId: string) {
    const location = await this.prisma.db.location.findFirst({
      where: { id: locationId, tenantId },
    });

    if (!location) {
      throw new NotFoundException('Location not found.');
    }

    return location;
  }

  /**
   * Naya location create karta hai.
   * Agar isDefault: true diya aur pehle se ek default hai —
   * purana default ko unset kar deta hai (sirf ek default allowed).
   */
  async createLocation(tenantId: string, dto: CreateLocationDto) {
    // Agar ye default bana rahe ho toh purana default unset karo
    if (dto.isDefault) {
      await this.prisma.db.location.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const location = await this.prisma.db.location.create({
      data: {
        tenantId,
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
        isDefault: dto.isDefault ?? false,
      },
    });

    this.logger.log(
      `Location created: ${location.id} for tenant: ${tenantId}`,
      'TenantService',
    );

    return location;
  }

  /**
   * Location update karta hai.
   */
  async updateLocation(
    tenantId: string,
    locationId: string,
    dto: UpdateLocationDto,
  ) {
    // Exist check
    await this.getLocationById(tenantId, locationId);

    // Default update — purana unset karo pehle
    if (dto.isDefault === true) {
      await this.prisma.db.location.updateMany({
        where: { tenantId, isDefault: true, NOT: { id: locationId } },
        data: { isDefault: false },
      });
    }

    return this.prisma.db.location.update({
      where: { id: locationId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });
  }

  /**
   * Location soft delete karta hai.
   * Default location delete nahi ho sakti — pehle doosri location ko default banao.
   */
  async deleteLocation(tenantId: string, locationId: string) {
    const location = await this.getLocationById(tenantId, locationId);

    if (location.isDefault) {
      throw new BadRequestException(
        'Default location delete nahi ho sakti. Pehle kisi aur location ko default banao.',
      );
    }

    await this.prisma.db.location.delete({
      where: { id: locationId },
    });

    this.logger.log(
      `Location deleted: ${locationId} for tenant: ${tenantId}`,
      'TenantService',
    );

    return { message: 'Location successfully deleted.' };
  }

  // ── Business Hours ────────────────────────────────────────────────────────

  /**
   * Location ke business hours fetch karta hai.
   */
  async getBusinessHours(tenantId: string, locationId: string) {
    // Location exist check
    await this.getLocationById(tenantId, locationId);

    return this.prisma.db.locationBusinessHour.findMany({
      where: { tenantId, locationId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  /**
   * Business hours bulk upsert — PUT pattern.
   * Saare days ek saath set karo.
   * Existing hours replace ho jaate hain.
   *
   * Prisma transaction mein karta hai — partial update nahi hoga.
   */
  async setBusinessHours(
    tenantId: string,
    locationId: string,
    dto: SetBusinessHoursDto,
  ) {
    // Location exist check
    await this.getLocationById(tenantId, locationId);

    // Transaction mein — delete all + create all
    await this.prisma.$transaction(async (tx) => {
      // Pehle saare existing hours delete karo
      await tx.locationBusinessHour.deleteMany({
        where: { tenantId, locationId },
      });

      // Phir naaye hours create karo
      await tx.locationBusinessHour.createMany({
        data: dto.hours.map((hour) => ({
          tenantId,
          locationId,
          dayOfWeek: hour.dayOfWeek,
          openTime: hour.openTime,
          closeTime: hour.closeTime,
          isOpen: hour.isOpen,
        })),
      });
    });

    this.logger.log(
      `Business hours updated for location: ${locationId}`,
      'TenantService',
    );

    // Updated hours return karo
    return this.getBusinessHours(tenantId, locationId);
  }
}
