// apps/api/src/modules/billing/dto/create-checkout-session.dto.ts

import { IsUUID, IsUrl } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsUUID()
  planId!: string;

  @IsUrl()
  successUrl!: string;

  @IsUrl()
  cancelUrl!: string;
}
