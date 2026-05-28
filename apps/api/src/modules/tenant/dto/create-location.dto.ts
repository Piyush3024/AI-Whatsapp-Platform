import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateLocationDto {
  @ApiProperty({
    example: 'Thamel Branch',
    description: 'Location Name',
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
    description: 'Location Phone Number (E.164 format)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    example: false,
    description:
      'Is this the default location? Only one default can be selected.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
