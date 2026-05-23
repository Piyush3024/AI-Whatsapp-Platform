import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateServiceDto } from './dto/create-service.dto.js';
import type { UpdateServiceDto } from './dto/update-service.dto.js';

/**
 * ServicesService
 *
 * Business services management:
 * - Service CRUD (create, read, update, soft delete)
 * - Active/inactive filtering
 * - Location-based filtering
 */
@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tenant ki saari services return karta hai.
   * By default sirf active services — booking flow ke liye.
   */
  async findAll(
    tenantId: string,
    options: { includeInactive?: boolean; locationId?: string } = {},
  ) {
    return this.prisma.db.service.findMany({
      where: {
        tenantId,
        ...(!options.includeInactive && { isActive: true }),
        ...(options.locationId && { locationId: options.locationId }),
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Service by ID — tenant check ke saath.
   */
  async findById(tenantId: string, serviceId: string) {
    const service = await this.prisma.db.service.findFirst({
      where: { id: serviceId, tenantId },
    });

    if (!service) {
      throw new NotFoundException('Service not found.');
    }

    return service;
  }

  /**
   * Naya service create karta hai.
   * LocationId verify karta hai agar diya hai.
   */
  async create(tenantId: string, dto: CreateServiceDto) {
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

    const service = await this.prisma.db.service.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        duration: dto.duration,
        price: dto.price,
        currency: dto.currency ?? 'NPR',
        locationId: dto.locationId,
        isActive: dto.isActive ?? true,
      },
    });

    this.logger.log(
      `Service created: ${service.id} for tenant: ${tenantId}`,
      'ServicesService',
    );

    return service;
  }

  /**
   * Service update karta hai.
   */
  async update(tenantId: string, serviceId: string, dto: UpdateServiceDto) {
    await this.findById(tenantId, serviceId);

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

    const updated = await this.prisma.db.service.update({
      where: { id: serviceId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.duration !== undefined && { duration: dto.duration }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.locationId !== undefined && { locationId: dto.locationId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.logger.log(`Service updated: ${serviceId}`, 'ServicesService');
    return updated;
  }

  /**
   * Service soft delete karta hai.
   */
  async remove(tenantId: string, serviceId: string) {
    await this.findById(tenantId, serviceId);

    await this.prisma.db.service.delete({ where: { id: serviceId } });

    this.logger.log(`Service deleted: ${serviceId}`, 'ServicesService');
    return { message: 'Service successfully removed.' };
  }
}
