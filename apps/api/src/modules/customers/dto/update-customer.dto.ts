import {
  IsString,
  IsOptional,
  IsEmail,
  IsArray,
  IsEnum,
  MaxLength,
  IsPhoneNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerOptInStatus } from '@whatsapp-ai/db/generated/prisma';

export class UpdateCustomerDto {
  @ApiPropertyOptional({
    description: 'Phone number in E.164 format',
    example: '+9779801234567',
  })
  @IsOptional()
  @IsPhoneNumber(undefined, { message: 'Phone number must be in E.164 format' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Customer full name',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  @Transform(({ value }: { value: string | undefined }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({
    description: 'Customer email address',
    example: 'rajesh@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }: { value: string | undefined }) =>
    value?.trim().toLowerCase(),
  )
  email?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the customer',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(2000, { message: 'Notes must not exceed 2000 characters' })
  @Transform(({ value }: { value: string | undefined }) => value?.trim())
  notes?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorizing customers',
    type: [String],
    isArray: true,
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array of strings' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @Transform(({ value }: { value: string | undefined }): string[] => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as string[];
      } catch {
        return value
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean);
      }
    }
    return [];
  })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'WhatsApp opt-in status',
    enum: CustomerOptInStatus,
  })
  @IsOptional()
  @IsEnum(CustomerOptInStatus, { message: 'Invalid opt-in status' })
  optInStatus?: CustomerOptInStatus;
}
