import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Error response ka standard shape — poori app mein consistent rahega.
 * Frontend wale isko rely kar sakte hain.
 */
interface ErrorResponse {
  statusCode: number;
  errorCode: string;
  message: string;
  errors?: string[]; // Validation errors ke liye (400 only)
  errorId: string; // Support ke liye unique ID — logs mein milega
  timestamp: string;
  path: string;
}

interface HttpExceptionResponseBody {
  message?: string | string[];
}

function isHttpExceptionResponseBody(
  value: unknown,
): value is HttpExceptionResponseBody {
  return typeof value === 'object' && value !== null;
}

/**
 * AllExceptionsFilter — Global Exception Filter
 *
 * Saare unhandled exceptions yahan aate hain — NestJS ka last resort.
 * Do kaam karta hai:
 *  1. Error ko structured JSON response mein convert karta hai.
 *  2. Error ko Pino logger se log karta hai (errorId ke saath).
 *
 * Security rules:
 *  - Production mein stack trace kabhi nahi bhejte client ko.
 *  - 500 errors mein internal message hide karte hain — sirf generic message.
 *  - Validation errors (400) mein field-level detail dete hain — safe hai.
 *
 * errorId pattern:
 *  - Har error ko ek unique UUID milta hai.
 *  - Ye ID logs mein bhi hota hai.
 *  - User support ticket mein ye ID de sakta hai — hum instantly dhundh sakte hain.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const errorId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const path = request.url;
    const isProduction = process.env.NODE_ENV === 'production';

    let statusCode: number;
    let errorCode: string;
    let message: string;
    let errors: string[] | undefined;

    // ── HttpException (NestJS known errors) ────────────────────────────────
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Validation errors (class-validator se aate hain) — array of messages
      if (
        statusCode === Number(HttpStatus.BAD_REQUEST) &&
        isHttpExceptionResponseBody(exceptionResponse) &&
        Array.isArray(exceptionResponse.message)
      ) {
        errorCode = 'VALIDATION_ERROR';
        message = 'Request validation failed.';
        errors = exceptionResponse.message;
      } else {
        errorCode = this._getErrorCode(statusCode);
        if (typeof exceptionResponse === 'string') {
          message = exceptionResponse;
        } else if (
          isHttpExceptionResponseBody(exceptionResponse) &&
          typeof exceptionResponse.message === 'string'
        ) {
          message = exceptionResponse.message;
        } else {
          message = exception.message;
        }
      }
    }
    // ── Unknown / unhandled errors ──────────────────────────────────────────
    else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'INTERNAL_SERVER_ERROR';

      // Production mein internal error details KABHI nahi bhejte.
      // Development mein helpful message dikhate hain.
      message = isProduction
        ? 'An unexpected error occurred. Please try again later.'
        : exception instanceof Error
          ? exception.message
          : String(exception);
    }

    // ── Logging ─────────────────────────────────────────────────────────────
    // 5xx = real errors — hamesha log karo stack trace ke saath.
    // 4xx = client errors — warn level pe log karo.
    const logContext = {
      errorId,
      statusCode,
      path,
      method: request.method,
    };

    if (statusCode >= 500) {
      this.logger.error(
        `[${errorId}] ${statusCode} ${path} — ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
        'AllExceptionsFilter',
      );
    } else {
      this.logger.warn(
        `[${errorId}] ${statusCode} ${path} — ${message}`,
        JSON.stringify(logContext),
        'AllExceptionsFilter',
      );
    }

    // ── Response bhejo ──────────────────────────────────────────────────────
    const errorBody: ErrorResponse = {
      statusCode,
      errorCode,
      message,
      ...(errors && { errors }),
      errorId,
      timestamp,
      path,
    };

    response.status(statusCode).send(errorBody);
  }

  /**
   * HTTP status code se meaningful error code banata hai.
   * Frontend in codes pe switch kar sakta hai localized messages ke liye.
   */
  private _getErrorCode(statusCode: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      410: 'GONE',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codes[statusCode] ?? 'UNKNOWN_ERROR';
  }
}
