import {
  IsOptional,
  IsEnum,
  IsInt,
  IsUUID,
  Min,
  Max,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus, BookingSource } from '@whatsapp-ai/db/generated/prisma';

/**
 * Enum for sortable fields
 */
export enum BookingSortBy {
  CREATED_AT = 'createdAt',
  START_TIME = 'startTime',
  STATUS = 'status',
}

/**
 * Enum for sort order
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * DTO for querying bookings with pagination, search, and filters.
 */
export class BookingQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by status', enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ description: 'Filter by staff ID', type: String })
  @IsOptional()
  @IsUUID('4')
  staffId?: string;

  @ApiPropertyOptional({ description: 'Filter by customer ID', type: String })
  @IsOptional()
  @IsUUID('4')
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filter by location ID', type: String })
  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @ApiPropertyOptional({ description: 'Filter by source', enum: BookingSource })
  @IsOptional()
  @IsEnum(BookingSource)
  source?: BookingSource;

  @ApiPropertyOptional({
    description: 'Start date filter (ISO 8601)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'End date filter (ISO 8601)',
    example: '2026-01-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: BookingSortBy,
    default: BookingSortBy.START_TIME,
  })
  @IsOptional()
  @IsEnum(BookingSortBy)
  sortBy?: BookingSortBy = BookingSortBy.START_TIME;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.ASC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;
}

/**
 * DTO for calendar view query
 */
export class CalendarQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)', required: true })
  @IsNotEmpty({ message: 'Start date is required' })
  @IsDateString()
  dateFrom!: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)', required: true })
  @IsNotEmpty({ message: 'End date is required' })
  @IsDateString()
  dateTo!: string;

  @ApiPropertyOptional({ description: 'Filter by staff ID' })
  @IsOptional()
  @IsUUID('4')
  staffId?: string;

  @ApiPropertyOptional({ description: 'Filter by location ID' })
  @IsOptional()
  @IsUUID('4')
  locationId?: string;
}
