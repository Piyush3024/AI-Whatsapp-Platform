import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { JwtPayload } from './jwt.strategy.js';

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

      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload): Promise<{
    userId: string;
    tenantId: string;
    role: string;
    email: string;
  }> {
    const tokenRecord = await this.prisma.db.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tenantId: payload.tenantId,
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
