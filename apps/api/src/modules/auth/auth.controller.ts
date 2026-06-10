import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Query,
  BadRequestException,
  ValidationPipe,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { TwoFactorService } from './two-factor.service.js';
import { Verify2faDto } from './dto/verify-2fa.dto.js';
import { VerifyTwoFactorLoginDto } from './dto/verify-two-factor-login.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
  ) {}
  // ── Register ─────────────────────────────────────────────────────────────

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Naya tenant + owner account register karo',
  })
  @ApiResponse({
    status: 201,
    description: 'Registration successful',
  })
  @ApiResponse({ status: 409, description: 'Email is already registered' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.register(dto);
    this._setRefreshCookie(reply, result.refreshToken);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refreshToken: _refreshToken, ...safeResult } = result;
    return safeResult;
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login with email + password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
  })
  @ApiResponse({ status: 401, description: 'Wrong Credentials' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.login(dto);
    if ('requiresTwoFactor' in result) {
      return result;
    }
    this._setRefreshCookie(reply, result.refreshToken);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refreshToken: _refreshToken, ...safeResult } = result;
    return safeResult;
  }

  @Public()
  @Post('2fa/verify-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Verify 2FA login and generate session',
  })
  @ApiResponse({
    status: 200,
    description: 'TOTP code verified successfully — access + refresh tokens',
  })
  @ApiResponse({ status: 401, description: 'Invalid code or token' })
  async verifyTwoFactorLogin(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: VerifyTwoFactorLoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.verifyTwoFactorLogin(
      dto.twoFactorToken,
      dto.token,
    );
    this._setRefreshCookie(reply, result.refreshToken);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refreshToken: _refreshToken, ...safeResult } = result;
    return safeResult;
  }

  // ── Refresh ───────────────────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiOperation({
    summary: 'Get new access token + refresh token with refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'Token rotation successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token invalid or expired',
  })
  async refresh(
    @CurrentUser() user: CurrentUserPayload,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.refresh(
      user.userId,
      user.tenantId,
      user.role,
      user.email,
    );
    this._setRefreshCookie(reply, result.refreshToken);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refreshToken: _refreshToken, ...safeResult } = result;
    return safeResult;
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Logout and invalidate refresh token',
  })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(
    @CurrentUser() user: CurrentUserPayload,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.authService.logout(user.userId, user.tenantId);
    this._clearRefreshCookie(reply);
    return { message: 'Successfully logged out.' };
  }

  // ── Me ────────────────────────────────────────────────────────────────────

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current logged-in user info' })
  @ApiResponse({ status: 200, description: 'User profile data' })
  me(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.me(user.userId, user.tenantId);
  }

  // ── Forgot Password ───────────────────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiResponse({
    status: 200,
    description: 'If the email is registered, a reset link will be sent',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return {
      message: 'If the email is registered, a reset link will be sent',
    };
  }

  // ── Reset Password ────────────────────────────────────────────────────────

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password successfully reset' })
  @ApiResponse({
    status: 400,
    description: 'Token invalid, expired, or already used',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password successfully reset. Now login' };
  }

  // ── Verify Email ──────────────────────────────────────────────────────────

  @Public()
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verify email address via token from email link' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({
    status: 400,
    description: 'Token invalid, expired, or already used',
  })
  async verifyEmail(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required.');
    }
    await this.authService.verifyEmail(token);
    return { message: 'Email verified successfully. You can now login.' };
  }

  // ── Resend Verification ───────────────────────────────────────────────────

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiResponse({
    status: 200,
    description:
      'If email is registered and unverified, a new link will be sent',
  })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerification(dto.email);
    return {
      message:
        'If your email is registered and unverified, a new verification link has been sent.',
    };
  }

  // ── 2FA Setup ─────────────────────────────────────────────────────────────

  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @Throttle({ strict: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Initiate 2FA setup — returns QR code and secret',
  })
  @ApiResponse({
    status: 200,
    description: 'QR code data URL and otpauth URI returned',
  })
  async setup2fa(
    @CurrentUser() user: CurrentUserPayload,
    @Query('regenerate') regenerate?: string,
  ) {
    const shouldRegenerate = regenerate === 'true';
    return this.twoFactorService.setup(user.userId, shouldRegenerate);
  }

  // ── 2FA Enable ────────────────────────────────────────────────────────────

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @Throttle({ strict: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Enable 2FA — verify TOTP token after scanning QR code',
  })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid TOTP code' })
  async enable2fa(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: Verify2faDto,
  ) {
    await this.twoFactorService.enable(user.userId, dto.token);
    return { message: '2FA has been enabled successfully.' };
  }

  // ── 2FA Disable ───────────────────────────────────────────────────────────

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @Throttle({ strict: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Disable 2FA — requires valid TOTP token for confirmation',
  })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid TOTP code' })
  async disable2fa(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: Verify2faDto,
  ) {
    await this.twoFactorService.disable(user.userId, dto.token);
    return { message: '2FA has been disabled successfully.' };
  }

  private _setRefreshCookie(reply: FastifyReply, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    void reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
  }

  private _clearRefreshCookie(reply: FastifyReply): void {
    void reply.setCookie('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });
  }
}
