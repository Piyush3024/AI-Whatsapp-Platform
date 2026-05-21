import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClsService } from 'nestjs-cls';

/**
 * TenantMiddleware
 *
 * Runs on every request BEFORE guards and controllers.
 * Decodes the JWT (without verifying — Passport guard does that later)
 * and stores tenantId, userId, and userRole in the CLS store.
 *
 * These values are then available anywhere in the app via ClsService
 * without prop-drilling or REQUEST-scoped providers.
 *
 * The RLS context (app.current_tenant_id) is set automatically inside
 * PrismaService._buildDb() on every query — not here.
 *
 * Why decode-only here?
 * - Middleware runs before Passport's JwtAuthGuard
 * - We only need the claims for CLS population
 * - Signature verification happens in JwtStrategy (Phase 2)
 * - Public routes (login, register, webhook) have no token — that's fine
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly cls: ClsService,
    private readonly jwt: JwtService,
  ) {}

  use(
    req: import('http').IncomingMessage,
    _res: import('http').ServerResponse,
    next: () => void,
  ): void {
    const authHeader = req.headers['authorization'];

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);

      try {
        // decode() does NOT verify signature — intentional.
        // JwtAuthGuard (Passport) handles full verification later.
        const payload = this.jwt.decode<{
          sub: string;
          tenantId: string;
          role: string;
        }>(token);

        if (payload?.tenantId) {
          this.cls.set('tenantId', payload.tenantId);
          this.cls.set('userId', payload.sub);
          this.cls.set('userRole', payload.role);
        }
      } catch {
        // Invalid token format — let JwtAuthGuard handle rejection
      }
    }

    next();
  }
}
