import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
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
  ApiQuery,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ConversationsService } from './conversations.service.js';
import {
  ConversationQueryDto,
  MessageQueryDto,
  SendMessageDto,
  UpdateConversationDto,
} from './dto/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller({ path: 'conversations', version: '1' })
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  // ── List conversations ────────────────────────────────────────────────────

  @Get()
  @SkipThrottle({ default: false })
  @ApiOperation({
    summary: 'List all conversations',
    description:
      'Returns paginated conversations. STAFF role only sees assigned conversations.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['OPEN', 'HUMAN_HANDOFF', 'CLOSED'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated conversation list' })
  async findAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: ConversationQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.conversationsService.findAll(query, user.userId, user.role);
  }

  // ── Get single conversation ───────────────────────────────────────────────

  @Get(':id')
  @SkipThrottle({ default: false })
  @ApiOperation({ summary: 'Get a single conversation with metadata' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Conversation detail' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.conversationsService.findOne(id, user.userId, user.role);
  }

  // ── Get messages (cursor-paginated) ──────────────────────────────────────

  @Get(':id/messages')
  @SkipThrottle({ default: false })
  @ApiOperation({
    summary: 'Get messages for a conversation',
    description:
      'Cursor-based pagination — pass cursor from previous response to load older messages.',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: 'Pagination cursor (base64)',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Message list with next cursor' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMessages(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: MessageQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.conversationsService.getMessages(
      id,
      query,
      user.userId,
      user.role,
    );
  }

  // ── Send manual message ───────────────────────────────────────────────────

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ strict: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Send a manual message',
    description: 'Sends a text message and enqueues it to whatsapp-outbound.',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 201, description: 'Message created and queued' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async sendMessage(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: SendMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.conversationsService.sendMessage(
      id,
      dto,
      user.userId,
      user.role,
    );
  }

  // ── Update conversation status ────────────────────────────────────────────

  @Patch(':id')
  @Throttle({ strict: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Update conversation status',
    description: 'Set status to OPEN, HUMAN_HANDOFF, or CLOSED.',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Conversation updated' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateConversationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.conversationsService.updateStatus(
      id,
      dto,
      user.userId,
      user.role,
    );
  }
}
