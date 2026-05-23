import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsUUID,
  IsDateString,
  IsEnum,
  Min,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingSource } from '@whatsapp-ai/db/generated/prisma';

/**
 * DTO for creating a new booking.
 *
 * Best Practices:
 * - Customer required (must exist)
 * - At least one service required
 * - Staff optional but validated if provided
 * - startTime must be in future
 * - Duration calculated from services
 */
export class CreateBookingDto {
  @ApiProperty({
    description: 'Customer ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'Customer ID is required' })
  @IsUUID('4', { message: 'Customer ID must be a valid UUID' })
  customerId!: string;

  @ApiPropertyOptional({
    description: 'Staff ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Staff ID must be a valid UUID' })
  staffId?: string;

  @ApiPropertyOptional({
    description: 'Location ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Location ID must be a valid UUID' })
  locationId?: string;

  @ApiProperty({
    description: 'Booking start time (ISO 8601)',
    example: '2026-01-15T10:00:00.000Z',
  })
  @IsNotEmpty({ message: 'Start time is required' })
  @IsDateString(
    {},
    { message: 'Start time must be a valid ISO 8601 date string' },
  )
  @Transform(({ value }) => {
    const date = new Date(value);
    if (date <= new Date()) {
      throw new Error('Start time must be in the future');
    }
    return value;
  })
  startTime!: string;

  @ApiProperty({
    description: 'Service IDs to include in booking',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440003',
      '550e8400-e29b-41d4-a716-446655440004',
    ],
  })
  @IsNotEmpty({ message: 'At least one service is required' })
  @IsArray({ message: 'Service IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one service is required' })
  @IsUUID('4', { each: true, message: 'Each service ID must be a valid UUID' })
  serviceIds!: string[];

  @ApiPropertyOptional({
    description: 'Booking notes',
    example: 'Customer prefers window seat',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(1000, { message: 'Notes must not exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @ApiPropertyOptional({
    description: 'Booking source',
    enum: BookingSource,
    default: BookingSource.WHATSAPP,
  })
  @IsOptional()
  @IsEnum(BookingSource, { message: 'Invalid booking source' })
  source?: BookingSource;
}
