import { createParamDecorator, ExecutionContext } from '@nestjs/common';
// import { ClsService } from 'nestjs-cls';

/**
 * Authenticated user ka shape — JWT payload se aata hai.
 * Phase 2 mein JwtStrategy is shape ko set karega.
 */
export interface CurrentUserPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

/**
 * @CurrentUser() param decorator
 *
 * Controller method mein inject karo current authenticated user ko
 * bina request object chhue. CLS store se data aata hai jo
 * TenantMiddleware ne set kiya tha.
 *
 * Example:
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: CurrentUserPayload) {
 *     return user;
 *   }
 *
 * Optional property bhi nikaal sakte ho:
 *   @Get('me')
 *   getMe(@CurrentUser('userId') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (property: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    // Fastify mein request.user Passport set karta hai Phase 2 mein.
    // Abhi ke liye raw request se user nikaalte hain.
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;

    // Agar specific property maangi hai toh wohi do, warna poora user object.
    return property ? user?.[property] : user;
  },
);
