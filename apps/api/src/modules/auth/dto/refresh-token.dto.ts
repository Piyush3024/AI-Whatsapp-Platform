import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token that is generated during login/register',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
