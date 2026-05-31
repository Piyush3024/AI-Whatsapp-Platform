import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ConversationStatus } from '@whatsapp-ai/db/generated/prisma';

export class UpdateConversationDto {
  @ApiProperty({ enum: ConversationStatus })
  @IsEnum(ConversationStatus)
  status!: ConversationStatus;
}
