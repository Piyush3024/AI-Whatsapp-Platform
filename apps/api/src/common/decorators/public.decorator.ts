import { SetMetadata } from '@nestjs/common';

/**
 * IS_PUBLIC_KEY — metadata key jo JwtAuthGuard check karta hai.
 * Agar route pe @Public() laga hai toh guard request pass kar deta hai
 * bina token verify kiye.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() decorator
 *
 * Kisi bhi controller ya route pe lagao to use JWT authentication se
 * exempt karo. Example:
 *
 *   @Public()
 *   @Post('auth/login')
 *   login() { ... }
 *
 * Ye decorator globally registered JwtAuthGuard ke saath kaam karta hai.
 * Guard Reflector se IS_PUBLIC_KEY metadata read karta hai aur skip kar deta hai.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
