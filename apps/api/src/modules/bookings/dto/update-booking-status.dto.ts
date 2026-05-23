import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '../../../generated/prisma/client.js';

/**
 * DTO for updating booking status only.
 *
 * Best Practices:
 * - Separate endpoint for status updates
 * - Status validated against enum
 * - Transition logged in audit
 */
export class UpdateBookingStatusDto {
  @ApiProperty({
    description: 'New booking status',
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
  })
  @IsEnum(BookingStatus, { message: 'Invalid booking status' })
  status!: BookingStatus;
}
