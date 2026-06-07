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
  @ApiResponse({ status: 401, description: 'Wrong Credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('2fa/verify-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: '2FA code verify karke session generate karo',
  })
  @ApiResponse({
    status: 200,
    description:
      'TOTP code verified successfully — access + refresh tokens milenge',
  })
  @ApiResponse({ status: 401, description: 'Invalid code or token' })
  verifyTwoFactorLogin(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: VerifyTwoFactorLoginDto,
  ) {
    return this.authService.verifyTwoFactorLogin(dto.twoFactorToken, dto.token);
  }

  // ── Refresh ───────────────────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
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

  // ── Forgot Password ───────────────────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Password reset email bhejo' })
  @ApiResponse({
    status: 200,
    description: 'Agar email registered hai toh reset link bhej diya jaayega',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return {
      message:
        'Agar yeh email registered hai, toh aapko password reset link mil jayega.',
    };
  }

  // ── Reset Password ────────────────────────────────────────────────────────

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Token se password reset karo' })
  @ApiResponse({ status: 200, description: 'Password successfully reset hua' })
  @ApiResponse({
    status: 400,
    description: 'Token invalid, expired, ya already used hai',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password successfully reset ho gaya. Ab login karo.' };
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
}
