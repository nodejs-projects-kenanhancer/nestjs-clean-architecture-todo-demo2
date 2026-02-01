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
import { PresentationError } from '../../../presentation/errors';
import { DatabaseError, InfrastructureError, KafkaError } from '../../errors';
import {
  BaseErrorResponseStrategy,
  ErrorContext,
  KafkaErrorResponse,
  KafkaErrorType,
} from './error-response.strategy';

/**
 * Default retry configuration
 */
const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds base delay

/**
 * Kafka Error Response Strategy for Dead Letter Queue (DLQ) events
 */
@Injectable()
export class KafkaErrorResponseStrategy extends BaseErrorResponseStrategy<KafkaErrorResponse> {
  getEntryPoint(): EntryPoint {
    return EntryPoint.KAFKA;
  }

  format(error: BaseError | Error, context?: ErrorContext): KafkaErrorResponse {
    const errorType = this.getErrorType(error);
    const code = this.getErrorCode(error);
    const layer = this.getErrorLayer(error);
    const traceId = this.generateTraceId(context);
    const timestamp = this.getTimestamp();

    const retryCount = context?.retryCount ?? 0;
    const maxRetries = context?.maxRetries ?? DEFAULT_MAX_RETRIES;
    const retryable = this.isRetryable(errorType, retryCount, maxRetries);

    return {
      error: {
        code,
        message: this.getMessage(error, errorType),
        type: errorType,
        layer,
        timestamp,
        traceId,
        correlationId: context?.correlationId,
      },
      retry: {
        retryable,
        retryCount,
        maxRetries,
        nextRetryAt: retryable ? this.calculateNextRetryTime(retryCount) : undefined,
      },
      original: {
        topic: context?.topic,
        partition: context?.partition,
        offset: context?.offset,
        key: context?.key,
        timestamp: context?.originalTimestamp,
        payload: context?.originalPayload,
      },
    };
  }

  private getErrorType(error: BaseError | Error): KafkaErrorType {
    // Poison pill - message cannot be parsed or is corrupt
    if (error instanceof SyntaxError || error.name === 'SyntaxError') {
      return 'POISON_PILL';
    }

    // Transient errors - network, database connection, temporary failures
    if (error instanceof KafkaError) {
      return 'TRANSIENT';
    }

    if (error instanceof DatabaseError) {
      // Database connection issues are transient
      const message = error.message.toLowerCase();
      if (
        message.includes('connection') ||
        message.includes('timeout') ||
        message.includes('temporarily')
      ) {
        return 'TRANSIENT';
      }
    }

    if (error instanceof InfrastructureError) {
      return 'TRANSIENT';
    }

    // Permanent errors - validation, not found, business rule violations
    if (
      error instanceof TodoNotFoundError ||
      error instanceof TodoValidationError ||
      error instanceof InvalidTodoStatusError ||
      error instanceof DomainError
    ) {
      return 'PERMANENT';
    }

    if (error instanceof ApplicationValidationError) {
      return 'PERMANENT';
    }

    if (error instanceof ApplicationError) {
      return 'PERMANENT';
    }

    if (error instanceof PresentationError) {
      return 'PERMANENT';
    }

    // Unknown errors - treat as permanent to avoid infinite retries
    return 'PERMANENT';
  }

  private isRetryable(errorType: KafkaErrorType, retryCount: number, maxRetries: number): boolean {
    // Only transient errors are retryable
    if (errorType !== 'TRANSIENT') {
      return false;
    }

    // Check if we've exhausted retries
    return retryCount < maxRetries;
  }

  private calculateNextRetryTime(retryCount: number): string {
    // Exponential backoff: 5s, 10s, 20s, 40s, etc.
    const delayMs = RETRY_DELAY_MS * Math.pow(2, retryCount);
    const nextRetry = new Date(Date.now() + delayMs);
    return nextRetry.toISOString();
  }

  private getMessage(error: BaseError | Error, errorType: KafkaErrorType): string {
    // For poison pill, provide a generic message
    if (errorType === 'POISON_PILL') {
      return 'Message could not be processed due to corrupt or invalid format';
    }

    // For transient errors, indicate retry will occur
    if (errorType === 'TRANSIENT') {
      return error.message;
    }

    // For permanent errors, provide the actual message
    return error.message;
  }
}
