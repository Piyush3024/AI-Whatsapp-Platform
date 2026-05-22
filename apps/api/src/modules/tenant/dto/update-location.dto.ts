import { PartialType } from '@nestjs/swagger';
import { CreateLocationDto } from './create-location.dto.js';

/**
 * UpdateLocationDto — Location update karne ke liye.
 *
 * PartialType use kiya — CreateLocationDto ke sab fields optional ho jaate hain.
 * Sirf jo fields bhejo wahi update honge.
 */
export class UpdateLocationDto extends PartialType(CreateLocationDto) {}
