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

export class CreateServiceDto {
  @ApiProperty({
    example: 'Haircut & Styling',
    description: 'Name of Service',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: 'Professional haircut with wash and blow dry',
    description: 'Description of Service',
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
  @Min(5, { message: 'Duration must be at least 5 minutes' })
  @Max(480, {
    message: 'Duration must be at most 480 minutes',
  })
  duration!: number;

  @ApiProperty({
    example: 50000,
    description: 'Price in paisa (Rs. 500 = 50000 paisa)',
    minimum: 0,
  })
  @IsInt()
  @Min(0, { message: 'Price cannot be negative' })
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
    description: 'Location where service is available (null = all locations)',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Service active or not',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
