import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CustomerOptInStatus } from '@whatsapp-ai/db/generated/prisma';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerQueryDto,
  CustomerSortBy,
  SortOrder,
  PaginatedCustomerResponse,
  CustomerStatsResponse,
  CustomerResponse,
} from './dto/index.js';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  async findAll(query: CustomerQueryDto): Promise<PaginatedCustomerResponse> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      tag,
      sortBy = CustomerSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
    } = query;

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.optInStatus = status;
    }
    if (tag) {
      where.tags = { array_contains: tag.toLowerCase() };
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[sortBy] = sortOrder;

    const [items, total] = await this.prisma.db.$transaction([
      this.prisma.db.customer.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          tenantId: true,
          name: true,
          phone: true,
          email: true,
          whatsappId: true,
          optInStatus: true,
          notes: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.db.customer.count({ where }),
    ]);

    return {
      items: items.map((item) => this.transformCustomer(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<CustomerResponse> {
    const tenantId = this.prisma.getTenantId();

    const customer = await this.prisma.db.customer.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        phone: true,
        email: true,
        whatsappId: true,
        optInStatus: true,
        notes: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!customer) {
      throw new NotFoundException({
        errorCode: 'CUSTOMER_NOT_FOUND',
        message: `Customer with ID ${id} not found`,
      });
    }

    return this.transformCustomer(customer);
  }

  async create(dto: CreateCustomerDto): Promise<CustomerResponse> {
    const tenantId = this.prisma.getTenantId();

    const normalizedPhone = this.normalizePhone(dto.phone);

    const existing = await this.prisma.db.customer.findFirst({
      where: {
        tenantId,
        phone: normalizedPhone,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException({
        errorCode: 'CUSTOMER_PHONE_EXISTS',
        message: 'A customer with this phone number already exists',
        metadata: { existingCustomerId: existing.id },
      });
    }

    const customer = await this.prisma.db.customer.create({
      data: {
        tenantId,
        phone: normalizedPhone,
        name: dto.name,
        email: dto.email,
        notes: dto.notes,
        tags: dto.tags ?? [],
        optInStatus: dto.optInStatus ?? CustomerOptInStatus.PENDING,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        phone: true,
        email: true,
        whatsappId: true,
        optInStatus: true,
        notes: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Customer created: ${customer.id} for tenant: ${tenantId}`);

    return this.transformCustomer(customer);
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerResponse> {
    const tenantId = this.prisma.getTenantId();

    const existing = await this.prisma.db.customer.findFirst({
      where: { id, tenantId },
      select: { id: true, phone: true },
    });

    if (!existing) {
      throw new NotFoundException({
        errorCode: 'CUSTOMER_NOT_FOUND',
        message: `Customer with ID ${id} not found`,
      });
    }

    if (dto.phone && dto.phone !== existing.phone) {
      const normalizedPhone = this.normalizePhone(dto.phone);
      const duplicate = await this.prisma.db.customer.findFirst({
        where: {
          tenantId,
          phone: normalizedPhone,
          id: { not: id },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictException({
          errorCode: 'CUSTOMER_PHONE_EXISTS',
          message: 'A customer with this phone number already exists',
          metadata: { existingCustomerId: duplicate.id },
        });
      }
      dto.phone = normalizedPhone;
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.optInStatus !== undefined) updateData.optInStatus = dto.optInStatus;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException({
        errorCode: 'NO_UPDATE_FIELDS',
        message: 'No valid update fields provided',
      });
    }

    const customer = await this.prisma.db.customer.update({
      where: { id, tenantId },
      data: updateData,
      select: {
        id: true,
        tenantId: true,
        name: true,
        phone: true,
        email: true,
        whatsappId: true,
        optInStatus: true,
        notes: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Customer updated: ${customer.id} for tenant: ${tenantId}`);

    return this.transformCustomer(customer);
  }

  async remove(id: string): Promise<void> {
    const tenantId = this.prisma.getTenantId();

    const customer = await this.prisma.db.customer.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException({
        errorCode: 'CUSTOMER_NOT_FOUND',
        message: `Customer with ID ${id} not found`,
      });
    }

    await this.prisma.db.customer.delete({
      where: { id, tenantId },
    });

    this.logger.log(`Customer deleted: ${id} for tenant: ${tenantId}`);
  }

  async getStats(): Promise<CustomerStatsResponse> {
    const tenantId = this.prisma.getTenantId();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      totalResult,
      optedInResult,
      optedOutResult,
      pendingResult,
      newThisMonthResult,
      newThisWeekResult,
    ] = await this.prisma.db.$transaction([
      this.prisma.db.customer.count({ where: { tenantId } }),
      this.prisma.db.customer.count({
        where: { tenantId, optInStatus: CustomerOptInStatus.OPTED_IN },
      }),
      this.prisma.db.customer.count({
        where: { tenantId, optInStatus: CustomerOptInStatus.OPTED_OUT },
      }),
      this.prisma.db.customer.count({
        where: { tenantId, optInStatus: CustomerOptInStatus.PENDING },
      }),
      this.prisma.db.customer.count({
        where: {
          tenantId,
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.db.customer.count({
        where: {
          tenantId,
          createdAt: { gte: startOfWeek },
        },
      }),
    ]);

    return {
      total: totalResult,
      optedIn: optedInResult,
      optedOut: optedOutResult,
      pending: pendingResult,
      newThisMonth: newThisMonthResult,
      newThisWeek: newThisWeekResult,
    };
  }

  async getConversations(
    customerId: string,
    query: { page?: number; limit?: number },
  ): Promise<PaginatedCustomerResponse> {
    const tenantId = this.prisma.getTenantId();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const customer = await this.prisma.db.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException({
        errorCode: 'CUSTOMER_NOT_FOUND',
        message: `Customer with ID ${customerId} not found`,
      });
    }

    const [conversations, total] = await this.prisma.db.$transaction([
      this.prisma.db.conversation.findMany({
        where: { tenantId, customerId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          state: true,
          updatedAt: true,
          createdAt: true,
          _count: {
            select: { messages: true },
          },
        },
      }),
      this.prisma.db.conversation.count({
        where: { tenantId, customerId },
      }),
    ]);

    return {
      items: conversations.map((conv) => ({
        id: conv.id,
        state: conv.state,
        lastMessageAt: conv.updatedAt,
        messageCount: conv._count.messages,
        createdAt: conv.createdAt,
      })) as unknown as CustomerResponse[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private normalizePhone(phone: string): string {
    let normalized = phone.replace(/[\s\-()]/g, '');
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }

    return normalized;
  }

  private transformCustomer(
    customer: Record<string, unknown>,
  ): CustomerResponse {
    return {
      id: customer.id as string,
      tenantId: customer.tenantId as string,
      name: customer.name as string | null,
      phone: customer.phone as string,
      email: customer.email as string | null,
      whatsappId: customer.whatsappId as string | null,
      optInStatus: customer.optInStatus as CustomerOptInStatus,
      notes: customer.notes as string | null,
      tags: (customer.tags as string[]) ?? [],
      createdAt: customer.createdAt as Date,
      updatedAt: customer.updatedAt as Date,
    };
  }

  async exportCsv(query: CustomerQueryDto): Promise<string> {
    const tenantId = this.prisma.getTenantId();

    const where: Record<string, unknown> = { tenantId };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) where.optInStatus = query.status;
    if (query.tag) where.tags = { array_contains: query.tag.toLowerCase() };

    const customers = await this.prisma.db.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10_000,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        optInStatus: true,
        tags: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const headers = [
      'ID',
      'Name',
      'Phone',
      'Email',
      'Opt-In Status',
      'Tags',
      'Notes',
      'Created At',
      'Updated At',
    ];

    const escape = (value: string | null | undefined): string => {
      if (value == null) return '';
      return `"${String(value).replace(/"/g, '""')}"`;
    };

    const rows = customers.map((c) => {
      const tags = Array.isArray(c.tags) ? (c.tags as string[]).join('; ') : '';

      return [
        escape(c.id),
        escape(c.name),
        escape(c.phone),
        escape(c.email),
        escape(c.optInStatus),
        escape(tags),
        escape(c.notes),
        escape(c.createdAt.toISOString()),
        escape(c.updatedAt.toISOString()),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  async importFromCsv(buffer: Buffer): Promise<{
    created: number;
    skipped: number;
    errors: Array<{ row: number; reason: string }>;
  }> {
    const tenantId = this.prisma.getTenantId();

    const csvText = buffer.toString('utf-8');
    const lines = csvText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      throw new BadRequestException('CSV file is empty or has no data rows.');
    }

    const headers = lines[0]
      .split(',')
      .map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());

    const phoneIdx = headers.indexOf('phone');
    if (phoneIdx === -1) {
      throw new BadRequestException(
        'CSV must have a "phone" column. Download the template for the correct format.',
      );
    }

    const nameIdx = headers.indexOf('name');
    const emailIdx = headers.indexOf('email');
    const notesIdx = headers.indexOf('notes');
    const tagsIdx = headers.indexOf('tags');

    let created = 0;
    let skipped = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    const dataLines = lines.slice(1, 1001);

    for (let i = 0; i < dataLines.length; i++) {
      const rowNumber = i + 2;
      const line = dataLines[i];

      const cols = this._parseCsvRow(line);

      const rawPhone = cols[phoneIdx]?.trim();

      if (!rawPhone) {
        errors.push({ row: rowNumber, reason: 'Phone number is required.' });
        skipped++;
        continue;
      }

      let phone: string;
      try {
        phone = this.normalizePhone(rawPhone);
      } catch {
        errors.push({
          row: rowNumber,
          reason: `Invalid phone number: "${rawPhone}". Use E.164 format (e.g. +9779801234567).`,
        });
        skipped++;
        continue;
      }

      const name = nameIdx !== -1 ? cols[nameIdx]?.trim() || null : null;
      const email = emailIdx !== -1 ? cols[emailIdx]?.trim() || null : null;
      const notes = notesIdx !== -1 ? cols[notesIdx]?.trim() || null : null;
      const tags =
        tagsIdx !== -1
          ? cols[tagsIdx]?.trim()
            ? cols[tagsIdx]
                .split(';')
                .map((t) => t.trim().toLowerCase())
                .filter(Boolean)
            : []
          : [];

      try {
        const existing = await this.prisma.db.customer.findFirst({
          where: { tenantId, phone },
          select: { id: true },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await this.prisma.db.customer.create({
          data: {
            tenantId,
            phone,
            name,
            email,
            notes,
            tags,
            optInStatus: 'PENDING',
          },
        });

        created++;
      } catch {
        errors.push({
          row: rowNumber,
          reason:
            'Failed to create customer. Please check the data and try again.',
        });
        skipped++;
      }
    }

    this.logger.log(
      { tenantId, created, skipped, errorCount: errors.length },
      'Customer CSV import complete',
    );

    return { created, skipped, errors };
  }

  private _parseCsvRow(line: string): string[] {
    const cols: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    cols.push(current.trim());
    return cols;
  }
}
