import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

interface RequestWithCurrentUser {
  user?: CurrentUserPayload;
}

export const CurrentUser = createParamDecorator(
  (property: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithCurrentUser>();
    const user = request.user;

    return property ? user?.[property] : user;
  },
);
