import { ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@whatsapp-ai/db/generated/prisma';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * UpdateTenantDto — Tenant business settings update karne ke liye.
 *
 * Sab fields optional hain — PATCH pattern follow karta hai.
 * Sirf jo fields bhejo wahi update honge — baaki same rahenge.
 *
 * Slug update allowed nahi hai — once set, permanent rehta hai.
 * (URL stability ke liye — external links break nahi honge)
 */
export class UpdateTenantDto {
  @ApiPropertyOptional({
    example: 'Sharma Salon & Spa',
    description: 'Business ka display naam',
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
