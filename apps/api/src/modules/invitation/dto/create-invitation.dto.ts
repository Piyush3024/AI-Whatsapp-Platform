import { IsEmail, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@whatsapp-ai/db/generated/prisma';

export class CreateInvitationDto {
  @IsEmail()
  @Transform(({ value }: { value: string }): string =>
    value.toLowerCase().trim(),
  )
  email!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}
