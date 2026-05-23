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

/**
 * CreateScheduleOverrideDto — Specific date pe exception set karo.
 *
 * Use cases:
 * - Staff ki chutti (isWorking: false)
 * - Special hours kisi date pe (isWorking: true, custom startTime/endTime)
 * - Holiday
 *
 * Rule: Agar isWorking: true hai toh startTime aur endTime required hain.
 */
export class CreateScheduleOverrideDto {
  @ApiProperty({
    example: '2026-06-15',
    description: 'Date jis din override apply hoga (YYYY-MM-DD format)',
  })
  @IsDateString()
  date!: string;

  @ApiProperty({
    example: false,
    description: 'Kya staff is date pe kaam karega?',
  })
  @IsBoolean()
  isWorking!: boolean;

  @ApiPropertyOptional({
    example: '10:00',
    description: 'Custom start time — sirf agar isWorking: true ho',
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
    description: 'Custom end time — sirf agar isWorking: true ho',
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
    description: 'Override ka reason (optional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
