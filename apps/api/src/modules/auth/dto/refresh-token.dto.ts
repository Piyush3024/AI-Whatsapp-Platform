import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * RefreshTokenDto — Naya access token lene ke liye refresh token bhejo.
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token jo login/register pe mila tha',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
