import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service.js';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';
import { UserRole } from '@whatsapp-ai/db/generated/prisma';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    tenantId: string;
    createdAt: string;
    emailVerifiedAt: string | null;
  };
}
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existingUser = await this.prisma.db.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException(
        'This email is already registered. Please login or use a different email.',
      );
    }

    const slug = await this._generateUniqueSlug(dto.businessName);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const { tenant, user } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.businessName,
          slug,
          status: 'TRIAL',
        },
      });

      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email.toLowerCase(),
          passwordHash,
        },
      });

      await tx.tenantMember.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: UserRole.OWNER,
          status: 'ACTIVE',
        },
      });

      return { tenant, user };
    });

    this.logger.log(
      `New tenant registered: ${tenant.slug} (userId: ${user.id})`,
      'AuthService',
    );

    this._createAndSendVerificationEmail(user.id, user.email, user.name).catch(
      (err: unknown) => {
        this.logger.error(
          { err, userId: user.id },
          'Failed to send verification email on register',
        );
      },
    );

    const tokens = await this._generateAndStoreTokens({
      sub: user.id,
      tenantId: tenant.id,
      role: UserRole.OWNER,
      email: user.email,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: UserRole.OWNER,
        tenantId: tenant.id,
        createdAt: user.createdAt.toISOString(),
        emailVerifiedAt: null,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.db.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    const isPasswordValid =
      user && (await bcrypt.compare(dto.password, user.passwordHash));

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException('Wrong Credentials.');
    }

    const member = await this.prisma.tenantMember.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    if (!member) {
      throw new UnauthorizedException(
        'Your account is not linked to any tenant or has been suspended.',
      );
    }

    this.logger.log(`User logged in: ${user.id}`, 'AuthService');

    const tokens = await this._generateAndStoreTokens({
      sub: user.id,
      tenantId: member.tenantId,
      role: member.role,
      email: user.email,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: member.role,
        tenantId: member.tenantId,
        createdAt: user.createdAt.toISOString(),
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      },
    };
  }

  async refresh(
    userId: string,
    tenantId: string,
    role: string,
    email: string,
  ): Promise<AuthTokens> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        tenantId,
      },
    });

    this.logger.log(`Tokens refreshed for user: ${userId}`, 'AuthService');

    const tokens = await this._generateAndStoreTokens({
      sub: userId,
      tenantId,
      role,
      email,
    });

    const userRecord = await this.prisma.db.user.findUnique({
      where: { id: userId },
    });

    return {
      ...tokens,
      user: {
        id: userId,
        email,
        name: userRecord?.name ?? '',
        role: role as UserRole,
        tenantId,
        createdAt: userRecord?.createdAt.toISOString() ?? '',
        emailVerifiedAt: userRecord?.emailVerifiedAt?.toISOString() ?? null,
      },
    };
  }

  async logout(userId: string, tenantId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, tenantId },
    });

    this.logger.log(`User logged out: ${userId}`, 'AuthService');
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      this.logger.log(
        `Forgot password: email not found (silent) — ${email}`,
        'AuthService',
      );
      return;
    }

    await this.prisma.db.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        expiresAt: new Date(),
      },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const appUrl = this.config.getOrThrow<string>('mail.appUrl');
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    await this.mail.sendPasswordReset({
      toEmail: user.email,
      name: user.name,
      resetUrl,
      expiresAt,
    });

    this.logger.log(
      `Password reset email sent to userId: ${user.id}`,
      'AuthService',
    );
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const record = await this.prisma.db.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) {
      throw new BadRequestException('Verification link is invalid.');
    }

    if (record.usedAt !== null) {
      throw new BadRequestException(
        'This verification link has already been used.',
      );
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException(
        'Verification link has expired. Request a new one.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.db.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.db.emailVerificationToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      }),
    ]);

    this.logger.log(
      `Email verified for userId: ${record.userId}`,
      'AuthService',
    );
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      this.logger.log(
        `Resend verification: email not found (silent) — ${email}`,
        'AuthService',
      );
      return;
    }

    if (user.emailVerifiedAt !== null) {
      return;
    }

    await this._createAndSendVerificationEmail(user.id, user.email, user.name);

    this.logger.log(
      `Verification email resent for userId: ${user.id}`,
      'AuthService',
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await this.prisma.db.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or Expired Reset Link.');
    }

    if (resetToken.usedAt !== null) {
      throw new BadRequestException('This reset link has already been used.');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException(
        'Reset link is expired. Please request a new forgot password link.',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.db.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.db.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      }),
      this.prisma.db.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    this.logger.log(
      `Password reset successful for userId: ${resetToken.userId}`,
      'AuthService',
    );
  }

  async me(userId: string, tenantId: string): Promise<object> {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });

    const member = await this.prisma.db.tenantMember.findFirst({
      where: { userId, tenantId },
      select: { role: true, status: true },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, status: true },
    });

    return { user, member, tenant };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async _generateAndStoreTokens(
    payload: JwtPayload,
  ): Promise<Omit<AuthTokens, 'user'>> {
    const accessExpiresIn: string =
      this.config.get<string>('jwt.expiresIn') ?? '15m';
    const refreshExpiresIn: string =
      this.config.get<string>('jwt.refreshExpiresIn') ?? '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...payload },
        {
          secret: this.config.get<string>('jwt.secret'),
          expiresIn: this._parseExpiryToSeconds(accessExpiresIn),
        },
      ),
      this.jwt.signAsync(
        { ...payload },
        {
          secret: this.config.get<string>('jwt.refreshSecret'),
          expiresIn: this._parseExpiryToSeconds(refreshExpiresIn),
        },
      ),
    ]);

    const expiresAt = this._parseExpiry(refreshExpiresIn);

    await this.prisma.db.refreshToken.create({
      data: {
        userId: payload.sub,
        tenantId: payload.tenantId,
        token: refreshToken,
        expiresAt,
      },
    });

    const expiresInSeconds = this._parseExpiryToSeconds(accessExpiresIn);

    return { accessToken, refreshToken, expiresIn: expiresInSeconds };
  }

  private async _generateUniqueSlug(businessName: string): Promise<string> {
    const baseSlug = businessName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50);

    const existing = await this.prisma.tenant.findUnique({
      where: { slug: baseSlug },
    });

    if (!existing) return baseSlug;

    let suffix = 1;
    while (true) {
      const candidate = `${baseSlug}-${suffix}`;
      const conflict = await this.prisma.tenant.findUnique({
        where: { slug: candidate },
      });
      if (!conflict) return candidate;
      suffix++;
    }
  }

  private _parseExpiry(expiry: string): Date {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    const now = Date.now();

    const multipliers: Record<string, number> = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };

    return new Date(now + value * (multipliers[unit] ?? 60_000));
  }

  private _parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3_600,
      d: 86_400,
    };

    return value * (multipliers[unit] ?? 60);
  }

  private async _createAndSendVerificationEmail(
    userId: string,
    email: string,
    name: string,
  ): Promise<void> {
    await this.prisma.db.emailVerificationToken.updateMany({
      where: {
        userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { expiresAt: new Date() },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.db.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    const appUrl = this.config.getOrThrow<string>('mail.appUrl');
    const verifyUrl = `${appUrl}/verify-email?token=${rawToken}`;

    await this.mail.sendEmailVerification({
      toEmail: email,
      name,
      verifyUrl,
      expiresAt,
    });
  }
}
