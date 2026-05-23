import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CustomerOptInStatus } from '../../generated/prisma/client.js';
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

/**
 * Customer service for managing customers.
 *
 * Best Practices:
 * - All queries include tenantId for RLS
 * - Soft deletes respected via PrismaService extension
 * - Pagination with proper metadata
 * - Search across multiple fields
 * - Stats aggregation for dashboard
 */
@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  /**
   * Find all customers with pagination, search, and filters.
   */
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
    // const tenantId = this.getTenantId();

    // Build where clause
    const where: Record<string, unknown> = {};

    // Search across multiple fields
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by status
    if (status) {
      where.optInStatus = status;
    }

    // Filter by tag (stored as JSON array)
    if (tag) {
      where.tags = { array_contains: tag.toLowerCase() };
    }

    // Build orderBy
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[sortBy] = sortOrder;

    // Execute query with count in transaction
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
      items: items.map(this.transformCustomer),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a single customer by ID.
   */
  async findOne(id: string): Promise<CustomerResponse> {
    const tenantId = this.getTenantId();

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

  /**
   * Create a new customer.
   */
  async create(dto: CreateCustomerDto): Promise<CustomerResponse> {
    const tenantId = this.getTenantId();

    // Normalize phone (remove spaces, ensure E.164)
    const normalizedPhone = this.normalizePhone(dto.phone);

    // Check for duplicate phone within tenant
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

  /**
   * Update an existing customer.
   */
  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerResponse> {
    const tenantId = this.getTenantId();

    // First check if customer exists
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

    // If phone is being changed, check for duplicates
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

    // Build update data (only include provided fields)
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
      where: { id },
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

  /**
   * Soft delete a customer.
   */
  async remove(id: string): Promise<void> {
    const tenantId = this.getTenantId();

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

    // PrismaService soft-delete extension handles deletedAt
    await this.prisma.db.customer.delete({
      where: { id },
    });

    this.logger.log(`Customer deleted: ${id} for tenant: ${tenantId}`);
  }

  /**
   * Get customer statistics for dashboard.
   */
  async getStats(): Promise<CustomerStatsResponse> {
    const tenantId = this.getTenantId();

    // Calculate date boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Execute aggregation queries
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

  /**
   * Get conversations for a customer.
   */
  async getConversations(
    customerId: string,
    query: { page?: number; limit?: number },
  ): Promise<PaginatedCustomerResponse> {
    const tenantId = this.getTenantId();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Verify customer exists
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

  /**
   * Retrieve current tenant ID from request context.
   */
  private getTenantId(): string {
    const tenantId = this.cls.get<string>('tenantId');
    if (!tenantId) {
      throw new BadRequestException({
        errorCode: 'TENANT_CONTEXT_MISSING',
        message: 'Tenant context is missing',
      });
    }
    return tenantId;
  }

  /**
   * Normalize phone number to E.164 format.
   */
  private normalizePhone(phone: string): string {
    // Remove all spaces and special characters except +
    let normalized = phone.replace(/[\s\-()]/g, '');

    // Ensure it starts with +
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }

    return normalized;
  }

  /**
   * Transform Prisma customer to response format.
   */
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
}
