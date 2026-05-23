import { PartialType } from '@nestjs/swagger';
import { CreateServiceDto } from './create-service.dto.js';

/**
 * UpdateServiceDto — Service update karne ke liye.
 * PartialType se saare fields optional ho jaate hain.
 */
export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
