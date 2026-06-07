import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyTwoFactorLoginDto {
  @ApiProperty({
    description: 'Short-lived 2FA token from login response',
  })
  @IsString()
  twoFactorToken!: string;

  @ApiProperty({
    description: '6-digit TOTP code from authenticator app',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'TOTP code must be exactly 6 digits.' })
  token!: string;
}
