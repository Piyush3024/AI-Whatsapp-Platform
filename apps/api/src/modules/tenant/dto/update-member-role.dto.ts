import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '@whatsapp-ai/db/generated/prisma';

/**
 * UpdateMemberRoleDto — Tenant member ka role change karne ke liye.
 * Sirf OWNER ye kar sakta hai.
 */
export class UpdateMemberRoleDto {
  @ApiProperty({
    enum: UserRole,
    example: UserRole.ADMIN,
    description: 'Naya role assign karo member ko',
  })
  @IsEnum(UserRole, {
    message: `Role must be one of: ${Object.values(UserRole).join(', ')}`,
  })
  role!: UserRole;
}
