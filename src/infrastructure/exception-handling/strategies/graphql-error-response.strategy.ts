import { Injectable } from '@nestjs/common';

import { ApplicationError, ApplicationValidationError } from '../../../application/errors';
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
  GraphQLErrorClassification,
  GraphQLErrorResponse,
  ValidationErrorDetail,
} from './error-response.strategy';

/**
 * GraphQL Error Response Strategy following GraphQL Spec
 * @see https://spec.graphql.org/October2021/#sec-Errors
 */
@Injectable()
export class GraphQLErrorResponseStrategy extends BaseErrorResponseStrategy<GraphQLErrorResponse> {
  getEntryPoint(): EntryPoint {
    return EntryPoint.GRAPHQL;
  }

  format(error: BaseError | Error, context?: ErrorContext): GraphQLErrorResponse {
    const code = this.getErrorCode(error);
    const classification = this.getClassification(error);
    const traceId = this.generateTraceId(context);
    const timestamp = this.getTimestamp();

    const response: GraphQLErrorResponse = {
      message: this.getMessage(error, classification),
      code,
      classification,
      traceId,
      timestamp,
    };

    // Add validation errors if applicable
    const validationErrors = this.extractValidationErrors(error);
    if (validationErrors.length > 0) {
      response.validationErrors = validationErrors;
    }

    return response;
  }

  private getClassification(error: BaseError | Error): GraphQLErrorClassification {
    // Domain layer errors
    if (error instanceof TodoNotFoundError) {
      return 'NOT_FOUND';
    }

    if (error instanceof TodoValidationError || error instanceof InvalidTodoStatusError) {
      return 'BAD_USER_INPUT';
    }

    if (error instanceof DomainError) {
      return 'BAD_USER_INPUT';
    }

    // Application layer errors
    if (error instanceof ApplicationValidationError) {
      return 'BAD_USER_INPUT';
    }

    if (error instanceof ApplicationError) {
      return 'INTERNAL_SERVER_ERROR';
    }

    // Infrastructure layer errors
    if (error instanceof InfrastructureError) {
      return 'SERVICE_UNAVAILABLE';
    }

    // Presentation layer errors
    if (error instanceof BadRequestError || error instanceof PresentationError) {
      return 'BAD_USER_INPUT';
    }

    // Default
    return 'INTERNAL_SERVER_ERROR';
  }

  private getMessage(error: BaseError | Error, classification: GraphQLErrorClassification): string {
    // For internal errors, don't expose details
    if (classification === 'INTERNAL_SERVER_ERROR') {
      return 'An unexpected error occurred. Please try again later.';
    }

    if (classification === 'SERVICE_UNAVAILABLE') {
      return 'Service is temporarily unavailable. Please try again later.';
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
