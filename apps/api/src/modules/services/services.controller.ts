import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ServicesService } from './services.service.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { UserRole } from '@whatsapp-ai/db/generated/prisma';

@ApiTags('services')
@ApiBearerAuth('access-token')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'List all services' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiQuery({ name: 'locationId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
    @Query('locationId') locationId?: string,
    @Query('search') search?: string,
  ) {
    return this.servicesService.findAll(user.tenantId, {
      includeInactive,
      locationId,
      search,
    });
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new service' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateServiceDto,
  ) {
    return this.servicesService.create(user.tenantId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID' })
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) serviceId: string,
  ) {
    return this.servicesService.findById(user.tenantId, serviceId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update service' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(user.tenantId, serviceId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete service' })
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) serviceId: string,
  ) {
    return this.servicesService.remove(user.tenantId, serviceId);
  }
}
