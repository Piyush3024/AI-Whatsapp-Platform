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

interface FastifyRequestWithRawBody extends FastifyRequest {
  rawBody?: Buffer;
}

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequestWithRawBody>();

    const signatureHeader = request.headers['x-hub-signature-256'];

    if (typeof signatureHeader !== 'string') {
      this.logger.warn(
        'Webhook request received without X-Hub-Signature-256 header',
        'WebhookSignatureGuard',
      );
      throw new UnauthorizedException('Missing webhook signature header.');
    }

    const rawBody = request.rawBody;

    if (!rawBody) {
      this.logger.error(
        'Raw body not available — ensure rawBody: true is set in main.ts',
        'WebhookSignatureGuard',
      );
      throw new UnauthorizedException('Raw body unavailable for verification.');
    }

    const appSecret = this.config.get<string>('whatsapp.appSecret')!;
    const expectedHash = createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    const expectedSignature = `sha256=${expectedHash}`;

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
