import {
  IsString,
  IsNotEmpty,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * SendTestMessageDto
 *
 * DTO for sending a test message from a WhatsApp number.
 * Used to verify the number is properly configured.
 */
// export class SendTestMessageDto {
//   @ApiProperty({
//     example: '+9779807654321',
//     description: 'Recipient phone number in E.164 format',
//   })
//   @IsString()
//   @IsNotEmpty()
//   @Matches(/^\+[1-9]\d{6,14}$/, {
//     message: 'Phone number E.164 format mein hona chahiye',
//   })
//   @MaxLength(15)
//   recipientPhone!: string;

//   @ApiProperty({
//     example: 'This is a test message from WhatsApp AI Platform',
//     description: 'Test message content',
//   })
//   @IsString()
//   @IsNotEmpty({ message: 'Test message content zaroorat hai' })
//   @MinLength(1)
//   @MaxLength(4096) // WhatsApp text limit
//   message!: string;
// }
export class SendTestMessageDto {
  @ApiProperty({
    example: '+9779807654321',
    description: 'Recipient phone number in E.164 format',
  })
  @IsString({ message: 'Phone number must be a string' })
  @IsNotEmpty({ message: 'Recipient phone is required' })
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +9779801234567)',
  })
  @MaxLength(15)
  recipientPhone!: string;

  @ApiProperty({
    example: 'This is a test message from WhatsApp AI Platform',
    description: 'Test message content',
  })
  @IsString({ message: 'Message must be a string' })
  @IsNotEmpty({ message: 'Message content is required' })
  @MinLength(1, { message: 'Message cannot be empty' })
  @MaxLength(4096, { message: 'Message exceeds WhatsApp text limit' })
  message!: string;
}
