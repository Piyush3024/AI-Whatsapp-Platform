import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';
import { UserRole } from '../../generated/prisma/client.js';

/**
 * Token response ka shape — login/register/refresh sab yahi return karte hain.
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds mein — frontend ko helpful hai
}

/**
 * Bcrypt rounds — 12 production standard hai.
 * Zyada rounds = zyada secure but slow.
 * 12 pe ek hash ~300ms leta hai — brute force ke liye impractical.
 */
const BCRYPT_ROUNDS = 12;

/**
 * AuthService
 *
 * Saari authentication business logic yahan hai:
 * - register(): Tenant + User + TenantMember ek saath banata hai
 * - login(): Email/password verify karta hai, tokens return karta hai
 * - refresh(): Refresh token verify karke naye tokens deta hai (rotation)
 * - logout(): DB se refresh token delete karta hai
 * - me(): Current user ki info return karta hai
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Naya tenant + owner user register karta hai.
   *
   * Steps:
   * 1. Email already exist karta hai? → ConflictException
   * 2. Business name se unique slug generate karo
   * 3. Slug already exist karta hai? → suffix add karo
   * 4. Password hash karo (bcrypt)
   * 5. Prisma interactive transaction mein:
   *    - Tenant create karo
   *    - User create karo
   *    - TenantMember create karo (OWNER role)
   * 6. Tokens generate karo aur return karo
   */
  async register(dto: RegisterDto): Promise<AuthTokens> {
    // ── Step 1: Email uniqueness check ────────────────────────────────────
    const existingUser = await this.prisma.db.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException(
        'Is email se already account ban chuka hai. Login karo ya alag email use karo.',
      );
    }

    // ── Step 2 & 3: Slug generate karo ───────────────────────────────────
    const slug = await this._generateUniqueSlug(dto.businessName);

    // ── Step 4: Password hash karo ────────────────────────────────────────
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // ── Step 5: DB transaction ────────────────────────────────────────────
    // Teen tables mein insert — ek bhi fail hua toh sab rollback.
    // Note: baseClient.$transaction use karo — RLS context set nahi hai
    // abhi kyunki ye registration hai (no tenant yet).
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

    // ── Step 6: Tokens generate karo ─────────────────────────────────────
    return this._generateAndStoreTokens({
      sub: user.id,
      tenantId: tenant.id,
      role: UserRole.OWNER,
      email: user.email,
    });
  }

  /**
   * Email + password se login karta hai.
   *
   * Steps:
   * 1. Email se user dhundho
   * 2. Password verify karo (bcrypt.compare)
   * 3. TenantMember active hai? Check karo
   * 4. Tokens generate karo
   */
  async login(dto: LoginDto): Promise<AuthTokens> {
    // ── Step 1: User dhundho ──────────────────────────────────────────────
    // findUnique soft-delete filter bypass karta hai — deletedAt wale users
    // ko bhi check karna hai (show specific error nahi karna security ke liye)
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // ── Step 2: Password verify karo ─────────────────────────────────────
    // Dono cases mein same error — email enumeration attack prevent karta hai.
    const isPasswordValid =
      user && (await bcrypt.compare(dto.password, user.passwordHash));

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException('Wrong Credentials.');
    }

    // ── Step 3: Active tenant membership check ────────────────────────────
    const member = await this.prisma.tenantMember.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    if (!member) {
      throw new UnauthorizedException(
        'Aapka account kisi bhi tenant se linked nahi hai ya suspend ho chuka hai.',
      );
    }

    this.logger.log(`User logged in: ${user.id}`, 'AuthService');

    // ── Step 4: Tokens generate karo ─────────────────────────────────────
    return this._generateAndStoreTokens({
      sub: user.id,
      tenantId: member.tenantId,
      role: member.role,
      email: user.email,
    });
  }

  /**
   * Refresh token se naye tokens generate karta hai (rotation pattern).
   *
   * Rotation matlab:
   * - Purana refresh token DB se delete ho jaata hai
   * - Naya refresh token DB mein save hota hai
   * - Dono naye tokens return hote hain
   *
   * Agar refresh token already use ho chuka (DB mein nahi mila) → 401.
   * Ye replay attack detect karta hai.
   */
  async refresh(
    userId: string,
    tenantId: string,
    role: string,
    email: string,
  ): Promise<AuthTokens> {
    // Purane tokens delete karo is user ke liye (rotation)
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        tenantId,
      },
    });

    this.logger.log(`Tokens refreshed for user: ${userId}`, 'AuthService');

    return this._generateAndStoreTokens({ sub: userId, tenantId, role, email });
  }

  /**
   * User ko logout karta hai.
   * DB se refresh token delete karo — access token expire hone tak valid
   * rahega (15min) kyunki JWT stateless hai, but naya access token nahi
   * mil sakta refresh token ke bina.
   */
  async logout(userId: string, tenantId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, tenantId },
    });

    this.logger.log(`User logged out: ${userId}`, 'AuthService');
  }

  /**
   * Current user ki profile info return karta hai.
   * JWT se userId leke DB se fresh data fetch karta hai.
   */
  async me(userId: string, tenantId: string): Promise<object> {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
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

  /**
   * Access token + Refresh token generate karta hai aur refresh token
   * DB mein store karta hai.
   */

  private async _generateAndStoreTokens(
    payload: JwtPayload,
  ): Promise<AuthTokens> {
    // ConfigService.get() string | undefined return karta hai
    // Nullish coalescing guarantee karta hai ke string mil jayega
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
  /**
   * Business name se URL-friendly slug banata hai.
   * Agar slug exist kare toh unique suffix add karta hai.
   *
   * Example: "Sharma Salon" → "sharma-salon"
   * Conflict pe: "sharma-salon-1", "sharma-salon-2", etc.
   */
  private async _generateUniqueSlug(businessName: string): Promise<string> {
    const baseSlug = businessName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // special chars remove
      .replace(/\s+/g, '-') // spaces → hyphens
      .replace(/-+/g, '-') // multiple hyphens → single
      .slice(0, 50); // max length

    // Check karo slug available hai ya nahi
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: baseSlug },
    });

    if (!existing) return baseSlug;

    // Conflict — suffix add karo
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

  /**
   * "15m", "7d", "1h" jaise strings ko Date object mein convert karta hai.
   */
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

  /**
   * "15m" → 900 (seconds) — frontend token refresh ke liye use karta hai.
   */
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
}
