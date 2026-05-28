import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek } from '@whatsapp-ai/db/generated/prisma';

export class ScheduleItemDto {
  @ApiProperty({ enum: DayOfWeek, example: DayOfWeek.MONDAY })
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @ApiProperty({ example: '09:00', description: 'Start time HH:MM format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be HH:MM format (e.g. 09:00)',
  })
  startTime!: string;

  @ApiProperty({ example: '18:00', description: 'End time HH:MM format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be HH:MM format (e.g. 18:00)',
  })
  endTime!: string;

  @ApiProperty({ example: true, description: 'Is staff working on this day?' })
  @IsBoolean()
  isWorking!: boolean;
}

export class SetStaffScheduleDto {
  @ApiProperty({
    type: [ScheduleItemDto],
    description: 'Weekly schedule — 7 days complete bhejo',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  schedule!: ScheduleItemDto[];
}
