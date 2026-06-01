import { IsOptional, IsUUID, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
