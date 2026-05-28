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

export class SetBusinessHoursDto {
  @ApiProperty({
    type: [BusinessHourItemDto],
    description: 'All days business hours — 7 days complete bhejo',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHourItemDto)
  hours!: BusinessHourItemDto[];
}
