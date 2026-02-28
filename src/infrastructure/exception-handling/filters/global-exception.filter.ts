import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';

import { EntryPoint } from '@core/types';
import { PresentationErrorCode } from '@presentation/errors';
import { Request, Response } from 'express';
import { GraphQLError } from 'graphql';

import { ErrorResponseStrategyFactory, RestErrorResponse } from '../strategies';
import { BaseExceptionFilter } from './base-exception.filter';

interface HttpExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

/**
 * Problem type URI base - in production, this should be a real documentation URL
 */
const PROBLEM_TYPE_BASE = 'https://api.example.com/problems';

@Catch()
export class GlobalExceptionFilter extends BaseExceptionFilter implements ExceptionFilter {
  protected readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(strategyFactory: ErrorResponseStrategyFactory) {
    super(strategyFactory);
  }

  catch(exception: unknown, host: ArgumentsHost): void | GraphQLError {
    const entryPoint = this.detectEntryPoint(host);

    // Handle NestJS HTTP exceptions specially for REST
    if (exception instanceof HttpException && entryPoint === EntryPoint.REST) {
      return this.handleHttpException(exception, host);
    }

    // Handle all other exceptions
    const error = exception instanceof Error ? exception : new Error('Unknown error');

    this.logger.error(`Unhandled exception: ${error.message}`, error.stack);

    return this.handleException(error, host, 'error');
  }

  private handleHttpException(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    this.logger.warn(`HTTP exception: ${status} - ${exception.message}`);

    // Extract message from response
    let detail: string;
    let validationErrors: Array<{ field: string; message: string }> | undefined;

    if (typeof exceptionResponse === 'string') {
      detail = exceptionResponse;
    } else {
      const responseObj = exceptionResponse as HttpExceptionResponse;
      if (Array.isArray(responseObj.message)) {
        // Validation pipe errors come as array
        detail = 'One or more validation errors occurred';
        validationErrors = responseObj.message.map(msg => ({
          field: 'unknown',
          message: msg,
        }));
      } else {
        detail = responseObj.message || exception.message;
      }
    }

    // Build RFC 7807 compliant response
    const errorResponse: RestErrorResponse = {
      type: `${PROBLEM_TYPE_BASE}/${this.getHttpExceptionType(status)}`,
      title: this.getHttpExceptionTitle(status),
      status,
      code: this.getHttpExceptionCode(status),
      detail,
      instance: request.url,
      traceId:
        (request.headers['x-request-id'] as string) ||
        (request.headers['x-trace-id'] as string) ||
        this.generateTraceId(),
      timestamp: new Date().toISOString(),
    };

    if (validationErrors) {
      errorResponse.errors = validationErrors;
    }

    response
      .status(status)
      .setHeader('Content-Type', 'application/problem+json')
      .json(errorResponse);
  }

  private getHttpExceptionType(status: number): string {
    const types: Record<number, string> = {
      400: 'bad-request',
      401: 'unauthorized',
      403: 'forbidden',
      404: 'not-found',
      405: 'method-not-allowed',
      409: 'conflict',
      422: 'unprocessable-entity',
      429: 'too-many-requests',
      500: 'internal-error',
      502: 'bad-gateway',
      503: 'service-unavailable',
      504: 'gateway-timeout',
    };
    return types[status] || 'http-error';
  }

  private getHttpExceptionTitle(status: number): string {
    const titles: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };
    return titles[status] || 'HTTP Error';
  }

  private getHttpExceptionCode(status: number): string {
    const codes: Record<number, string> = {
      400: PresentationErrorCode.BAD_REQUEST,
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      405: 'METHOD_NOT_ALLOWED',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };
    return codes[status] || 'HTTP_ERROR';
  }

  private generateTraceId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
  }
}
