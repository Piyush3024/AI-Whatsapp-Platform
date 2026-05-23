import { PartialType } from '@nestjs/swagger';
import { CreateStaffDto } from './create-staff.dto.js';

/**
 * UpdateStaffDto — Staff member update karne ke liye.
 * PartialType se saare fields optional ho jaate hain.
 */
export class UpdateStaffDto extends PartialType(CreateStaffDto) {}
