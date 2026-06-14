import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { ConversationsGateway } from './conversations.gateway.js';

const SOCKET_CHANNEL = 'socket:events';

interface SocketEvent {
  type: 'message:new' | 'conversation:updated';
  tenantId: string;
  conversationId: string;
}

@Injectable()
export class SocketSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SocketSubscriberService.name);
  private subscriber!: Redis;

  constructor(
    private readonly config: ConfigService,
    @Inject(forwardRef(() => ConversationsGateway))
    private readonly gateway: ConversationsGateway,
  ) {}

  onModuleInit(): void {
    const redisUrl =
      this.config.get<string>('redis.url') ?? 'redis://localhost:6379';

    this.subscriber = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });

    this.subscriber.on('error', (err: Error) => {
      this.logger.error(`Redis subscriber error: ${err.message}`);
    });

    void this.subscriber.subscribe(SOCKET_CHANNEL, (err) => {
      if (err) {
        this.logger.error(
          `Failed to subscribe to ${SOCKET_CHANNEL}: ${err.message}`,
        );
        return;
      }
      this.logger.log(`Subscribed to Redis channel: ${SOCKET_CHANNEL}`);
    });

    this.subscriber.on('message', (_channel: string, raw: string) => {
      try {
        const event = JSON.parse(raw) as SocketEvent;
        this._handleEvent(event);
      } catch (err) {
        this.logger.error({ err, raw }, 'Failed to parse socket event');
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscriber.quit();
  }

  private _handleEvent(event: SocketEvent): void {
    switch (event.type) {
      case 'message:new':
      case 'conversation:updated':
        this.gateway.emitConversationUpdated(
          event.tenantId,
          event.conversationId,
        );
        break;
      default:
        this.logger.warn({ event }, 'Unknown socket event type');
    }
  }
}
