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
import { DayOfWeek } from '../../../generated/prisma/client.js';

/**
 * Ek din ka business hours — HH:MM format.
 */
export class BusinessHourItemDto {
  @ApiProperty({
    enum: DayOfWeek,
    example: DayOfWeek.MONDAY,
  })
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @ApiProperty({
    example: '09:00',
    description: 'Opening time — HH:MM 24-hour format',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'openTime must be in HH:MM format (e.g. 09:00)',
  })
  openTime!: string;

  @ApiProperty({
    example: '18:00',
    description: 'Closing time — HH:MM 24-hour format',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'closeTime must be in HH:MM format (e.g. 18:00)',
  })
  closeTime!: string;

  @ApiProperty({
    example: true,
    description: 'Is location open on this day?',
  })
  @IsBoolean()
  isOpen!: boolean;
}

/**
 * SetBusinessHoursDto — Ek location ke saare business hours ek saath set karo.
 *
 * PUT endpoint use karta hai — full replacement.
 * Saare 7 din bhejne chahiye — missing days delete ho jaayenge.
 *
 * Example:
 * {
 *   "hours": [
 *     { "dayOfWeek": "MONDAY", "openTime": "09:00", "closeTime": "18:00", "isOpen": true },
 *     { "dayOfWeek": "SUNDAY", "openTime": "09:00", "closeTime": "14:00", "isOpen": false }
 *   ]
 * }
 */
export class SetBusinessHoursDto {
  @ApiProperty({
    type: [BusinessHourItemDto],
    description: 'Saare days ke business hours — 7 days complete bhejo',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHourItemDto)
  hours!: BusinessHourItemDto[];
}
