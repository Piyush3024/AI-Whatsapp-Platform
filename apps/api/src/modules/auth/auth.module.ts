import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy.js';

/**
 * AuthModule
 *
 * Kya import kiya:
 * - PassportModule: AuthGuard('jwt') aur AuthGuard('jwt-refresh') ke liye zaroori
 * - JwtModule aur ConfigModule globally registered hain AppModule mein —
 *   yahan dobara import karne ki zaroorat nahi
 * - PrismaModule globally registered hai — yahan bhi nahi chahiye
 *
 * Providers:
 * - AuthService: business logic
 * - JwtStrategy: 'jwt' strategy — access token verify karta hai
 * - JwtRefreshStrategy: 'jwt-refresh' strategy — refresh token verify karta hai
 */
@Module({
  imports: [
    // 'jwt' default strategy set karta hai PassportModule ke liye
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
