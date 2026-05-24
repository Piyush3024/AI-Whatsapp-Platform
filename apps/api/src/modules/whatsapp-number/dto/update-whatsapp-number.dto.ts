import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * UpdateWhatsAppNumberDto
 *
 * All fields optional — PATCH semantics.
 * Only provided fields will be updated.
 */
export class UpdateWhatsAppNumberDto {
  @ApiPropertyOptional({
    example: 'Business Main Line',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Link to specific location',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Activate or deactivate this number',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable/disable auto-reply',
  })
  @IsOptional()
  @IsBoolean()
  autoReplyEnabled?: boolean;

  @ApiPropertyOptional({
    example: 'Hello! Welcome to our business.',
    description: 'Custom greeting message',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  greetingMessage?: string;
}
