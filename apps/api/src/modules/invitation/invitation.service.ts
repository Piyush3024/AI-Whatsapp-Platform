// apps/api/src/modules/invitation/invitation.service.ts
//
// Invitation Flow:
//
//  1. OWNER/ADMIN → POST /invitations
//     - Duplicate check (same email + tenant + INVITED)
//     - Crypto-random token (32 bytes hex = 64 chars)
//     - DB mein Invitation record create karo (48h expiry)
//     - Resend se email bhejo
//
//  2. Anyone → GET /invitations/validate?token=xxx
//     - Token valid hai? Expired? Already used?
//     - Frontend isko "Accept" page render karne ke liye use karta hai
//
//  3. Anyone → POST /invitations/accept
//     - Token verify karo
//     - Email se User exist karta hai? → sirf TenantMember add karo
//     - Naya user? → User + TenantMember banao, password hash karo
//     - Invitation status ACTIVE karo
//     - Welcome email bhejo
//     - Auth tokens return karo (auto-login)

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import type { CreateInvitationDto } from './dto/create-invitation.dto.js';
import type { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import type { AuthTokens } from '../auth/auth.service.js';
import type { JwtPayload } from '../auth/strategies/jwt.strategy.js';

const BCRYPT_ROUNDS = 12;
const INVITE_EXPIRY_HOURS = 48;
const TOKEN_BYTES = 32; // 32 bytes = 64-char hex — cryptographically secure

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Create Invitation ────────────────────────────────────────────────────

  async createInvitation(
    tenantId: string,
    inviterUserId: string,
    dto: CreateInvitationDto,
  ): Promise<{ id: string; email: string; expiresAt: Date }> {
    // Inviter info fetch karo for email
    const inviter = await this.prisma.db.user.findUnique({
      where: { id: inviterUserId },
      select: { name: true },
    });

    const tenant = await this.prisma.db.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { name: true },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    // Check 1: Invited email already active member hai?
    const existingMember = await this.prisma.db.tenantMember.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        user: { email: dto.email },
      },
    });

    if (existingMember) {
      throw new ConflictException(
        `${dto.email} already is tenant ka member hai.`,
      );
    }

    // Check 2: Pending invitation already exist karta hai?
    const existingInvite = await this.prisma.db.invitation.findFirst({
      where: {
        tenantId,
        email: dto.email,
        status: 'INVITED',
        expiresAt: { gt: new Date() }, // sirf unexpired
      },
    });

    if (existingInvite) {
      throw new ConflictException(
        `${dto.email} ke liye already ek pending invitation hai. Pehle revoke karo.`,
      );
    }

    // Generate cryptographically secure token
    const token = randomBytes(TOKEN_BYTES).toString('hex');

    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    // DB mein invitation create karo
    const invitation = await this.prisma.db.invitation.create({
      data: {
        tenantId,
        email: dto.email,
        role: dto.role,
        token,
        status: 'INVITED',
        expiresAt,
      },
    });

    // Email bhejo — fire after DB commit
    try {
      await this.mail.sendInvitation({
        toEmail: dto.email,
        tenantName: tenant.name,
        inviterName: inviter?.name ?? 'A team member',
        role: dto.role,
        inviteToken: token,
        expiresAt,
      });
    } catch (err) {
      // Email fail hone pe invitation revoke karo — atomic cleanup
      await this.prisma.db.invitation.delete({ where: { id: invitation.id } });
      throw err; // MailService already logs + throws InternalServerErrorException
    }

    this.logger.log(
      { tenantId, email: dto.email, role: dto.role },
      'Invitation created and email sent',
    );

    return { id: invitation.id, email: invitation.email, expiresAt };
  }

  // ── List Invitations ─────────────────────────────────────────────────────

  async listInvitations(tenantId: string) {
    return this.prisma.db.invitation.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  // ── Validate Token ───────────────────────────────────────────────────────
  // Frontend "Accept" page calls this to show invite details before user fills form

  async validateToken(token: string): Promise<{
    email: string;
    role: string;
    tenantName: string;
    expiresAt: Date;
  }> {
    const invitation = await this.prisma.db.invitation.findUnique({
      where: { token },
      include: { tenant: { select: { name: true } } },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or already used');
    }

    if (invitation.status !== 'INVITED') {
      throw new BadRequestException('Ye invitation already use ho chuka hai');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException(
        'Invitation expire ho gaya hai. Naya invite maango.',
      );
    }

    return {
      email: invitation.email,
      role: invitation.role,
      tenantName: invitation.tenant.name,
      expiresAt: invitation.expiresAt,
    };
  }

  // ── Accept Invitation ────────────────────────────────────────────────────

  async acceptInvitation(dto: AcceptInvitationDto): Promise<AuthTokens> {
    // Step 1: Token validate karo (reuse validateToken logic)
    const invitation = await this.prisma.db.invitation.findUnique({
      where: { token: dto.token },
      include: { tenant: { select: { id: true, name: true } } },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or already used');
    }

    if (invitation.status !== 'INVITED') {
      throw new BadRequestException('Ye invitation already use ho chuka hai');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException(
        'Invitation expire ho gaya hai. Naya invite maango.',
      );
    }

    // Step 2: User already exist karta hai is email se?
    const existingUser = await this.prisma.db.user.findUnique({
      where: { email: invitation.email },
    });

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    let userId: string;

    if (existingUser) {
      // User exist karta hai — sirf TenantMember add karo
      // (user dusre tenant ka member ho sakta hai)
      userId = existingUser.id;

      const alreadyMember = await this.prisma.db.tenantMember.findFirst({
        where: { tenantId: invitation.tenantId, userId, deletedAt: null },
      });

      if (alreadyMember) {
        // Invitation outdated — mark used anyway
        await this.prisma.db.invitation.update({
          where: { id: invitation.id },
          data: { status: 'ACTIVE' },
        });
        throw new ConflictException('Aap already is tenant ke member hain.');
      }

      // TenantMember + invitation update — transaction mein
      await this.prisma.$transaction(async (tx) => {
        await tx.tenantMember.create({
          data: {
            tenantId: invitation.tenantId,
            userId,
            role: invitation.role,
            status: 'ACTIVE',
          },
        });

        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: 'ACTIVE' },
        });
      });
    } else {
      // Step 3: Naya user banao
      const result = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            name: dto.name,
            email: invitation.email,
            passwordHash,
          },
        });

        await tx.tenantMember.create({
          data: {
            tenantId: invitation.tenantId,
            userId: newUser.id,
            role: invitation.role,
            status: 'ACTIVE',
          },
        });

        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: 'ACTIVE' },
        });

        return newUser;
      });

      userId = result.id;
    }

    this.logger.log(
      { userId, tenantId: invitation.tenantId, email: invitation.email },
      'Invitation accepted — member added',
    );

    // Step 4: Welcome email bhejo (non-blocking — don't fail acceptance on email error)
    this.mail
      .sendWelcome({
        toEmail: invitation.email,
        name: dto.name,
        tenantName: invitation.tenant.name,
      })
      .catch((err: unknown) => {
        this.logger.warn(
          { err, email: invitation.email },
          'Welcome email send failed (non-critical)',
        );
      });

    // Step 5: Auto-login — tokens generate karo
    return this._generateTokens({
      sub: userId,
      tenantId: invitation.tenantId,
      role: invitation.role,
      email: invitation.email,
    });
  }

  // ── Revoke Invitation ────────────────────────────────────────────────────

  async revokeInvitation(
    tenantId: string,
    invitationId: string,
  ): Promise<void> {
    const invitation = await this.prisma.db.invitation.findFirst({
      where: { id: invitationId, tenantId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'INVITED') {
      throw new BadRequestException(
        'Sirf pending invitations revoke ki ja sakti hain',
      );
    }

    // Hard delete — invitation table soft delete nahi karta (schema mein deletedAt nahi)
    await this.prisma.db.invitation.delete({
      where: { id: invitationId },
    });

    this.logger.log(
      { tenantId, invitationId, email: invitation.email },
      'Invitation revoked',
    );
  }

  // ── Private: Token Generator ─────────────────────────────────────────────
  // auth.service.ts se duplicate avoid karne ke liye — InvitationService
  // ko AuthService inject karna circular dependency risk hai.
  // Pattern: shared token logic ko AuthService mein rakhna better hota —
  // lekin abhi simple rakhte hain.

  private async _generateTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessExpiresIn = this.config.get<string>('jwt.expiresIn') ?? '15m';
    const refreshExpiresIn =
      this.config.get<string>('jwt.refreshExpiresIn') ?? '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...payload },
        {
          secret: this.config.get<string>('jwt.secret'),
          expiresIn: this._parseToSeconds(accessExpiresIn),
        },
      ),
      this.jwt.signAsync(
        { ...payload },
        {
          secret: this.config.get<string>('jwt.refreshSecret'),
          expiresIn: this._parseToSeconds(refreshExpiresIn),
        },
      ),
    ]);

    const expiresAt = this._parseToDate(refreshExpiresIn);

    await this.prisma.db.refreshToken.create({
      data: {
        userId: payload.sub,
        tenantId: payload.tenantId,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this._parseToSeconds(accessExpiresIn),
    };
  }

  private _parseToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    const map: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (map[unit] ?? 60);
  }

  private _parseToDate(expiry: string): Date {
    return new Date(Date.now() + this._parseToSeconds(expiry) * 1000);
  }
}
