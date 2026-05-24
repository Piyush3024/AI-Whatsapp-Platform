import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

import { ReminderRuleType } from '@whatsapp-ai/db/generated/prisma';
import { parseToBoolean } from '../../../lib/transform.util.js';

export class QueryReminderRuleDto {
  @IsEnum(ReminderRuleType)
  @IsOptional()
  type?: ReminderRuleType;

  @IsBoolean()
  @IsOptional()
  @Transform(parseToBoolean)
  isEnabled?: boolean;
}
