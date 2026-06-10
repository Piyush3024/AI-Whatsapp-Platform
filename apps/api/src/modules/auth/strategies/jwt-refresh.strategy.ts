import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { JwtPayload } from './jwt.strategy.js';

interface RequestWithCookies {
  cookies?: { refresh_token?: string };
}

function extractRefreshTokenFromCookie(req: RequestWithCookies): string | null {
  return req.cookies?.refresh_token ?? null;
}

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
      jwtFromRequest: extractRefreshTokenFromCookie,
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.refreshSecret')!,
      passReqToCallback: true,
    });
  }

  async validate(
    req: RequestWithCookies,
    payload: JwtPayload,
  ): Promise<{
    userId: string;
    tenantId: string;
    role: string;
    email: string;
  }> {
    const rawToken = req.cookies?.refresh_token;

    if (!rawToken) {
      throw new UnauthorizedException(
        'Refresh token missing. Please login again.',
      );
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const tokenRecord = await this.prisma.db.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tenantId: payload.tenantId,
        token: tokenHash,
        expiresAt: { gt: new Date() },
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
