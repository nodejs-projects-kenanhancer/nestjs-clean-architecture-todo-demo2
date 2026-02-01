import { HttpStatus, Injectable } from '@nestjs/common';

import {
  ApplicationError,
  ApplicationValidationError,
} from '../../../application/errors';
import { BaseError } from '../../../core/errors';
import { EntryPoint } from '../../../core/types';
import {
  DomainError,
  InvalidTodoStatusError,
  TodoNotFoundError,
  TodoValidationError,
} from '../../../domain/errors';
import { BadRequestError, PresentationError } from '../../../presentation/errors';
import { InfrastructureError } from '../../errors';
import {
  BaseErrorResponseStrategy,
  ErrorContext,
  RestErrorResponse,
  ValidationErrorDetail,
} from './error-response.strategy';

/**
 * Problem type URI base - in production, this should be a real documentation URL
 */
const PROBLEM_TYPE_BASE = 'https://api.example.com/problems';

/**
 * Error metadata for RFC 7807 response
 */
interface ErrorMetadata {
  type: string;
  title: string;
  status: number;
}

/**
 * REST Error Response Strategy following RFC 7807 Problem Details
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */
@Injectable()
export class RestErrorResponseStrategy extends BaseErrorResponseStrategy<RestErrorResponse> {
  getEntryPoint(): EntryPoint {
    return EntryPoint.REST;
  }

  format(error: BaseError | Error, context?: ErrorContext): RestErrorResponse {
    const metadata = this.getErrorMetadata(error);
    const code = this.getErrorCode(error);
    const traceId = this.generateTraceId(context);
    const timestamp = this.getTimestamp();

    const response: RestErrorResponse = {
      type: `${PROBLEM_TYPE_BASE}/${metadata.type}`,
      title: metadata.title,
      status: metadata.status,
      code,
      detail: this.getDetailMessage(error, metadata.status),
      instance: context?.path || '/unknown',
      traceId,
      timestamp,
    };

    // Add validation errors if applicable
    const validationErrors = this.extractValidationErrors(error);
    if (validationErrors.length > 0) {
      response.errors = validationErrors;
    }

    return response;
  }

  private getErrorMetadata(error: BaseError | Error): ErrorMetadata {
    // Domain layer errors
    if (error instanceof TodoNotFoundError) {
      return {
        type: 'todo-not-found',
        title: 'Todo Not Found',
        status: HttpStatus.NOT_FOUND,
      };
    }

    if (error instanceof TodoValidationError) {
      return {
        type: 'validation-error',
        title: 'Validation Failed',
        status: HttpStatus.BAD_REQUEST,
      };
    }

    if (error instanceof InvalidTodoStatusError) {
      return {
        type: 'invalid-todo-status',
        title: 'Invalid Todo Status',
        status: HttpStatus.BAD_REQUEST,
      };
    }

    if (error instanceof DomainError) {
      return {
        type: 'domain-error',
        title: 'Domain Error',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
      };
    }

    // Application layer errors
    if (error instanceof ApplicationValidationError) {
      return {
        type: 'validation-error',
        title: 'Validation Failed',
        status: HttpStatus.BAD_REQUEST,
      };
    }

    if (error instanceof ApplicationError) {
      return {
        type: 'application-error',
        title: 'Application Error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }

    // Infrastructure layer errors
    if (error instanceof InfrastructureError) {
      return {
        type: 'service-unavailable',
        title: 'Service Unavailable',
        status: HttpStatus.SERVICE_UNAVAILABLE,
      };
    }

    // Presentation layer errors
    if (error instanceof BadRequestError) {
      return {
        type: 'bad-request',
        title: 'Bad Request',
        status: HttpStatus.BAD_REQUEST,
      };
    }

    if (error instanceof PresentationError) {
      return {
        type: 'request-error',
        title: 'Request Error',
        status: HttpStatus.BAD_REQUEST,
      };
    }

    // Default - Internal Server Error
    return {
      type: 'internal-error',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }

  private getDetailMessage(error: BaseError | Error, status: number): string {
    // For 5xx errors, don't expose internal details
    if (status >= 500) {
      return 'An unexpected error occurred. Please try again later.';
    }

    return error.message;
  }

  private extractValidationErrors(error: BaseError | Error): ValidationErrorDetail[] {
    // Handle ApplicationValidationError with details
    if (error instanceof ApplicationValidationError) {
      const details = (
        error as ApplicationValidationError & {
          details?: Array<{ field: string; message: string }>;
        }
      ).details;
      if (Array.isArray(details)) {
        return details.map(detail => ({
          field: detail.field,
          message: detail.message,
        }));
      }
    }

    // Handle domain validation errors with context
    if (error instanceof TodoValidationError || error instanceof InvalidTodoStatusError) {
      if (this.isBaseError(error) && error.context) {
        const errors: ValidationErrorDetail[] = [];
        for (const [field, message] of Object.entries(error.context)) {
          if (typeof message === 'string') {
            errors.push({ field, message });
          }
        }
        if (errors.length > 0) {
          return errors;
        }
      }
    }

    return [];
  }
}
