import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpsertAiPromptDto {
  @ApiProperty({
    example: 'Friendly Salon Assistant',
    description: 'Persona name for this prompt',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  persona!: string;

  @ApiProperty({
    example: 'You are a friendly assistant for a salon...',
    description: 'Full system prompt text',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  systemPrompt!: string;

  @ApiPropertyOptional({
    example: 'en',
    description:
      'ISO 639-1 language code (e.g. en, ne, hi) or "auto" for default fallback',
    default: 'auto',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(auto|[a-z]{2})$/, {
    message: 'Language must be "auto" or a valid 2-letter ISO 639-1 code.',
  })
  language?: string = 'auto';

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this prompt is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
