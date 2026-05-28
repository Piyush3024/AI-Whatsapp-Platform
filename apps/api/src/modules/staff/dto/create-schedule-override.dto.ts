import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateScheduleOverrideDto {
  @ApiProperty({
    example: '2026-06-15',
    description: 'Date (YYYY-MM-DD)  at which override is being applied',
  })
  @IsDateString()
  date!: string;

  @ApiProperty({
    example: false,
    description: 'Staff working or not',
  })
  @IsBoolean()
  isWorking!: boolean;

  @ApiPropertyOptional({
    example: '10:00',
    description: 'Custom start time (HH:MM) — only if isWorking: true',
  })
  @ValidateIf((o: CreateScheduleOverrideDto) => o.isWorking === true)
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be HH:MM format',
  })
  startTime?: string;

  @ApiPropertyOptional({
    example: '15:00',
    description: 'Custom end time (HH:MM) — only if isWorking: true',
  })
  @ValidateIf((o: CreateScheduleOverrideDto) => o.isWorking === true)
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be HH:MM format',
  })
  endTime?: string;

  @ApiPropertyOptional({
    example: 'Eid holiday',
    description: 'Override reason (optional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
