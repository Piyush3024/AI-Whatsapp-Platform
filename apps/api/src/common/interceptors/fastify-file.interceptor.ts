import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { FastifyRequest } from 'fastify';
import '@fastify/multipart';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

interface RequestWithMultipart extends FastifyRequest {
  body: Record<string, unknown>;
  uploadedFile?: UploadedFile | null;
}

@Injectable()
export class FastifyFileInterceptor implements NestInterceptor {
  constructor(private readonly fieldName: string) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const ctx = context.switchToHttp();
    const rawReq = ctx.getRequest<RequestWithMultipart>();

    if (typeof rawReq.isMultipart !== 'function' || !rawReq.isMultipart()) {
      throw new BadRequestException('Multipart request expected');
    }

    const parts = rawReq.parts();
    const body: Record<string, unknown> = {};
    let uploadedFile: UploadedFile | null = null;

    try {
      for await (const part of parts) {
        if (part.type === 'file') {
          if (part.fieldname === this.fieldName) {
            const buffer = await part.toBuffer();
            uploadedFile = {
              fieldname: part.fieldname,
              originalname: part.filename,
              encoding: part.encoding,
              mimetype: part.mimetype,
              buffer,
              size: buffer.length,
            };
          } else {
            // Consume the file stream to avoid hanging
            await part.toBuffer();
          }
        } else {
          body[part.fieldname] = part.value;
        }
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error parsing multipart data';
      throw new BadRequestException(errorMessage);
    }

    rawReq.body = body;
    rawReq.uploadedFile = uploadedFile;

    return next.handle();
  }
}
