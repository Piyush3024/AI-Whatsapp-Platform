import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import * as OTPAuth from 'otpauth';
import { TOTP, Secret } from 'otpauth';
import * as qrcode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly appName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.appName =
      this.config.get<string>('mail.appName') ?? 'WhatsApp AI Platform';
  }

  async setup(userId: string): Promise<{
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

    // if (user.twoFactorSecret) {
    //   throw new BadRequestException(
    //     'A 2FA setup is already in progress. Please scan the existing QR code or disable 2FA first.',
    //   );
    // }

    // const totp = new OTPAuth.TOTP({
    //   issuer: this.appName,
    //   label: user.email,
    //   algorithm: 'SHA1',
    //   digits: 6,
    //   period: 30,
    //   secret: new OTPAuth.Secret({ size: 20 }),
    // });

    const totp = new TOTP({
      issuer: this.appName,
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: new Secret({ size: 20 }),
    });

    const otpauthUrl = totp.toString();
    const secretBase32 = totp.secret.base32;

    await this.prisma.db.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secretBase32,
        twoFactorEnabled: false,
      },
    });

    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    this.logger.log(`2FA setup initiated for userId: ${userId}`);

    return {
      otpauthUrl,
      qrCodeDataUrl,
      secret: secretBase32,
    };
  }

  async enable(userId: string, token: string): Promise<void> {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled.');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException(
        '2FA setup not initiated. Call /auth/2fa/setup first.',
      );
    }

    this.logger.log(`Secret in DB: "${user.twoFactorSecret}"`);
    this.logger.log(`Token received: "${token}"`);

    // Also generate what the current valid token SHOULD be:
    const totp = new TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(user.twoFactorSecret),
    });
    const expectedToken = totp.generate();
    this.logger.log(`Expected token right now: "${expectedToken}"`);

    const isValid = this._verifyToken(user.twoFactorSecret, token);

    if (!isValid) {
      throw new UnauthorizedException(
        'Invalid TOTP code. Please check your authenticator app and try again.',
      );
    }

    await this.prisma.db.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    this.logger.log(`2FA enabled for userId: ${userId}`);
  }

  async verify(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return true;
    }

    return this._verifyToken(user.twoFactorSecret, token);
  }

  async disable(userId: string, token: string): Promise<void> {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
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

    const isValid = this._verifyToken(user.twoFactorSecret, token);

    if (!isValid) {
      throw new UnauthorizedException(
        'Invalid TOTP code. Please verify your identity to disable 2FA.',
      );
    }

    await this.prisma.db.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    this.logger.log(`2FA disabled for userId: ${userId}`);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _verifyToken(secretBase32: string, token: string): boolean {
    // const totp = new OTPAuth.TOTP({
    //   algorithm: 'SHA1',
    //   digits: 6,
    //   period: 30,
    //   secret: OTPAuth.Secret.fromBase32(secretBase32),
    // });

    const totp = new TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secretBase32),
    });

    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  }
}
