import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { DocumentStatus } from '@whatsapp-ai/db/generated/prisma';
import { ApiProperty } from '@nestjs/swagger';

export class QueryDocumentDto {
  @ApiProperty({
    description: 'Page number for pagination',
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value ? Number(value) : 1))
  page?: number;

  @ApiProperty({
    description: 'Number of items per page (max: 100)',
    default: 10,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => (value ? Number(value) : 10))
  limit?: number;

  @ApiProperty({
    description: 'Filter documents by status',
    enum: DocumentStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentStatus, { each: true })
  status?: DocumentStatus;
}
