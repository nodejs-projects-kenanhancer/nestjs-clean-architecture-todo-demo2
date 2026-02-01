import { BaseError } from '../../../core/errors';
import { EntryPoint } from '../../../core/types';

/**
 * RFC 7807 Problem Details for REST APIs
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */
export interface RestErrorResponse {
  type: string; // URI reference identifying the problem type
  title: string; // Short human-readable summary
  status: number; // HTTP status code
  code: string; // Machine-readable error code from layer-specific enum
  detail: string; // Human-readable explanation specific to this occurrence
  instance: string; // URI reference identifying this specific occurrence
  traceId: string; // Distributed tracing ID
  timestamp: string; // ISO 8601 timestamp
  errors?: ValidationErrorDetail[]; // For validation errors
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code?: string;
}

/**
 * GraphQL Spec-compliant error extensions
 * @see https://spec.graphql.org/October2021/#sec-Errors
 */
export interface GraphQLErrorResponse {
  message: string;
  code: string;
  classification: GraphQLErrorClassification;
  traceId: string;
  timestamp: string;
  validationErrors?: ValidationErrorDetail[];
}

export type GraphQLErrorClassification =
  | 'BAD_USER_INPUT'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INTERNAL_SERVER_ERROR'
  | 'CONFLICT'
  | 'SERVICE_UNAVAILABLE';

/**
 * Kafka Dead Letter Queue (DLQ) error event
 */
export interface KafkaErrorResponse {
  error: {
    code: string;
    message: string;
    type: KafkaErrorType;
    layer: string;
    timestamp: string;
    traceId: string;
    correlationId?: string;
  };
  retry: {
    retryable: boolean;
    retryCount: number;
    maxRetries: number;
    nextRetryAt?: string;
  };
  original: {
    topic?: string;
    partition?: number;
    offset?: string;
    key?: string;
    timestamp?: string;
    payload?: unknown;
  };
}

export type KafkaErrorType = 'TRANSIENT' | 'PERMANENT' | 'POISON_PILL';

/**
 * Union type for all error responses
 */
export type ErrorResponse = RestErrorResponse | GraphQLErrorResponse | KafkaErrorResponse;

/**
 * Context passed to strategy for formatting
 */
export interface ErrorContext {
  // REST context
  path?: string;
  method?: string;

  // Kafka context
  correlationId?: string;
  topic?: string;
  partition?: number;
  offset?: string;
  key?: string;
  originalTimestamp?: string;
  originalPayload?: unknown;
  retryCount?: number;
  maxRetries?: number;

  // Common
  traceId?: string;
}

export interface ErrorResponseStrategy<T extends ErrorResponse = ErrorResponse> {
  format(error: BaseError | Error, context?: ErrorContext): T;
  getEntryPoint(): EntryPoint;
}

export abstract class BaseErrorResponseStrategy<
  T extends ErrorResponse = ErrorResponse,
> implements ErrorResponseStrategy<T> {
  abstract format(error: BaseError | Error, context?: ErrorContext): T;
  abstract getEntryPoint(): EntryPoint;

  protected generateTraceId(context?: ErrorContext): string {
    return context?.traceId || this.createTraceId();
  }

  protected createTraceId(): string {
    // In production, this would come from a distributed tracing system (e.g., OpenTelemetry)
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
  }

  protected getTimestamp(): string {
    return new Date().toISOString();
  }

  protected isBaseError(error: Error): error is BaseError {
    return error instanceof BaseError;
  }

  protected getErrorCode(error: BaseError | Error): string {
    if (this.isBaseError(error)) {
      return error.code;
    }
    return 'INTERNAL_ERROR';
  }

  protected getErrorLayer(error: BaseError | Error): string {
    if (this.isBaseError(error)) {
      return error.layer;
    }
    return 'UNKNOWN';
  }
}
