import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { InjectQueue } from '@nestjs/bullmq';
import { parsePhoneToE164 } from '../../lib/phone.util.js';
import type { Queue } from 'bullmq';
import {
  CreateWhatsAppNumberDto,
  UpdateWhatsAppNumberDto,
  QueryWhatsAppNumberDto,
} from './dto/index.js';
import {
  Prisma,
  WhatsAppVerificationStatus,
} from '@whatsapp-ai/db/generated/prisma';

@Injectable()
export class WhatsAppNumberService {
  private readonly logger = new Logger(WhatsAppNumberService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue('whatsapp-outbound') private readonly outboundQueue: Queue,
  ) {}

  async create(
    dto: CreateWhatsAppNumberDto,
    tenantId: string,
  ): Promise<Prisma.WhatsAppNumberGetPayload<object>> {
    let phoneE164: string;
    try {
      const parsed = parsePhoneToE164(dto.phoneNumber);
      phoneE164 = parsed.e164;
    } catch {
      throw new BadRequestException(
        `Invalid phone number: ${dto.phoneNumber}. Please use E.164 format (e.g., +9779801234567)`,
      );
    }

    const existing = await this.prisma.db.whatsAppNumber.findUnique({
      where: { phoneNumber: phoneE164 },
    });

    if (existing) {
      throw new ConflictException(
        'This WhatsApp number is already registered on our platform',
      );
    }

    if (dto.locationId) {
      const location = await this.prisma.db.location.findUnique({
        where: { id: dto.locationId },
      });
      if (!location) {
        throw new NotFoundException(`Location not found: ${dto.locationId}`);
      }
    }

    if (dto.isDefault) {
      await this.prisma.db.whatsAppNumber.updateMany({
        where: { tenantId, isActive: true },
        data: { isDefault: false },
      });
    }

    const whatsappNumber = await this.prisma.db.whatsAppNumber.create({
      data: {
        tenantId,
        locationId: dto.locationId ?? null,
        phoneNumber: phoneE164,
        phoneNumberId: dto.phoneNumberId ?? null,
        displayName: dto.displayName,
        greetingMessage: dto.greetingMessage ?? null,
        autoReplyEnabled: dto.autoReplyEnabled ?? true,
        isDefault: dto.isDefault ?? false,
        verificationStatus: WhatsAppVerificationStatus.PENDING,
      },
    });

    this.logger.log(
      `WhatsApp number created: ${whatsappNumber.id} for tenant ${tenantId}`,
      WhatsAppNumberService.name,
    );

    return whatsappNumber;
  }

  async findAll(
    query: QueryWhatsAppNumberDto,
    tenantId: string,
  ): Promise<{
    data: Prisma.WhatsAppNumberGetPayload<object>[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const where: Prisma.WhatsAppNumberWhereInput = {
      tenantId,
      ...(query.locationId && { locationId: query.locationId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.verificationStatus && {
        verificationStatus:
          query.verificationStatus as WhatsAppVerificationStatus,
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.db.whatsAppNumber.findMany({
        where,
        take: query.limit ?? 20,
        skip: query.offset ?? 0,
        orderBy: { createdAt: 'desc' },
        include: {
          location: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.db.whatsAppNumber.count({ where }),
    ]);

    return {
      data,
      total,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    };
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<Prisma.WhatsAppNumberGetPayload<object>> {
    const whatsappNumber = await this.prisma.db.whatsAppNumber.findUnique({
      where: { id },
      include: {
        location: {
          select: { id: true, name: true, address: true },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    });

    if (!whatsappNumber) {
      throw new NotFoundException(`WhatsApp number not found: ${id}`);
    }

    if (whatsappNumber.tenantId !== tenantId) {
      throw new NotFoundException(`WhatsApp number not found: ${id}`);
    }

    return whatsappNumber;
  }

  async update(
    id: string,
    dto: UpdateWhatsAppNumberDto,
    tenantId: string,
  ): Promise<Prisma.WhatsAppNumberGetPayload<object>> {
    const existing = await this.findOne(id, tenantId);

    if (dto.isActive === true && existing.isDefault) {
      // No action is required if the number is already default
    }

    if (dto.isActive === false && existing.isDefault) {
      const otherActive = await this.prisma.db.whatsAppNumber.findFirst({
        where: {
          tenantId,
          id: { not: id },
          isActive: true,
        },
      });

      if (!otherActive) {
        throw new BadRequestException(
          'Cannot deactivate the default number. Set another number as default first.',
        );
      }
    }

    const updated = await this.prisma.db.whatsAppNumber.update({
      where: { id },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.locationId !== undefined && { locationId: dto.locationId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.autoReplyEnabled !== undefined && {
          autoReplyEnabled: dto.autoReplyEnabled,
        }),
        ...(dto.greetingMessage !== undefined && {
          greetingMessage: dto.greetingMessage,
        }),
      },
    });

    this.logger.log(
      `WhatsApp number updated: ${id} for tenant ${tenantId}`,
      WhatsAppNumberService.name,
    );

    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.findOne(id, tenantId);

    if (existing.isActive) {
      const count = await this.prisma.db.whatsAppNumber.count({
        where: { tenantId, isActive: true },
      });

      if (count <= 1) {
        throw new BadRequestException(
          'Cannot delete the last active WhatsApp number.',
        );
      }
    }

    await this.prisma.db.whatsAppNumber.delete({
      where: { id },
    });

    this.logger.log(
      `WhatsApp number deleted: ${id} for tenant ${tenantId}`,
      WhatsAppNumberService.name,
    );
  }

  async sendTestMessage(
    id: string,
    recipientPhone: string,
    message: string,
    tenantId: string,
  ): Promise<{ jobId: string }> {
    const whatsappNumber = await this.findOne(id, tenantId);

    if (!whatsappNumber.isActive) {
      throw new BadRequestException('Cannot send from an inactive number');
    }

    if (!whatsappNumber.phoneNumberId) {
      throw new BadRequestException(
        'Phone number ID not configured. Please verify the number first.',
      );
    }

    let recipientE164: string;
    try {
      recipientE164 = parsePhoneToE164(recipientPhone).e164;
    } catch {
      throw new BadRequestException(
        `Invalid recipient phone: ${recipientPhone}`,
      );
    }

    const job = await this.outboundQueue.add('send-test-message', {
      tenantId,
      whatsAppNumberId: id,
      phoneNumberId: whatsappNumber.phoneNumberId,
      recipientPhone: recipientE164,
      message,
    });
    this.logger.log(
      `Test message queued: ${job.id} from ${whatsappNumber.phoneNumber}`,
      WhatsAppNumberService.name,
    );

    return { jobId: job.id! };
  }

  async updateVerificationStatus(
    id: string,
    status: WhatsAppVerificationStatus,
    qualityScore?: number,
  ): Promise<void> {
    await this.prisma.db.whatsAppNumber.update({
      where: { id },
      data: {
        verificationStatus: status,
        ...(qualityScore !== undefined && { qualityScore }),
      },
    });
  }
}
