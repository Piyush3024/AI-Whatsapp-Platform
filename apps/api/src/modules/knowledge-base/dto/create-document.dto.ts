// ============================================================
// Imports
// ============================================================
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// ============================================================
// DTO: Create Document
// ============================================================
export class CreateDocumentDto {
  @ApiProperty({
    description: 'Title of the document',
    example: 'Salon Services Menu',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    description: 'Original filename with extension',
    example: 'menu.pdf',
  })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({
    description: 'File content as Buffer',
    type: 'string',
    format: 'binary',
  })
  file!: unknown;
}
