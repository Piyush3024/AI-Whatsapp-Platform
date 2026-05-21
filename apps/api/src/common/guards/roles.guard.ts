import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../generated/prisma/client.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

/**
 * RolesGuard — Role-Based Access Control Guard
 *
 * JwtAuthGuard ke BAAD run karta hai (order matters in APP_GUARD registration).
 * Tab tak request.user set ho chuka hota hai.
 *
 * Kaise kaam karta hai:
 * 1. @Roles() metadata read karta hai route/controller se.
 * 2. Agar koi role required nahi → through jaane do (permissive by default).
 * 3. request.user.role ko required roles se compare karta hai.
 * 4. Match nahi hua → 403 Forbidden.
 *
 * Example usage:
 *   @Roles(UserRole.OWNER)           // sirf OWNER
 *   @Roles(UserRole.OWNER, UserRole.ADMIN)  // OWNER ya ADMIN dono
 *   (no decorator) → sab authenticated users access kar sakte hain
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // ── Step 1: Required roles nikalo ───────────────────────────────────────
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // ── Step 2: Koi role required nahi → pass through ───────────────────────
    if (!requiredRoles || requiredRoles.length === 0) return true;

    // ── Step 3: User ka role check karo ────────────────────────────────────
    const request = context.switchToHttp().getRequest();
    const userRole = request.user?.role as UserRole;

    if (!userRole) {
      throw new ForbiddenException(
        'Access denied. User role could not be determined.',
      );
    }

    const hasRole = requiredRoles.includes(userRole);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}. Your role: ${userRole}.`,
      );
    }

    return true;
  }
}
