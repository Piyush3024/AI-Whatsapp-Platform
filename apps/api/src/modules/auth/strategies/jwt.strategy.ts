import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { Logger } from 'nestjs-pino';

/**
 * JWT Access Token ka shape — sign karte waqt yahi payload hota hai.
 */
export interface JwtPayload {
  sub: string; // userId
  tenantId: string;
  role: string;
  email: string;
}

/**
 * JwtStrategy — Passport ka 'jwt' strategy
 *
 * JwtAuthGuard jab `AuthGuard('jwt')` use karta hai toh Passport
 * automatically is strategy ka validate() call karta hai.
 *
 * Kaise kaam karta hai:
 * 1. Authorization header se Bearer token extract karta hai
 * 2. JWT_SECRET se signature verify karta hai
 * 3. Expiry check karta hai
 * 4. validate() mein user DB se verify karta hai
 * 5. Return value request.user ban jaata hai
 *
 * Agar koi bhi step fail ho → 401 Unauthorized automatic.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      // Authorization: Bearer <token> header se extract karo
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // Expiry check ON — kabhi ignore mat karo production mein
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret')!,
    });
  }

  /**
   * Token verify hone ke baad yahan aata hai.
   * User DB mein exist karta hai ya nahi — ye check karta hai.
   * Return value → request.user
   */
  async validate(payload: JwtPayload): Promise<{
    userId: string;
    tenantId: string;
    role: string;
    email: string;
  }> {
    // User abhi bhi active hai ya nahi check karo
    // deletedAt: null soft-delete extension automatically handle karta hai
    const member = await this.prisma.db.tenantMember.findFirst({
      where: {
        userId: payload.sub,
        tenantId: payload.tenantId,
      },
    });

    if (!member) {
      throw new UnauthorizedException(
        'User is no longer a member of this tenant.',
      );
    }

    // Ye object request.user ban jaata hai
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
    };
  }
}
