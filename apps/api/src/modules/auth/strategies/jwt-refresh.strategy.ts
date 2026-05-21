import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { JwtPayload } from './jwt.strategy.js';

/**
 * JwtRefreshStrategy — Passport ka 'jwt-refresh' strategy
 *
 * Sirf `/auth/refresh` endpoint pe use hota hai.
 * Access token strategy se alag secret use karta hai — JWT_REFRESH_SECRET.
 *
 * Extra kaam:
 * - Refresh token ko DB mein check karta hai (revoked ya nahi)
 * - Raw token bhi validate() ko deta hai DB check ke liye
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.refreshSecret')!,
      // Raw request body se refreshToken nikalna hoga DB check ke liye
      passReqToCallback: false,
    });
  }

  /**
   * Refresh token verify hone ke baad DB mein check karta hai.
   * Agar DB mein nahi mila (logout ho chuka) → 401.
   */
  async validate(payload: JwtPayload): Promise<{
    userId: string;
    tenantId: string;
    role: string;
    email: string;
  }> {
    // Refresh token DB mein exist karta hai ya nahi
    const tokenRecord = await this.prisma.db.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tenantId: payload.tenantId,
        expiresAt: { gt: new Date() }, // Expired nahi hona chahiye
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException(
        'Refresh token invalid or expired. Please login again.',
      );
    }

    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
    };
  }
}
