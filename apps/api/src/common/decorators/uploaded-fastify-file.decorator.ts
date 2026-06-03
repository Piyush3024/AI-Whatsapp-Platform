import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UploadedFile } from '../interceptors/fastify-file.interceptor.js';

export const UploadedFastifyFile = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UploadedFile | null => {
    const req = ctx
      .switchToHttp()
      .getRequest<{ uploadedFile?: UploadedFile | null }>();
    return req.uploadedFile ?? null;
  },
);
