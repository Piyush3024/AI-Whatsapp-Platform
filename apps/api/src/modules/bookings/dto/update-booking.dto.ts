import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '../../../generated/prisma/client.js';

/**
 * DTO for updating an existing booking.
 *
 * Best Practices:
 * - All fields optional (PATCH semantics)
 * - Cannot change serviceIds (would need separate endpoint)
 * - Cannot change customerId
 */
export class UpdateBookingDto {
  @ApiPropertyOptional({
    description: 'Staff ID (UUID)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Staff ID must be a valid UUID' })
  staffId?: string;

  @ApiPropertyOptional({
    description: 'Location ID (UUID)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Location ID must be a valid UUID' })
  locationId?: string;

  @ApiPropertyOptional({
    description: 'Booking start time (ISO 8601)',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Start time must be a valid ISO 8601 date string' },
  )
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Booking notes',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(1000, { message: 'Notes must not exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  notes?: string;
}
