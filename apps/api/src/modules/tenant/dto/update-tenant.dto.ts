import { ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@whatsapp-ai/db/generated/prisma';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateTenantDto {
  @ApiPropertyOptional({
    example: 'Sharma Salon & Spa',
    description: 'Business Display Name',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: { timezone: 'Asia/Kathmandu', currency: 'NPR', language: 'ne' },
    description: 'Tenant-level settings — timezone, currency, etc.',
  })
  @IsOptional()
  @IsObject()
  settings?: Prisma.InputJsonObject;
}
