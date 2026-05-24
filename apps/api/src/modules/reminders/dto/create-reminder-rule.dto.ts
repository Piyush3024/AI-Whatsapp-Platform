import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { ReminderRuleType } from '@whatsapp-ai/db/generated/prisma';

export class CreateReminderRuleDto {
  @IsEnum(ReminderRuleType, {
    message: `Type must be one of: ${Object.values(ReminderRuleType).join(', ')}`,
  })
  type!: ReminderRuleType;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean = true;

  @IsInt()
  @Min(0)
  @Max(10080) // Max 7 days in minutes
  @IsOptional()
  timingOffset?: number;

  @IsString()
  @IsOptional()
  timingUnit?: string;

  @IsString()
  @IsOptional()
  customBody?: string;
}
