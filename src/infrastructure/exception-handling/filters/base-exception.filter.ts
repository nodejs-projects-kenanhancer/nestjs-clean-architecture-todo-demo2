import { ArgumentsHost, Logger } from '@nestjs/common';
import { GqlContextType } from '@nestjs/graphql';

import { BaseError } from '@core/errors';
import { EntryPoint } from '@core/types';
import { Request, Response } from 'express';
import { GraphQLError } from 'graphql';

import {
  ErrorContext,
  ErrorResponse,
  ErrorResponseStrategyFactory,
  GraphQLErrorResponse,
  KafkaErrorResponse,
  RestErrorResponse,
} from '../strategies';

export abstract class BaseExceptionFilter {
  protected abstract readonly logger: Logger;

  constructor(protected readonly strategyFactory: ErrorResponseStrategyFactory) {}

  protected handleException(
    exception: BaseError | Error,
    host: ArgumentsHost,
    logLevel: 'warn' | 'error' = 'warn',
  ): void | GraphQLError {
    const entryPoint = this.detectEntryPoint(host);
    const strategy = this.strategyFactory.getStrategy(entryPoint);
    const context = this.buildContext(host, entryPoint);
    const errorResponse = strategy.format(exception, context);

    this.logError(exception, logLevel);

    return this.respond(host, entryPoint, errorResponse, exception);
  }

  protected detectEntryPoint(host: ArgumentsHost): EntryPoint {
    const type = host.getType<GqlContextType>();
    switch (type) {
      case 'http':
        return EntryPoint.REST;
      case 'graphql':
        return EntryPoint.GRAPHQL;
      case 'rpc':
        return EntryPoint.KAFKA;
      default:
        return EntryPoint.REST;
    }
  }

  protected buildContext(host: ArgumentsHost, entryPoint: EntryPoint): ErrorContext {
    const context: ErrorContext = {};

    if (entryPoint === EntryPoint.REST) {
      const ctx = host.switchToHttp();
      const request = ctx.getRequest<Request>();
      context.path = request.url;
      context.method = request.method;
      // In production, extract traceId from request headers (e.g., X-Request-Id, X-Trace-Id)
      context.traceId =
        (request.headers['x-request-id'] as string) || (request.headers['x-trace-id'] as string);
    }

    if (entryPoint === EntryPoint.KAFKA) {
      const ctx = host.switchToRpc();
      const data = ctx.getData();
      if (data && typeof data === 'object') {
        context.correlationId = data.correlationId;
        context.topic = data.topic;
        context.partition = data.partition;
        context.offset = data.offset;
        context.key = data.key;
        context.originalTimestamp = data.timestamp;
        context.originalPayload = data.payload || data;
        context.retryCount = data.retryCount;
        context.maxRetries = data.maxRetries;
      }
    }

    return context;
  }

  protected respond(
    host: ArgumentsHost,
    entryPoint: EntryPoint,
    errorResponse: ErrorResponse,
    exception: BaseError | Error,
  ): void | GraphQLError {
    switch (entryPoint) {
      case EntryPoint.REST:
        return this.respondRest(host, errorResponse as RestErrorResponse);
      case EntryPoint.GRAPHQL:
        return this.respondGraphQL(errorResponse as GraphQLErrorResponse, exception);
      case EntryPoint.KAFKA:
        return this.respondKafka(errorResponse as KafkaErrorResponse);
      default:
        return this.respondRest(host, errorResponse as RestErrorResponse);
    }
  }

  protected respondRest(host: ArgumentsHost, errorResponse: RestErrorResponse): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Set Content-Type to RFC 7807 standard
    response
      .status(errorResponse.status)
      .setHeader('Content-Type', 'application/problem+json')
      .json(errorResponse);
  }

  protected respondGraphQL(
    errorResponse: GraphQLErrorResponse,
    exception: BaseError | Error,
  ): GraphQLError {
    return new GraphQLError(errorResponse.message, {
      extensions: {
        code: errorResponse.code,
        classification: errorResponse.classification,
        traceId: errorResponse.traceId,
        timestamp: errorResponse.timestamp,
        validationErrors: errorResponse.validationErrors,
      },
    });
  }

  protected respondKafka(errorResponse: KafkaErrorResponse): void {
    // Kafka errors are logged and can be sent to DLQ
    // The error response contains all info needed for DLQ processing
    this.logger.debug('Kafka error response prepared for DLQ', {
      error: errorResponse.error,
      retry: errorResponse.retry,
    });
    // In a real implementation, this would publish to a DLQ topic
    // The caller (handler) is responsible for DLQ publishing
  }

  protected logError(exception: BaseError | Error, level: 'warn' | 'error'): void {
    const isBaseError = exception instanceof BaseError;
    const message = isBaseError
      ? `${exception.layer} error: ${exception.code} - ${exception.message}`
      : `Error: ${exception.message}`;

    const meta = isBaseError
      ? { layer: exception.layer, context: exception.context }
      : { stack: exception.stack };

    if (level === 'error') {
      this.logger.error(message, meta);
    } else {
      this.logger.warn(message, meta);
    }
  }
}
