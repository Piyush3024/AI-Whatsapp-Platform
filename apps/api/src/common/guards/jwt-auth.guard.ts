import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * JwtAuthGuard — Global JWT Authentication Guard
 *
 * Kaise kaam karta hai:
 * 1. Pehle check karta hai @Public() decorator laga hai ya nahi.
 *    Agar laga hai → request through jaane do bina check kiye.
 * 2. Authorization header se Bearer token nikalte hain.
 * 3. JwtService.verifyAsync() se token verify karte hain (signature + expiry).
 * 4. Verified payload ko request.user pe set karte hain.
 * 5. CLS store update karte hain — TenantMiddleware ne decode kiya tha,
 *    yahan verified data se override karte hain.
 *
 * ⚠️  Abhi ka implementation: Ye guard ITSELF JWT verify karta hai.
 * Phase 2 mein hum isse `AuthGuard('jwt')` extend karenge jab
 * JwtStrategy + Passport setup hoga. Architecture same rahegi —
 * sirf internals change honge.
 *
 * Globally registered hai AppModule mein via APP_GUARD.
 * Har endpoint secure hai by default — @Public() se opt-out karo.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly cls: ClsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ── Step 1: @Public() check ─────────────────────────────────────────────
    // getAllAndOverride: controller-level aur method-level dono check karta hai.
    // Method-level metadata controller-level override karta hai.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    // ── Step 2: Token extract karo ──────────────────────────────────────────
    const request = context.switchToHttp().getRequest();
    const token = this._extractToken(request);

    if (!token) {
      throw new UnauthorizedException(
        'Authentication required. Please provide a valid Bearer token.',
      );
    }

    // ── Step 3: Token verify karo ───────────────────────────────────────────
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        tenantId: string;
        role: string;
        email: string;
      }>(token, {
        secret: this.config.get<string>('jwt.secret'),
      });

      // ── Step 4: request.user set karo ──────────────────────────────────────
      // Ye value @CurrentUser() decorator use karta hai.
      request.user = {
        userId: payload.sub,
        tenantId: payload.tenantId,
        role: payload.role,
        email: payload.email,
      };

      // ── Step 5: CLS store update karo verified data se ─────────────────────
      // TenantMiddleware ne decode kiya tha (unverified).
      // Ab verified payload se update karte hain — more secure.
      this.cls.set('userId', payload.sub);
      this.cls.set('tenantId', payload.tenantId);
      this.cls.set('userRole', payload.role);

      return true;
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired token. Please login again.',
      );
    }
  }

  /**
   * Authorization header se Bearer token extract karta hai.
   * Returns null agar header missing ya format wrong ho.
   */
  private _extractToken(request: {
    headers: Record<string, string | undefined>;
  }): string | null {
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) return null;
    return authHeader.slice(7) || null;
  }
}
