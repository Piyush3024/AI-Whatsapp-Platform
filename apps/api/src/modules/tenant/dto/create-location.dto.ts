import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * CreateLocationDto — Naya business location banana.
 *
 * Example: Sharma Salon ke 2 branches —
 *  - "Thamel Branch" (isDefault: true)
 *  - "Patan Branch"
 */
export class CreateLocationDto {
  @ApiProperty({
    example: 'Thamel Branch',
    description: 'Location ka naam',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: 'Thamel, Kathmandu, Nepal',
    description: 'Full address',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({
    example: '+9779801234567',
    description: 'Location ka phone number (E.164 format)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Ye default location hai? Sirf ek hi default ho sakta hai',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
