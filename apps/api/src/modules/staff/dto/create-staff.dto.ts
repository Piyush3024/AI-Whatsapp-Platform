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

/**
 * CreateStaffDto — Naya staff member banana.
 *
 * Staff member optionally ek User se linked ho sakta hai (agar wo app use karta hai).
 * Agar userId nahi diya toh staff sirf scheduling ke liye hoga — no app access.
 */
export class CreateStaffDto {
  @ApiProperty({ example: 'Priya Sharma', description: 'Staff ka naam' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: '+9779801234567',
    description: 'Phone number E.164 format mein',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      'Phone number E.164 format mein hona chahiye (e.g. +9779801234567)',
  })
  phone?: string;

  @ApiPropertyOptional({
    example: 'priya@sharmasalon.com',
    description: 'Staff ka email',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    example: 'uuid-of-location',
    description: 'Kaunsi location pe kaam karta hai',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({
    example: 'uuid-of-user',
    description:
      'Linked user account (optional — agar staff app use karta hai)',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Staff active hai? Default true.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
