import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsageLimitService } from '../billing/usage-limit.service.js';
import { UserRole } from '@whatsapp-ai/db/generated/prisma';
import type { UpdateTenantDto } from './dto/update-tenant.dto.js';
import type { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import type { CreateLocationDto } from './dto/create-location.dto.js';
import type { UpdateLocationDto } from './dto/update-location.dto.js';
import type { SetBusinessHoursDto } from './dto/set-business-hours.dto.js';
import type { UpsertAiPromptDto } from './dto/upsert-ai-prompt.dto.js';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usageLimitService: UsageLimitService,
  ) {}

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

  async updateTenant(tenantId: string, dto: UpdateTenantDto) {
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

  async updateMemberRole(
    tenantId: string,
    requestingUserId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    if (requestingUserId === targetUserId) {
      throw new BadRequestException('You cannot change your own role.');
    }

    const member = await this.prisma.db.tenantMember.findFirst({
      where: { tenantId, userId: targetUserId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this tenant.');
    }

    if (dto.role === UserRole.OWNER) {
      throw new BadRequestException(
        "Only one owner can exist in a tenant. Change the current owner's role first.",
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

  async removeMember(
    tenantId: string,
    requestingUserId: string,
    targetUserId: string,
  ) {
    if (requestingUserId === targetUserId) {
      throw new BadRequestException(
        'You cannot remove yourself from the tenant.',
      );
    }

    const member = await this.prisma.db.tenantMember.findFirst({
      where: { tenantId, userId: targetUserId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this tenant.');
    }

    if (member.role === UserRole.OWNER) {
      throw new ForbiddenException(
        'You cannot remove an owner from the tenant.',
      );
    }

    await this.prisma.db.tenantMember.delete({
      where: { id: member.id },
    });

    this.logger.log(
      `Member removed — userId: ${targetUserId} from tenant: ${tenantId}`,
      'TenantService',
    );

    return { message: 'Member successfully removed.' };
  }

  async getLocations(tenantId: string) {
    return this.prisma.db.location.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getLocationById(tenantId: string, locationId: string) {
    const location = await this.prisma.db.location.findFirst({
      where: { id: locationId, tenantId },
    });

    if (!location) {
      throw new NotFoundException('Location not found.');
    }

    return location;
  }

  async createLocation(tenantId: string, dto: CreateLocationDto) {
    await this.usageLimitService.assertLimit(tenantId, 'maxLocations');

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

  async updateLocation(
    tenantId: string,
    locationId: string,
    dto: UpdateLocationDto,
  ) {
    await this.getLocationById(tenantId, locationId);

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

  async deleteLocation(tenantId: string, locationId: string) {
    const location = await this.getLocationById(tenantId, locationId);

    if (location.isDefault) {
      throw new BadRequestException(
        'Default location cannot be deleted. Set another location as default first.',
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

  async getBusinessHours(tenantId: string, locationId: string) {
    await this.getLocationById(tenantId, locationId);

    return this.prisma.db.locationBusinessHour.findMany({
      where: { tenantId, locationId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async setBusinessHours(
    tenantId: string,
    locationId: string,
    dto: SetBusinessHoursDto,
  ) {
    await this.getLocationById(tenantId, locationId);

    await this.prisma.$transaction(async (tx) => {
      await tx.locationBusinessHour.deleteMany({
        where: { tenantId, locationId },
      });

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

    return this.getBusinessHours(tenantId, locationId);
  }

  async getAuditLogs(
    tenantId: string,
    query: {
      page?: number;
      limit?: number;
      action?: string;
      userId?: string;
      from?: string;
      to?: string;
    },
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };

    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          metadata: true,
          ipAddress: true,
          userAgent: true,
          userId: true,
          createdAt: true,
        },
      }),
      this.prisma.db.auditLog.count({ where }),
    ]);

    const userIds = [
      ...new Set(items.map((i) => i.userId).filter(Boolean)),
    ] as string[];
    const users =
      userIds.length > 0
        ? await this.prisma.db.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true },
          })
        : [];

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    return {
      items: items.map((log) => ({
        ...log,
        user: log.userId ? (userMap[log.userId] ?? null) : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAiPrompts(tenantId: string) {
    return this.prisma.db.tenantAIPrompt.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ language: 'asc' }, { version: 'desc' }],
      select: {
        id: true,
        persona: true,
        systemPrompt: true,
        language: true,
        isActive: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async upsertAiPrompt(tenantId: string, dto: UpsertAiPromptDto) {
    const language = dto.language ?? 'auto';

    const existing = await this.prisma.db.tenantAIPrompt.findFirst({
      where: { tenantId, language, deletedAt: null },
      select: { id: true, version: true },
    });

    if (existing) {
      const updated = await this.prisma.db.tenantAIPrompt.update({
        where: { id: existing.id },
        data: {
          persona: dto.persona,
          systemPrompt: dto.systemPrompt,
          isActive: dto.isActive ?? true,
          version: { increment: 1 },
        },
        select: {
          id: true,
          persona: true,
          systemPrompt: true,
          language: true,
          isActive: true,
          version: true,
          updatedAt: true,
        },
      });

      this.logger.log(
        `AI prompt updated for tenant: ${tenantId}, language: ${language}`,
      );

      return updated;
    }

    const created = await this.prisma.db.tenantAIPrompt.create({
      data: {
        tenantId,
        persona: dto.persona,
        systemPrompt: dto.systemPrompt,
        language,
        isActive: dto.isActive ?? true,
        version: 1,
      },
      select: {
        id: true,
        persona: true,
        systemPrompt: true,
        language: true,
        isActive: true,
        version: true,
        createdAt: true,
      },
    });

    this.logger.log(
      `AI prompt created for tenant: ${tenantId}, language: ${language}`,
    );

    return created;
  }

  async deleteAiPrompt(tenantId: string, promptId: string) {
    const prompt = await this.prisma.db.tenantAIPrompt.findFirst({
      where: { id: promptId, tenantId, deletedAt: null },
      select: { id: true, language: true },
    });

    if (!prompt) {
      throw new NotFoundException('AI prompt not found.');
    }

    if (prompt.language === 'auto') {
      throw new BadRequestException(
        'The default (auto) prompt cannot be deleted. Update it instead.',
      );
    }

    await this.prisma.db.tenantAIPrompt.update({
      where: { id: promptId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`AI prompt deleted: ${promptId} for tenant: ${tenantId}`);

    return { message: 'AI prompt deleted successfully.' };
  }
}
