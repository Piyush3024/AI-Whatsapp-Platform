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
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { StaffService } from './staff.service.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { SetStaffScheduleDto } from './dto/set-staff-schedule.dto.js';
import { CreateScheduleOverrideDto } from './dto/create-schedule-override.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { UserRole } from '@whatsapp-ai/db/generated/prisma';

@ApiTags('staff')
@ApiBearerAuth('access-token')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @ApiOperation({ summary: 'Saare staff members list karo' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Inactive staff bhi include karo?',
  })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ) {
    return this.staffService.findAll(user.tenantId, includeInactive);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Naya staff member banao' })
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateStaffDto) {
    return this.staffService.create(user.tenantId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Staff member by ID lo' })
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) staffId: string,
  ) {
    return this.staffService.findById(user.tenantId, staffId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Staff member update karo' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) staffId: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffService.update(user.tenantId, staffId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Staff member soft delete karo' })
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) staffId: string,
  ) {
    return this.staffService.remove(user.tenantId, staffId);
  }

  @Get(':id/schedule')
  @ApiOperation({ summary: 'Staff ki weekly schedule dekho' })
  getSchedule(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) staffId: string,
  ) {
    return this.staffService.getSchedule(user.tenantId, staffId);
  }

  @Put(':id/schedule')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Staff ki weekly schedule set karo (full replace)' })
  setSchedule(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) staffId: string,
    @Body() dto: SetStaffScheduleDto,
  ) {
    return this.staffService.setSchedule(user.tenantId, staffId, dto);
  }

  @Get(':id/overrides')
  @ApiOperation({ summary: 'Staff ke schedule overrides list karo' })
  getOverrides(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) staffId: string,
  ) {
    return this.staffService.getOverrides(user.tenantId, staffId);
  }

  @Post(':id/overrides')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Specific date ke liye schedule override banao' })
  createOverride(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) staffId: string,
    @Body() dto: CreateScheduleOverrideDto,
  ) {
    return this.staffService.createOverride(user.tenantId, staffId, dto);
  }

  @Delete(':id/overrides/:overrideId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Schedule override remove karo' })
  removeOverride(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) staffId: string,
    @Param('overrideId', ParseUUIDPipe) overrideId: string,
  ) {
    return this.staffService.removeOverride(user.tenantId, staffId, overrideId);
  }
}
