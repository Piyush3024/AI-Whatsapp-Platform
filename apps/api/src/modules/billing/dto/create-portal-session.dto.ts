// apps/api/src/modules/billing/dto/create-portal-session.dto.ts

import { IsUrl } from 'class-validator';

export class CreatePortalSessionDto {
  @IsUrl()
  returnUrl!: string;
}
