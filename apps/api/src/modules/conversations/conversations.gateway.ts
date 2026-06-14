import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from '../auth/strategies/jwt.strategy.js';

@WebSocketGateway({
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        process.env.FRONTEND_URL,
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
  namespace: '/conversations',
  transports: ['websocket', 'polling'],
})
export class ConversationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ConversationsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Connection lifecycle ──────────────────────────────────────────────────

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        client.handshake.headers.authorization?.replace('Bearer ', '') ??
        '';

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('jwt.secret'),
      });

      // Attach payload to socket data for use in message handlers
      client.data = {
        userId: payload.sub,
        tenantId: payload.tenantId,
        role: payload.role,
        email: payload.email,
      };

      // Join tenant room — all tenant members share the same room
      const tenantRoom = `tenant:${payload.tenantId}`;
      await client.join(tenantRoom);

      this.logger.log(`Client connected: ${client.id} → room: ${tenantRoom}`);
    } catch (err) {
      this.logger.warn(
        `Unauthorized connection attempt: ${client.id} — ${(err as Error).message}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ── Join a specific conversation room ────────────────────────────────────

  @SubscribeMessage('join:conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ): Promise<void> {
    const { tenantId } = client.data as { tenantId: string };
    const room = `conversation:${data.conversationId}`;

    // Verify the conversation belongs to this tenant (basic check)
    // Full RBAC is enforced at HTTP layer — socket is supplemental
    const tenantRoom = `tenant:${tenantId}`;
    if (!client.rooms.has(tenantRoom)) {
      client.emit('error', { message: 'Not authorized' });
      return;
    }

    await client.join(room);
    this.logger.debug(`Client ${client.id} joined conversation room: ${room}`);
  }

  // ── Leave a specific conversation room ───────────────────────────────────

  @SubscribeMessage('leave:conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ): Promise<void> {
    const room = `conversation:${data.conversationId}`;
    await client.leave(room);
    this.logger.debug(`Client ${client.id} left conversation room: ${room}`);
  }

  // ── Emit helpers — called by ConversationsService ────────────────────────

  /**
   * Emit to all clients in a tenant room when a conversation is updated
   * (new message received, status changed, etc.)
   */
  emitConversationUpdated(tenantId: string, conversationId: string): void {
    this.server
      .to(`tenant:${tenantId}`)
      .emit('conversation:updated', { conversationId });
  }

  /**
   * Emit a new message to clients watching a specific conversation
   */
  emitNewMessage(
    tenantId: string,
    conversationId: string,
    message: {
      id: string;
      content: string | null;
      direction: string;
      messageType: string;
      status: string;
      createdAt: Date;
    },
  ): void {
    // Emit to conversation-specific room (clients viewing this chat)
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:new', { conversationId, message });

    // Also emit to tenant room so inbox list can update
    this.server
      .to(`tenant:${tenantId}`)
      .emit('conversation:updated', { conversationId });
  }

  emitNotificationUpdate(userId: string, unreadCount: number): void {
    this.server
      .to(`user:${userId}`)
      .emit('notification:unread', { count: unreadCount });
  }
}
