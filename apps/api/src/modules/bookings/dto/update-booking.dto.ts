import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
  @Transform(({ value }: { value: string | undefined }) => value?.trim())
  notes?: string;
}
