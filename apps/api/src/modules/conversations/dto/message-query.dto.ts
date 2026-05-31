import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MessageQueryDto {
  @ApiPropertyOptional({
    description:
      'Cursor for pagination — createdAt of last fetched message (base64 encoded)',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 30;
}
