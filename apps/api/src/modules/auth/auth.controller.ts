import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';

/**
 * AuthController — Authentication endpoints
 *
 * Saare auth routes /api/v1/auth/* pe available hain.
 *
 * Public routes (@Public() lagaya hai):
 *  POST /auth/register  — Naya account banana
 *  POST /auth/login     — Login karna
 *  POST /auth/refresh   — Naye tokens lena (refresh token se)
 *
 * Protected routes (JWT required):
 *  POST /auth/logout    — Logout karna
 *  GET  /auth/me        — Current user info
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Register ─────────────────────────────────────────────────────────────

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  // Strict rate limiting — 10 req/min brute force se protect karta hai
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Naya tenant + owner account register karo',
  })
  @ApiResponse({
    status: 201,
    description: 'Registration successful — access + refresh tokens milenge',
  })
  @ApiResponse({ status: 409, description: 'Email already registered hai' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Email + password se login karo' })
  @ApiResponse({
    status: 200,
    description: 'Login successful — access + refresh tokens milenge',
  })
  @ApiResponse({ status: 401, description: 'Email ya password galat hai' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ── Refresh ───────────────────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  // Refresh token body mein aata hai — jwt-refresh strategy handle karta hai
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiOperation({
    summary: 'Refresh token se naye access + refresh tokens lo',
  })
  @ApiResponse({
    status: 200,
    description: 'Token rotation successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token invalid ya expired hai',
  })
  refresh(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.refresh(
      user.userId,
      user.tenantId,
      user.role,
      user.email,
    );
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Logout karo — refresh token invalidate ho jaata hai',
  })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@CurrentUser() user: CurrentUserPayload) {
    await this.authService.logout(user.userId, user.tenantId);
    return { message: 'Successfully logged out.' };
  }

  // ── Me ────────────────────────────────────────────────────────────────────

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Current logged-in user ki info lo' })
  @ApiResponse({ status: 200, description: 'User profile data' })
  me(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.me(user.userId, user.tenantId);
  }
}
