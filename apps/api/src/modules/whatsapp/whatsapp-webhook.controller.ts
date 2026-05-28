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

  @Get()
  @ApiOperation({ summary: 'WhatsApp webhook verification (Meta handshake)' })
  verifyWebhook(
    @Query() query: WhatsAppVerifyQuery,
    @Res() reply: FastifyReply,
  ): void {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    this.logger.log(
      `Webhook verification request received — mode: ${mode}`,
      'WhatsAppWebhookController',
    );

    if (
      mode === 'subscribe' &&
      token === this.config.get<string>('whatsapp.verifyToken')
    ) {
      this.logger.log(
        'Webhook verification successful',
        'WhatsAppWebhookController',
      );

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

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(WebhookSignatureGuard)
  @ApiOperation({ summary: 'WhatsApp inbound messages receive karo' })
  receiveWebhook(@Body() payload: WhatsAppWebhookPayload): { status: string } {
    this.logger.log(
      `Webhook received — entries: ${payload.entry?.length ?? 0}`,
      'WhatsAppWebhookController',
    );

    void this.webhookService.processWebhook(payload).catch((error: Error) => {
      this.logger.error(
        `Failed to queue webhook payload: ${error.message}`,
        error.stack,
        'WhatsAppWebhookController',
      );
    });

    return { status: 'ok' };
  }
}
