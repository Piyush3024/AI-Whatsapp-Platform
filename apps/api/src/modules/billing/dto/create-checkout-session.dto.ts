import { IsUUID, IsUrl } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsUUID()
  planId!: string;

  @IsUrl()
  successUrl!: string;

  @IsUrl()
  cancelUrl!: string;
}
