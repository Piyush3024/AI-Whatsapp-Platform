import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@whatsapp-ai/db/generated/prisma';

/**
 * ROLES_KEY — metadata key jo RolesGuard read karta hai.
 */
export const ROLES_KEY = 'roles';

/**
 * @Roles() decorator
 *
 * Controller ya route pe lagao to specify karo kon sa role access kar sakta hai.
 * RolesGuard JWT claims se role extract karta hai aur compare karta hai.
 *
 * Example:
 *   @Roles(UserRole.OWNER, UserRole.ADMIN)
 *   @Patch('settings')
 *   updateSettings() { ... }
 *
 * Note: RolesGuard JwtAuthGuard ke BAAD run karta hai — pehle authentication,
 * phir authorization. Agar @Roles() nahi lagaya toh RolesGuard kuch nahi karta.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
