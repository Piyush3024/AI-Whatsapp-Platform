import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'Priya Sharma', description: 'Staff Name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: '+9779801234567',
    description: 'Phone number in E.164 format',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g. +9779801234567)',
  })
  phone?: string;

  @ApiPropertyOptional({
    example: 'priya@sharmasalon.com',
    description: 'Staff Email',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    example: 'uuid-of-location',
    description: 'Location where staff is working',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({
    example: 'uuid-of-user',
    description: 'Linked user account (optional)',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Staff active or not',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
