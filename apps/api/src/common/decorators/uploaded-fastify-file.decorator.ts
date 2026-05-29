import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UploadedFile } from '../interceptors/fastify-file.interceptor.js';

/**
 * Extracts the file parsed by {@link FastifyFileInterceptor} from the request.
 *
 * Usage:
 * ```ts
 * @UseInterceptors(new FastifyFileInterceptor('file'))
 * async handler(@UploadedFastifyFile() file: UploadedFile | null) { ... }
 * ```
 */
export const UploadedFastifyFile = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UploadedFile | null => {
    const req = ctx
      .switchToHttp()
      .getRequest<{ uploadedFile?: UploadedFile | null }>();
    return req.uploadedFile ?? null;
  },
);
