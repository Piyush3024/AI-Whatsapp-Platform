import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyticsDateRangeDto {
  @ApiPropertyOptional({
    description: 'Start date (ISO 8601 date string, e.g. 2026-01-01)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO 8601 date string, e.g. 2026-05-31)',
    example: '2026-05-31',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Filter by location UUID',
    example: 'a1b2c3d4-...',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;
}
