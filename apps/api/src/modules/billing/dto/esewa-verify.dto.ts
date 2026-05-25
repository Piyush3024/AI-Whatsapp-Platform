// apps/api/src/modules/billing/dto/esewa-verify.dto.ts
//
// eSewa redirects to our success_url with a single `data` query param.
// This DTO validates that param exists before we try to decode it.

import { IsString, IsNotEmpty } from 'class-validator';

export class EsewaVerifyDto {
  @IsString()
  @IsNotEmpty()
  data!: string; // Base64-encoded JSON from eSewa
}
