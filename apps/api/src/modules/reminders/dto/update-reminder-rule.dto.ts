import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateReminderRuleDto {
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsInt()
  @Min(0)
  @Max(10080)
  @IsOptional()
  timingOffset?: number;

  @IsString()
  @IsOptional()
  timingUnit?: string;

  @IsString()
  @IsOptional()
  customBody?: string;
}
