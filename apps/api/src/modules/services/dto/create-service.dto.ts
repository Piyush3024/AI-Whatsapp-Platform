import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * CreateServiceDto — Naya service add karne ke liye.
 *
 * Price paisa mein store hota hai (integer) — architecture decision.
 * Example: Rs. 500 → 50000 paisa
 *
 * Duration minutes mein store hota hai.
 * Example: 1 hour → 60 minutes
 */
export class CreateServiceDto {
  @ApiProperty({
    example: 'Haircut & Styling',
    description: 'Service ka naam',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: 'Professional haircut with wash and blow dry',
    description: 'Service ki description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    example: 60,
    description: 'Duration in minutes',
    minimum: 5,
    maximum: 480,
  })
  @IsInt()
  @Min(5, { message: 'Duration kam se kam 5 minutes hona chahiye' })
  @Max(480, {
    message: 'Duration zyada se zyada 480 minutes (8 hours) ho sakta hai',
  })
  duration!: number;

  @ApiProperty({
    example: 50000,
    description: 'Price in paisa (Rs. 500 = 50000 paisa)',
    minimum: 0,
  })
  @IsInt()
  @Min(0, { message: 'Price negative nahi ho sakta' })
  price!: number;

  @ApiPropertyOptional({
    example: 'NPR',
    description: 'Currency code',
    default: 'NPR',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    example: 'uuid-of-location',
    description: 'Kaunsi location pe available hai (null = sab locations)',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Service active hai? Default true.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
