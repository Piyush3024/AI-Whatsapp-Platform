import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { FastifyRequest } from 'fastify';

/**
 * WebhookSignatureGuard — WhatsApp HMAC-SHA256 Signature Verification
 *
 * Meta har POST webhook request pe X-Hub-Signature-256 header bhejta hai.
 * Format: "sha256=<hmac_hash>"
 *
 * Verification process:
 * 1. Raw request body leke HMAC-SHA256 compute karo (WHATSAPP_APP_SECRET se)
 * 2. Meta ka signature header parse karo
 * 3. timingSafeEqual se compare karo — timing attacks prevent karta hai
 *
 * ⚠️  CRITICAL: Raw body chahiye — parsed JSON se hash MATCH NAHI KAREGA.
 * Isliye main.ts mein rawBody: true set kiya hai.
 *
 * ⚠️  timingSafeEqual kyun?
 * Normal === comparison timing leak karta hai — attacker measure kar sakta
 * hai kitne characters match hue. timingSafeEqual hamesha same time leta hai.
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // ── Step 1: Signature header nikalo ──────────────────────────────────
    const signatureHeader = (request.headers as Record<string, string>)[
      'x-hub-signature-256'
    ];

    if (!signatureHeader) {
      this.logger.warn(
        'Webhook request received without X-Hub-Signature-256 header',
        'WebhookSignatureGuard',
      );
      throw new UnauthorizedException('Missing webhook signature header.');
    }

    // ── Step 2: Raw body nikalo ───────────────────────────────────────────
    // NestJS rawBody: true se milta hai — Buffer format mein
    const rawBody = (request as any).rawBody as Buffer | undefined;

    if (!rawBody) {
      this.logger.error(
        'Raw body not available — ensure rawBody: true is set in main.ts',
        'WebhookSignatureGuard',
      );
      throw new UnauthorizedException('Raw body unavailable for verification.');
    }

    // ── Step 3: Expected signature compute karo ───────────────────────────
    const appSecret = this.config.get<string>('whatsapp.appSecret')!;
    const expectedHash = createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    const expectedSignature = `sha256=${expectedHash}`;

    // ── Step 4: timingSafeEqual se compare karo ───────────────────────────
    // Dono buffers same length ke hone chahiye timingSafeEqual ke liye
    const sigBuffer = Buffer.from(signatureHeader, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (sigBuffer.length !== expectedBuffer.length) {
      this.logger.warn(
        'Webhook signature length mismatch — possible tampering',
        'WebhookSignatureGuard',
      );
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    const isValid = timingSafeEqual(sigBuffer, expectedBuffer);

    if (!isValid) {
      this.logger.warn(
        'Webhook signature verification failed — request rejected',
        'WebhookSignatureGuard',
      );
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    return true;
  }
}
