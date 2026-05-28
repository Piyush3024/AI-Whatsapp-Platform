import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  HttpStatus,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ReminderRuleType } from '@whatsapp-ai/db/generated/prisma';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RemindersService } from './reminders.service.js';
import {
  CreateReminderRuleDto,
  UpdateReminderRuleDto,
  QueryReminderRuleDto,
} from './dto/index.js';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: string;
}

@ApiTags('Reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'reminders',
  version: ['1'],
})
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post('rules')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a reminder rule' })
  async createReminderRule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReminderRuleDto,
  ) {
    const rule = await this.remindersService.createReminderRule(
      user.tenantId,
      dto,
    );
    return { success: true, data: rule };
  }

  @Get('rules')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Get all reminder rules for tenant' })
  async getReminderRules(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryReminderRuleDto,
  ) {
    const rules = await this.remindersService.getReminderRules(
      user.tenantId,
      query,
    );
    return { success: true, data: rules };
  }

  @Get('rules/:type')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Get reminder rule by type' })
  async getReminderRuleByType(
    @CurrentUser() user: AuthenticatedUser,
    @Param('type') type: ReminderRuleType,
  ) {
    const rule = await this.remindersService.getReminderRuleByType(
      user.tenantId,
      type,
    );
    return { success: true, data: rule };
  }

  @Patch('rules/:type')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Update reminder rule' })
  async updateReminderRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('type') type: ReminderRuleType,
    @Body() dto: UpdateReminderRuleDto,
  ) {
    const rule = await this.remindersService.updateReminderRule(
      user.tenantId,
      type,
      dto,
    );
    return { success: true, data: rule };
  }

  @Delete('rules/:type')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Delete reminder rule' })
  async deleteReminderRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('type') type: ReminderRuleType,
  ) {
    const result = await this.remindersService.deleteReminderRule(
      user.tenantId,
      type,
    );
    return { success: true, data: result };
  }

  @Get('scheduled')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Get scheduled reminders' })
  async getScheduledReminders(
    @CurrentUser() user: AuthenticatedUser,
    @Query()
    query: {
      bookingId?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
      limit?: string;
      offset?: string;
    },
  ) {
    const result = await this.remindersService.getScheduledReminders(
      user.tenantId,
      {
        bookingId: query.bookingId,
        status: query.status,
        fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
        toDate: query.toDate ? new Date(query.toDate) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        offset: query.offset ? parseInt(query.offset, 10) : undefined,
      },
    );
    return { success: true, ...result };
  }
}
