import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }): string => value.trim())
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt max input length
  password!: string;
}
