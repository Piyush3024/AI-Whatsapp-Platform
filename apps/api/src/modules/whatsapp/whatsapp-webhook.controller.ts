import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  UseGuards,
  Res,
  Logger,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator.js';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard.js';
import { WhatsAppWebhookService } from './whatsapp-webhook.service.js';
import type {
  WhatsAppWebhookPayload,
  WhatsAppVerifyQuery,
} from './dto/webhook-payload.dto.js';

/**
 * WhatsAppWebhookController
 *
 * Do endpoints:
 *
 * GET /api/v1/whatsapp/webhook
 *   — Meta ka verification handshake
 *   — hub.verify_token check karta hai
 *   — hub.challenge return karta hai (plain text/number)
 *
 * POST /api/v1/whatsapp/webhook
 *   — Meta inbound messages + status updates bhejta hai
 *   — WebhookSignatureGuard HMAC verify karta hai
 *   — 200 turant return karta hai
 *   — Async processing BullMQ queue mein
 *
 * @Public() — JWT nahi chahiye webhook pe
 * @SkipThrottle() — Meta ke servers rate limit nahi karne
 */
@ApiTags('whatsapp')
@Public()
@SkipThrottle()
@Controller('whatsapp/webhook')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly webhookService: WhatsAppWebhookService,
    private readonly config: ConfigService,
  ) {}

  /**
   * GET /api/v1/whatsapp/webhook
   *
   * Meta pehli baar webhook URL set karte waqt ye request bhejta hai.
   * Verify token match karo aur hub.challenge return karo.
   *
   * Query params:
   *  hub.mode          = "subscribe"
   *  hub.verify_token  = tumhara WHATSAPP_VERIFY_TOKEN
   *  hub.challenge     = Meta ka random string — wahi return karo
   */
  @Get()
  @ApiOperation({ summary: 'WhatsApp webhook verification (Meta handshake)' })
  async verifyWebhook(
    @Query() query: WhatsAppVerifyQuery,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    this.logger.log(
      `Webhook verification request received — mode: ${mode}`,
      'WhatsAppWebhookController',
    );

    // Mode aur token dono sahi hone chahiye
    if (
      mode === 'subscribe' &&
      token === this.config.get<string>('whatsapp.verifyToken')
    ) {
      this.logger.log(
        'Webhook verification successful',
        'WhatsAppWebhookController',
      );
      // challenge plain text mein return karo — Meta yahi expect karta hai
      reply
        .header('Content-Type', 'text/plain')
        .status(HttpStatus.OK)
        .send(challenge);
      return;
    }

    this.logger.warn(
      `Webhook verification failed — token mismatch or wrong mode: ${mode}`,
      'WhatsAppWebhookController',
    );

    throw new ForbiddenException(
      'Webhook verification failed. Token mismatch.',
    );
  }

  /**
   * POST /api/v1/whatsapp/webhook
   *
   * Meta yahan actual messages aur status updates bhejta hai.
   *
   * Flow:
   * 1. WebhookSignatureGuard HMAC verify karta hai (before this method)
   * 2. 200 OK turant return karo — Meta ko 5 seconds mein chahiye
   * 3. Async processing queue mein push karo
   *
   * ⚠️  Kabhi bhi yahan heavy processing mat karo — timeout hoga.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(WebhookSignatureGuard)
  @ApiOperation({ summary: 'WhatsApp inbound messages receive karo' })
  async receiveWebhook(
    @Body() payload: WhatsAppWebhookPayload,
  ): Promise<{ status: string }> {
    this.logger.log(
      `Webhook received — entries: ${payload.entry?.length ?? 0}`,
      'WhatsAppWebhookController',
    );

    // Fire and forget — await mat karo response delay hoga
    // Errors BullMQ retry logic handle karega
    this.webhookService.processWebhook(payload).catch((error: Error) => {
      this.logger.error(
        `Failed to queue webhook payload: ${error.message}`,
        error.stack,
        'WhatsAppWebhookController',
      );
    });

    // Meta ko turant 200 chahiye — processing async hai
    return { status: 'ok' };
  }
}
