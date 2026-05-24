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

// import { QUEUE_NAMES } from '../../constants/queues.js';

/**
 * WhatsAppNumberService
 *
 * Business logic for WhatsApp Business number management.
 *
 * Key Responsibilities:
 * - CRUD operations with E.164 phone validation
 * - One default number per tenant
 * - Verification status tracking
 * - Test message queuing
 */
@Injectable()
export class WhatsAppNumberService {
  private readonly logger = new Logger(WhatsAppNumberService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue('whatsapp-outbound') private readonly outboundQueue: Queue,
  ) {}

  /**
   * Create a new WhatsApp number for the tenant
   */
  async create(
    dto: CreateWhatsAppNumberDto,
    tenantId: string,
  ): Promise<Prisma.WhatsAppNumberGetPayload<object>> {
    // ── Step 1: Normalize phone to E.164 ─────────────────────────────────
    let phoneE164: string;
    try {
      const parsed = parsePhoneToE164(dto.phoneNumber);
      phoneE164 = parsed.e164;
    } catch {
      throw new BadRequestException(
        `Invalid phone number: ${dto.phoneNumber}. Please use E.164 format (e.g., +9779801234567)`,
      );
    }

    // ── Step 2: Check for duplicate ───────────────────────────────────────
    const existing = await this.prisma.db.whatsAppNumber.findUnique({
      where: { phoneNumber: phoneE164 },
    });

    if (existing) {
      throw new ConflictException(
        'Is WhatsApp number ka already hamare platform par registered hai',
      );
    }

    // ── Step 3: Check location if provided ────────────────────────────────
    if (dto.locationId) {
      const location = await this.prisma.db.location.findUnique({
        where: { id: dto.locationId },
      });
      if (!location) {
        throw new NotFoundException(`Location not found: ${dto.locationId}`);
      }
    }

    // ── Step 4: If isDefault, unset other defaults ─────────────────────────
    if (dto.isDefault) {
      await this.prisma.db.whatsAppNumber.updateMany({
        where: { tenantId, isActive: true },
        data: { isDefault: false },
      });
    }

    // ── Step 5: Create the WhatsApp number ─────────────────────────────────
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

  /**
   * Find all WhatsApp numbers for a tenant with filters
   */
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

  /**
   * Find single WhatsApp number by ID
   */
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

    // Tenant isolation check
    if (whatsappNumber.tenantId !== tenantId) {
      throw new NotFoundException(`WhatsApp number not found: ${id}`);
    }

    return whatsappNumber;
  }

  /**
   * Update a WhatsApp number
   */
  async update(
    id: string,
    dto: UpdateWhatsAppNumberDto,
    tenantId: string,
  ): Promise<Prisma.WhatsAppNumberGetPayload<object>> {
    // Verify exists + tenant ownership
    const existing = await this.findOne(id, tenantId);

    // If setting as default, unset others
    if (dto.isActive === true && existing.isDefault) {
      // Already default, no action needed
    }

    // If unsetting default, handle carefully
    if (dto.isActive === false && existing.isDefault) {
      // Don't allow deactivating default without setting another as default
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

  /**
   * Soft delete a WhatsApp number
   */
  async remove(id: string, tenantId: string): Promise<void> {
    // Verify exists + tenant ownership
    const existing = await this.findOne(id, tenantId);

    // Check if it's the last active number
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

  /**
   * Send a test message from this WhatsApp number
   */
  async sendTestMessage(
    id: string,
    recipientPhone: string,
    message: string,
    tenantId: string,
  ): Promise<{ jobId: string }> {
    // Verify exists + tenant ownership
    const whatsappNumber = await this.findOne(id, tenantId);

    if (!whatsappNumber.isActive) {
      throw new BadRequestException('Cannot send from an inactive number');
    }

    if (!whatsappNumber.phoneNumberId) {
      throw new BadRequestException(
        'Phone number ID not configured. Please verify the number first.',
      );
    }

    // Normalize recipient phone
    let recipientE164: string;
    try {
      recipientE164 = parsePhoneToE164(recipientPhone).e164;
    } catch {
      throw new BadRequestException(
        `Invalid recipient phone: ${recipientPhone}`,
      );
    }

    // Queue the test message job
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

  /**
   * Update verification status (called after Meta API verification)
   */
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
