import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as Sentry from '@sentry/nestjs';

interface ErrorResponse {
  statusCode: number;
  errorCode: string;
  message: string;
  errors?: string[];
  errorId: string;
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

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

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
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'INTERNAL_SERVER_ERROR';

      message = isProduction
        ? 'An unexpected error occurred. Please try again later.'
        : exception instanceof Error
          ? exception.message
          : String(exception);
    }

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

      Sentry.captureException(exception, {
        extra: {
          errorId,
          path,
          method: request.method,
          statusCode,
        },
      });
    } else {
      this.logger.warn(
        `[${errorId}] ${statusCode} ${path} — ${message}`,
        JSON.stringify(logContext),
        'AllExceptionsFilter',
      );
    }

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
