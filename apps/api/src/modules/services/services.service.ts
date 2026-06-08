import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateServiceDto } from './dto/create-service.dto.js';
import type { UpdateServiceDto } from './dto/update-service.dto.js';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    options: {
      includeInactive?: boolean;
      locationId?: string;
      search?: string;
    } = {},
  ) {
    return this.prisma.db.service.findMany({
      where: {
        tenantId,
        ...(!options.includeInactive && { isActive: true }),
        ...(options.locationId && { locationId: options.locationId }),
        ...(options.search && {
          OR: [
            { name: { contains: options.search, mode: 'insensitive' } },
            { description: { contains: options.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(tenantId: string, serviceId: string) {
    const service = await this.prisma.db.service.findFirst({
      where: { id: serviceId, tenantId },
    });

    if (!service) {
      throw new NotFoundException('Service not found.');
    }

    return service;
  }

  async create(tenantId: string, dto: CreateServiceDto) {
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

  async update(tenantId: string, serviceId: string, dto: UpdateServiceDto) {
    await this.findById(tenantId, serviceId);

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
      where: { id: serviceId, tenantId },
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

  async remove(tenantId: string, serviceId: string) {
    await this.findById(tenantId, serviceId);

    await this.prisma.db.service.delete({ where: { id: serviceId, tenantId } });
    this.logger.log(`Service deleted: ${serviceId}`, 'ServicesService');
    return { message: 'Service successfully removed.' };
  }
}
