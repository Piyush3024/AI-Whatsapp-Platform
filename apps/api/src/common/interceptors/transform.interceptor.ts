import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FastifyRequest } from 'fastify';

/**
 * Success response ka standard envelope shape.
 * Saare successful responses isi shape mein aayenge.
 *
 * Example:
 * {
 *   "success": true,
 *   "data": { ... },        ← actual controller response
 *   "timestamp": "...",
 *   "path": "/api/v1/..."
 * }
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  path: string;
}

/**
 * TransformInterceptor — Global Response Transform
 *
 * Saare successful controller responses ko ek consistent envelope mein wrap karta hai.
 * Sirf SUCCESS responses pe kaam karta hai — errors AllExceptionsFilter handle karta hai.
 *
 * Kyun zaroori hai:
 *  - Frontend ko consistent shape milti hai hamesha.
 *  - Future mein pagination meta add karna easy ho jaata hai.
 *  - API versioning mein helpful — shape change karna ek jagah se hota hai.
 *
 * Agar controller null return kare (e.g. DELETE 204) toh bhi wrap karta hai.
 * Agar koi stream ya file response hai toh skip karo (future mein add karenge).
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T | null>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T | null>> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    return next.handle().pipe(
      map(
        (data: T): ApiResponse<T | null> => ({
          success: true,
          data: data ?? null,
          timestamp: new Date().toISOString(),
          path: request.url,
        }),
      ),
    );
  }
}
