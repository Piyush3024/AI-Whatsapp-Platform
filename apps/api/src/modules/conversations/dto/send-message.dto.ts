import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Message text to send', maxLength: 4096 })
  @IsString()
  @MinLength(1, { message: 'Message cannot be empty.' })
  @MaxLength(4096, { message: 'Message cannot exceed 4096 characters.' })
  content!: string;
}
