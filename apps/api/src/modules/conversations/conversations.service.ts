import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsageLimitService } from '../billing/usage-limit.service.js';
import {
  ConversationStatus,
  MessageType,
  MessageStatus,
  UserRole,
} from '@whatsapp-ai/db/generated/prisma';
import type {
  ConversationQueryDto,
  MessageQueryDto,
  SendMessageDto,
  UpdateConversationDto,
} from './dto/index.js';

// Shape of each item in the conversation list
export interface ConversationListItem {
  id: string;
  status: ConversationStatus;
  state: string;
  customer: {
    id: string;
    name: string | null;
    phone: string;
  };
  lastMessage: {
    content: string | null;
    direction: string;
    createdAt: Date;
  } | null;
  assignedStaff: {
    id: string;
    name: string;
  } | null;
  unreadCount: number;
  updatedAt: Date;
  createdAt: Date;
}

export interface PaginatedConversations {
  items: ConversationListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface MessageItem {
  id: string;
  content: string | null;
  direction: string;
  messageType: MessageType;
  status: MessageStatus;
  createdAt: Date;
}

export interface CursorPaginatedMessages {
  items: MessageItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usageLimitService: UsageLimitService,
    @InjectQueue('whatsapp-outbound')
    private readonly outboundQueue: Queue,
  ) {}

