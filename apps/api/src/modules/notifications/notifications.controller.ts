import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { NotificationsService } from './notifications.service.js';
import { NotificationQueryDto } from './dto/notification-query.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── List notifications ────────────────────────────────────────────────────

  @Get()
  @SkipThrottle({ default: false })
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiResponse({
    status: 200,
    description: 'Paginated notifications with unread count',
  })
  async findAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: NotificationQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notificationsService.findAll(user.userId, user.tenantId, query);
  }

  // ── Unread count ──────────────────────────────────────────────────────────

  @Get('unread-count')
  @SkipThrottle({ default: false })
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser() user: CurrentUserPayload) {
    const count = await this.notificationsService.getUnreadCount(
      user.userId,
      user.tenantId,
    );
    return { count };
  }

  // ── Mark all read ─────────────────────────────────────────────────────────

  @Patch('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.markAllRead(user.userId, user.tenantId);
  }

  // ── Mark single read ──────────────────────────────────────────────────────

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markRead(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notificationsService.markRead(id, user.userId, user.tenantId);
  }
}
