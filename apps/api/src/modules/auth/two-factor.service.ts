import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OTPAuth from 'otpauth';
const { TOTP, Secret } = OTPAuth;
import * as qrcode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';

const PENDING_SECRET_KEY = (userId: string) => `2fa:pending:${userId}`;
const USED_TOKEN_KEY = (userId: string) => `2fa:used-token:${userId}`;

const PENDING_TTL_SECONDS = 10 * 60;

const USED_TOKEN_TTL_SECONDS = 90;

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly appName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.appName =
      this.config.get<string>('mail.appName') ?? 'WhatsApp AI Platform';
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  async setup(
    userId: string,
    regenerate = false,
  ): Promise<{
    otpauthUrl: string;
    qrCodeDataUrl: string;
    secret: string;
  }> {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        '2FA is already enabled. Disable it first before setting up again.',
      );
    }

    const cleanIssuer = this.appName.replace(/\s+/g, '');

    const existingPending = regenerate
      ? null
      : await this.redis.get(PENDING_SECRET_KEY(userId));

    let secretBase32: string;

    if (existingPending) {
      secretBase32 = existingPending;
      await this.redis.set(
        PENDING_SECRET_KEY(userId),
        secretBase32,
        PENDING_TTL_SECONDS,
      );
      this.logger.log(
        `2FA setup resumed (existing pending secret) for userId: ${userId}`,
      );
    } else {
      const totp = new TOTP({
        issuer: cleanIssuer,
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: new Secret({ size: 20 }),
      });
      secretBase32 = totp.secret.base32;
      await this.redis.set(
        PENDING_SECRET_KEY(userId),
        secretBase32,
        PENDING_TTL_SECONDS,
      );
      this.logger.log(
        `2FA setup initiated (new secret, regenerate=${regenerate}) for userId: ${userId}`,
      );
    }

    const totp = new TOTP({
      issuer: cleanIssuer,
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secretBase32),
    });

    const otpauthUrl = totp.toString();
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    return { otpauthUrl, qrCodeDataUrl, secret: secretBase32 };
  }

  // ── Enable ─────────────────────────────────────────────────────────────────

  async enable(userId: string, token: string): Promise<void> {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled.');
    }

    const pendingSecret = await this.redis.get(PENDING_SECRET_KEY(userId));

    if (!pendingSecret) {
      throw new BadRequestException(
        '2FA setup session expired or not initiated. Please call /auth/2fa/setup again.',
      );
    }

    const delta = this._validateToken(pendingSecret, token);

    if (delta === null) {
      throw new UnauthorizedException(
        'Invalid TOTP code. Please check your authenticator app and try again.',
      );
    }

    await this._assertNotReplayed(userId, token);

    await this.prisma.db.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: pendingSecret,
        twoFactorEnabled: true,
      },
    });

    await this.redis.del(PENDING_SECRET_KEY(userId));

    await this._markTokenUsed(userId, token);

    this.logger.log(`2FA enabled for userId: ${userId}`);
  }

  // ── Verify ─────────────────────────────────────────────────────────────────

  async verify(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return true;
    }

    const delta = this._validateToken(user.twoFactorSecret, token);

    if (delta === null) {
      return false;
    }

    const isReplayed = await this._isTokenReplayed(userId, token);
    if (isReplayed) {
      this.logger.warn(`Replayed TOTP token detected for userId: ${userId}`);
      return false;
    }

    await this._markTokenUsed(userId, token);
    return true;
  }

  // ── Disable ────────────────────────────────────────────────────────────────

  async disable(userId: string, token: string): Promise<void> {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not currently enabled.');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('2FA secret not found.');
    }

    const delta = this._validateToken(user.twoFactorSecret, token);

    if (delta === null) {
      throw new UnauthorizedException(
        'Invalid TOTP code. Please verify your identity to disable 2FA.',
      );
    }

    await this._assertNotReplayed(userId, token);

    await this.prisma.db.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    await this.redis.del(USED_TOKEN_KEY(userId));

    this.logger.log(`2FA disabled for userId: ${userId}`);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Validates a TOTP token against a Base32 secret.
   * Normalises the secret (uppercase, strip spaces, ensure valid padding)
   * before constructing the TOTP object to guard against encoding edge-cases.
   *
   * @param secretBase32 - The stored Base32-encoded secret
   * @param token        - The 6-digit code from the authenticator app
   * @returns The time-step delta on success, or `null` on failure
   */
  private _validateToken(secretBase32: string, token: string): number | null {
    // Normalise: uppercase + strip whitespace + ensure valid Base32 padding
    const normalised = this._normaliseBase32(secretBase32);

    const totp = new TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(normalised),
    });

    // window: 1 → accepts current step ± 1 (i.e. ±30 s) to tolerate clock drift
    return totp.validate({ token, window: 1 });
  }

  /**
   * Normalises a Base32 string so it can be reliably decoded:
   * - Converts to uppercase
   * - Removes spaces and dashes (common separators in manual-entry secrets)
   * - Pads to the next multiple of 8 with '=' characters
   */
  private _normaliseBase32(secret: string): string {
    const stripped = secret.toUpperCase().replace(/[\s-]/g, '');
    const remainder = stripped.length % 8;
    return remainder === 0 ? stripped : stripped + '='.repeat(8 - remainder);
  }

  /**
   * Throws if the given token was already used within the replay-protection window.
   */
  private async _assertNotReplayed(
    userId: string,
    token: string,
  ): Promise<void> {
    const isReplayed = await this._isTokenReplayed(userId, token);
    if (isReplayed) {
      throw new UnauthorizedException(
        'This code has already been used. Please wait for a new code and try again.',
      );
    }
  }

  private async _isTokenReplayed(
    userId: string,
    token: string,
  ): Promise<boolean> {
    const stored = await this.redis.get(USED_TOKEN_KEY(userId));
    return stored === token;
  }

  private async _markTokenUsed(userId: string, token: string): Promise<void> {
    await this.redis.set(USED_TOKEN_KEY(userId), token, USED_TOKEN_TTL_SECONDS);
  }
}
