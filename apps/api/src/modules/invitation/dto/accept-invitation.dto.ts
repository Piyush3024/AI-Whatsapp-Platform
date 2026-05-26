import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class AcceptInvitationDto {
  // Invite token — from query param or body
  @IsString()
  @IsNotEmpty()
  token!: string;

  // New user's full name
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }): string => value.trim())
  name!: string;

  // Password for new account
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt max input length
  password!: string;
}