  async findAll(
    query: ConversationQueryDto,
    currentUserId: string,
    currentUserRole: string,
  ): Promise<PaginatedConversations> {
    const tenantId = this.prisma.getTenantId();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build base where clause
    const where: Record<string, unknown> = { tenantId };

    if (query.status) {
      where.status = query.status;
    }

    // RBAC: STAFF can only see conversations assigned to them
    if (currentUserRole === UserRole.STAFF) {
      const staffRecord = await this.prisma.db.staff.findFirst({
        where: { userId: currentUserId, tenantId, deletedAt: null },
        select: { id: true },
      });

      if (!staffRecord) {
        // Staff member has no staff record — return empty
        return {
          items: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }

      where.assignedStaffId = staffRecord.id;
    }

    const [conversations, total] = await this.prisma.db.$transaction([
      this.prisma.db.conversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          status: true,
          state: true,
          updatedAt: true,
          createdAt: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
          assignedStaff: {
            select: { id: true, name: true },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              content: true,
              direction: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.db.conversation.count({ where }),
    ]);

    const items: ConversationListItem[] = conversations.map((conv) => ({
      id: conv.id,
      status: conv.status,
      state: conv.state,
      customer: conv.customer,
      lastMessage: conv.messages[0] ?? null,
      assignedStaff: conv.assignedStaff,
      unreadCount: 0, // Placeholder — Phase 6 notification system will populate this
      updatedAt: conv.updatedAt,
      createdAt: conv.createdAt,
    }));

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(
    id: string,
    currentUserId: string,
    currentUserRole: string,
  ): Promise<ConversationListItem> {
    const tenantId = this.prisma.getTenantId();

    await this.usageLimitService.assertLimit(tenantId, 'maxMessages');

    const conversation = await this.prisma.db.conversation.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        status: true,
        state: true,
        updatedAt: true,
        createdAt: true,
        customer: {
          select: { id: true, name: true, phone: true },
        },
        assignedStaff: {
          select: { id: true, name: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            direction: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException({
        errorCode: 'CONVERSATION_NOT_FOUND',
        message: `Conversation with ID ${id} not found`,
      });
    }

    // RBAC: STAFF can only access their assigned conversations
    if (currentUserRole === UserRole.STAFF) {
      const staffRecord = await this.prisma.db.staff.findFirst({
        where: { userId: currentUserId, tenantId, deletedAt: null },
        select: { id: true },
      });

      if (!staffRecord || conversation.assignedStaff?.id !== staffRecord.id) {
        throw new ForbiddenException({
          errorCode: 'CONVERSATION_ACCESS_DENIED',
          message: 'You do not have access to this conversation.',
        });
      }
    }

    return {
      id: conversation.id,
      status: conversation.status,
      state: conversation.state,
      customer: conversation.customer,
      lastMessage: conversation.messages[0] ?? null,
      assignedStaff: conversation.assignedStaff,
      unreadCount: 0,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
    };
  }

  async getMessages(
    conversationId: string,
    query: MessageQueryDto,
    currentUserId: string,
    currentUserRole: string,
  ): Promise<CursorPaginatedMessages> {
    const tenantId = this.prisma.getTenantId();
    const limit = query.limit ?? 30;

    // Verify conversation exists + RBAC
    await this.findOne(conversationId, currentUserId, currentUserRole);

    // Decode cursor — it is a base64-encoded ISO date string
    let cursorDate: Date | undefined;
    if (query.cursor) {
      const decoded = Buffer.from(query.cursor, 'base64').toString('utf-8');
      cursorDate = new Date(decoded);
    }

    const messages = await this.prisma.db.message.findMany({
      where: {
        tenantId,
        conversationId,
        // Fetch messages older than the cursor (going backwards in time)
        ...(cursorDate && { createdAt: { lt: cursorDate } }),
      },
      orderBy: { createdAt: 'desc' },
      // Fetch one extra to determine if there are more pages
      take: limit + 1,
      select: {
        id: true,
        content: true,
        direction: true,
        messageType: true,
        status: true,
        createdAt: true,
      },
    });

    const hasMore = messages.length > limit;
    const pageMessages = hasMore ? messages.slice(0, limit) : messages;

    // Encode next cursor from the oldest message in this page
    const oldest = pageMessages[pageMessages.length - 1];
    const nextCursor =
      hasMore && oldest
        ? Buffer.from(oldest.createdAt.toISOString()).toString('base64')
        : null;

    // Return in chronological order (oldest first) for chat UI rendering
    return {
      items: pageMessages.reverse(),
      nextCursor,
      hasMore,
    };
  }

  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
    currentUserId: string,
    currentUserRole: string,
  ): Promise<MessageItem> {
    const tenantId = this.prisma.getTenantId();

    // Verify conversation exists + RBAC check
    await this.findOne(conversationId, currentUserId, currentUserRole);

    // Fetch the WhatsApp number for this conversation
    const fullConversation = await this.prisma.db.conversation.findFirst({
      where: { id: conversationId, tenantId },
      select: {
        whatsappNumberId: true,
        whatsappNumber: {
          select: { phoneNumberId: true },
        },
        customer: {
          select: { phone: true },
        },
      },
    });

    if (!fullConversation) {
      throw new NotFoundException({
        errorCode: 'CONVERSATION_NOT_FOUND',
        message: `Conversation with ID ${conversationId} not found`,
      });
    }

    // Create message record
    const message = await this.prisma.db.message.create({
      data: {
        tenantId,
        conversationId,
        messageType: MessageType.TEXT,
        direction: 'OUTBOUND',
        content: dto.content,
        status: MessageStatus.QUEUED,
      },
      select: {
        id: true,
        content: true,
        direction: true,
        messageType: true,
        status: true,
        createdAt: true,
      },
    });

    // Update conversation updatedAt so it bubbles to top of inbox
    await this.prisma.db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Enqueue to whatsapp-outbound worker
    await this.outboundQueue.add(
      'send-message',
      {
        messageId: message.id,
        tenantId,
        conversationId,
        phoneNumberId: fullConversation.whatsappNumber?.phoneNumberId,
        recipientPhone: fullConversation.customer.phone,
        content: dto.content,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    this.logger.log(
      `Manual message queued: ${message.id} for conversation: ${conversationId}`,
    );

    return message;
  }

  async updateStatus(
    id: string,
    dto: UpdateConversationDto,
    currentUserId: string,
    currentUserRole: string,
  ): Promise<ConversationListItem> {
    const tenantId = this.prisma.getTenantId();

    // Verify existence + RBAC
    await this.findOne(id, currentUserId, currentUserRole);

    await this.prisma.db.conversation.update({
      where: { id, tenantId },
      data: { status: dto.status },
    });

    this.logger.log(
      `Conversation ${id} status updated to ${dto.status} by user ${currentUserId}`,
    );

    return this.findOne(id, currentUserId, currentUserRole);
  }
}
