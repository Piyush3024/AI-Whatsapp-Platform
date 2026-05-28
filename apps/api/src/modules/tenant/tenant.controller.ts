import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantService } from './tenant.service.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import { CreateLocationDto } from './dto/create-location.dto.js';
import { UpdateLocationDto } from './dto/update-location.dto.js';
import { SetBusinessHoursDto } from './dto/set-business-hours.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { UserRole } from '@whatsapp-ai/db/generated/prisma';

@ApiTags('tenant')
@ApiBearerAuth('access-token')
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('me')
  @ApiOperation({ summary: 'Take current tenant information' })
  getTenant(@CurrentUser() user: CurrentUserPayload) {
    return this.tenantService.getTenant(user.tenantId);
  }

  @Patch('me')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update tenant settings' })
  updateTenant(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantService.updateTenant(user.tenantId, dto);
  }

  @Get('members')
  @ApiOperation({ summary: 'List all tenant members' })
  getMembers(@CurrentUser() user: CurrentUserPayload) {
    return this.tenantService.getMembers(user.tenantId);
  }

  @Patch('members/:userId/role')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Update member role (OWNER only)' })
  updateMemberRole(
    @CurrentUser() user: CurrentUserPayload,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.tenantService.updateMemberRole(
      user.tenantId,
      user.userId,
      targetUserId,
      dto,
    );
  }

  @Delete('members/:userId')
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove member from tenant (OWNER only)' })
  removeMember(
    @CurrentUser() user: CurrentUserPayload,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.tenantService.removeMember(
      user.tenantId,
      user.userId,
      targetUserId,
    );
  }

  @Get('locations')
  @ApiOperation({ summary: 'List all tenant locations' })
  getLocations(@CurrentUser() user: CurrentUserPayload) {
    return this.tenantService.getLocations(user.tenantId);
  }

  @Post('locations')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new location' })
  createLocation(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateLocationDto,
  ) {
    return this.tenantService.createLocation(user.tenantId, dto);
  }

  @Get('locations/:id')
  @ApiOperation({ summary: 'Get location by ID' })
  getLocation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) locationId: string,
  ) {
    return this.tenantService.getLocationById(user.tenantId, locationId);
  }

  @Patch('locations/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update location' })
  updateLocation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) locationId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.tenantService.updateLocation(user.tenantId, locationId, dto);
  }

  @Delete('locations/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete location (soft delete)' })
  deleteLocation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) locationId: string,
  ) {
    return this.tenantService.deleteLocation(user.tenantId, locationId);
  }

  @Get('locations/:id/hours')
  @ApiOperation({ summary: 'Get location business hours' })
  getBusinessHours(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) locationId: string,
  ) {
    return this.tenantService.getBusinessHours(user.tenantId, locationId);
  }

  @Put('locations/:id/hours')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Set location business hours (full replacement)' })
  setBusinessHours(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) locationId: string,
    @Body() dto: SetBusinessHoursDto,
  ) {
    return this.tenantService.setBusinessHours(user.tenantId, locationId, dto);
  }
}
