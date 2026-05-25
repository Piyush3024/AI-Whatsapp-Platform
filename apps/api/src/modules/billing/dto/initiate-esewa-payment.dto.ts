import { IsUUID } from 'class-validator';

export class InitiateEsewaPaymentDto {
  @IsUUID()
  planId!: string;
}
