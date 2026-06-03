import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@whatsapp-ai/db/generated/prisma';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
