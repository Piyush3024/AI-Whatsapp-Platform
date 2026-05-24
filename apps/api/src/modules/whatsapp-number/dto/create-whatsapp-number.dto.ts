import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * CreateWhatsAppNumberDto
 *
 * Validates incoming data for adding a new WhatsApp Business number.
 * Phone number gets normalized to E.164 format via service layer.
 */
export class CreateWhatsAppNumberDto {
  @ApiProperty({
    example: '+9779801234567',
    description: 'WhatsApp number in E.164 format (with country code)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Phone number zaroorat hai' })
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message:
      'Phone number E.164 format mein hona chahiye (e.g., +9779801234567)',
  })
  @MaxLength(15)
  phoneNumber!: string;

  @ApiProperty({
    example: 'Business Main Line',
    description: 'Display name for this WhatsApp number',
  })
  @IsString()
  @IsNotEmpty({ message: 'Display name zaroorat hai' })
  @MaxLength(100)
  displayName!: string;

  @ApiPropertyOptional({
    description: 'Optional: Link to specific location',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({
    example: '1032984729847',
    description: 'Meta phone number ID (optional — fetched if not provided)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phoneNumberId?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Set as default number for this tenant',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    example: 'Hello! Welcome to our business. How can we help you?',
    description: 'Custom greeting message (optional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  greetingMessage?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable auto-reply (default: true)',
  })
  @IsOptional()
  @IsBoolean()
  autoReplyEnabled?: boolean;
}
