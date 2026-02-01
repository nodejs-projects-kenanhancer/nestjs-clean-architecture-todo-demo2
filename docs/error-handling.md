# Error Handling Strategy

This document describes the error handling architecture in the NestJS Clean Architecture Todo application.

## Table of Contents

1. [Overview](#overview)
2. [Error Class Hierarchy](#error-class-hierarchy)
3. [Error Codes](#error-codes)
4. [Exception Filters](#exception-filters)
5. [Error Response Strategies](#error-response-strategies)
6. [Response Formats](#response-formats)
7. [Flow Diagrams](#flow-diagrams)
8. [Best Practices](#best-practices)

---

## Overview

The error handling system follows Clean Architecture principles with:

- **Layer-specific errors** - Each layer (Domain, Application, Infrastructure, Presentation) has its own error classes and codes
- **Unified exception filters** - Single set of filters that handle all entry points (REST, GraphQL, Kafka)
- **Strategy pattern** - Entry point-specific response formatting
- **Production-ready responses** - RFC 7807 for REST, GraphQL spec-compliant, DLQ format for Kafka

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Entry Points                                    │
├─────────────────┬─────────────────────┬─────────────────────────────────────┤
│      REST       │       GraphQL       │              Kafka                   │
│   /api/todos    │      /graphql       │         todo.events                  │
└────────┬────────┴──────────┬──────────┴──────────────────┬──────────────────┘
         │                   │                              │
         └───────────────────┼──────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Exception Filters                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  DomainExceptionFilter → ApplicationExceptionFilter →               │   │
│  │  InfrastructureExceptionFilter → PresentationExceptionFilter →      │   │
│  │  GlobalExceptionFilter                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                             │                                               │
│                             ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              ErrorResponseStrategyFactory                            │   │
│  │  ┌─────────────┬─────────────────┬─────────────────────┐            │   │
│  │  │ RESTStrategy│ GraphQLStrategy │    KafkaStrategy    │            │   │
│  │  └─────────────┴─────────────────┴─────────────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Response Formats                                     │
├─────────────────┬─────────────────────┬─────────────────────────────────────┤
│   RFC 7807      │   GraphQL Spec      │           Kafka DLQ                  │
│  Problem+JSON   │    Extensions       │         Event Format                 │
└─────────────────┴─────────────────────┴─────────────────────────────────────┘
```

---

## Error Class Hierarchy

### Base Error (Core Layer)

All errors extend from `BaseError` which provides common properties:

```typescript
// src/core/errors/base.error.ts
abstract class BaseError extends Error {
  readonly code: string;        // Machine-readable error code
  readonly timestamp: Date;     // When the error occurred
  readonly context?: object;    // Additional context data
  abstract get layer(): string; // Layer identifier (DOMAIN, APPLICATION, etc.)
}
```

### Layer-Specific Error Classes

```
BaseError (core)
    │
    ├── DomainError (domain)
    │       ├── TodoNotFoundError
    │       ├── TodoValidationError
    │       └── InvalidTodoStatusError
    │
    ├── ApplicationError (application)
    │       ├── ApplicationValidationError
    │       └── UseCaseExecutionError
    │
    ├── InfrastructureError (infrastructure)
    │       ├── DatabaseError
    │       └── KafkaError
    │
    └── PresentationError (presentation)
            └── BadRequestError
```

### File Locations

| Layer | Base Class | Location |
|-------|------------|----------|
| Core | `BaseError` | `src/core/errors/base.error.ts` |
| Domain | `DomainError` | `src/domain/errors/domain.error.ts` |
| Application | `ApplicationError` | `src/application/errors/application.error.ts` |
| Infrastructure | `InfrastructureError` | `src/infrastructure/errors/infrastructure.error.ts` |
| Presentation | `PresentationError` | `src/presentation/errors/presentation.error.ts` |

### Creating Custom Errors

```typescript
// Example: Creating a new domain error
import { DomainError } from './domain.error';
import { DomainErrorCode } from './error-codes';

export class TodoNotFoundError extends DomainError {
  constructor(todoId: string) {
    super(
      DomainErrorCode.TODO_NOT_FOUND,           // Error code from enum
      `Todo with id '${todoId}' was not found`, // Human-readable message
      { todoId }                                 // Context for debugging
    );
  }
}
```

---

## Error Codes

Each layer defines its own error codes in an enum, ensuring type safety and discoverability.

### Domain Error Codes

```typescript
// src/domain/errors/error-codes.ts
export enum DomainErrorCode {
  TODO_NOT_FOUND = 'TODO_NOT_FOUND',
  TODO_VALIDATION_FAILED = 'TODO_VALIDATION_FAILED',
  INVALID_TODO_STATUS = 'INVALID_TODO_STATUS',
  DOMAIN_ERROR = 'DOMAIN_ERROR',
}
```

**When to use:**
- Business rule violations
- Entity not found
- Invalid state transitions
- Domain validation failures

### Application Error Codes

```typescript
// src/application/errors/error-codes.ts
export enum ApplicationErrorCode {
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  USE_CASE_EXECUTION_FAILED = 'USE_CASE_EXECUTION_FAILED',
  APPLICATION_ERROR = 'APPLICATION_ERROR',
}
```

**When to use:**
- Input validation failures (DTO level)
- Use case orchestration errors
- Authorization failures (if implemented)

### Infrastructure Error Codes

```typescript
// src/infrastructure/errors/error-codes.ts
export enum InfrastructureErrorCode {
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  KAFKA_ERROR = 'KAFKA_ERROR',
  KAFKA_CONNECTION_FAILED = 'KAFKA_CONNECTION_FAILED',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INFRASTRUCTURE_ERROR = 'INFRASTRUCTURE_ERROR',
}
```

**When to use:**
- Database operation failures
- Message broker errors
- External service failures
- Network/connection issues

### Presentation Error Codes

```typescript
// src/presentation/errors/error-codes.ts
export enum PresentationErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  INVALID_INPUT_FORMAT = 'INVALID_INPUT_FORMAT',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  PRESENTATION_ERROR = 'PRESENTATION_ERROR',
}
```

**When to use:**
- Malformed requests
- Invalid content types
- Missing required parameters
- Request parsing errors

---

## Exception Filters

Exception filters catch errors and transform them into appropriate responses based on the entry point.

### Filter Hierarchy

Filters are registered globally in `InfrastructureModule` and process in order from most specific to least specific:

```
1. DomainExceptionFilter      → Catches DomainError
2. ApplicationExceptionFilter → Catches ApplicationError
3. InfrastructureExceptionFilter → Catches InfrastructureError
4. PresentationExceptionFilter → Catches PresentationError
5. GlobalExceptionFilter      → Catches all unhandled exceptions
```

### Base Exception Filter

All filters extend `BaseExceptionFilter` which provides:

```typescript
// src/infrastructure/exception-handling/filters/base-exception.filter.ts
abstract class BaseExceptionFilter {
  // Detects entry point from NestJS ArgumentsHost
  protected detectEntryPoint(host: ArgumentsHost): EntryPoint {
    const type = host.getType<GqlContextType>();
    switch (type) {
      case 'http': return EntryPoint.REST;
      case 'graphql': return EntryPoint.GRAPHQL;
      case 'rpc': return EntryPoint.KAFKA;
    }
  }

  // Builds context for error formatting
  protected buildContext(host: ArgumentsHost, entryPoint: EntryPoint): ErrorContext

  // Delegates to appropriate response strategy
  protected respond(host: ArgumentsHost, entryPoint: EntryPoint, response: ErrorResponse)
}
```

### Filter Implementation Example

```typescript
// src/infrastructure/exception-handling/filters/domain-exception.filter.ts
@Catch(DomainError)
export class DomainExceptionFilter extends BaseExceptionFilter implements ExceptionFilter {
  protected readonly logger = new Logger(DomainExceptionFilter.name);

  constructor(strategyFactory: ErrorResponseStrategyFactory) {
    super(strategyFactory);
  }

  catch(exception: DomainError, host: ArgumentsHost): void | GraphQLError {
    return this.handleException(exception, host, 'warn');
  }
}
```

### File Locations

```
src/infrastructure/exception-handling/filters/
├── base-exception.filter.ts        # Abstract base with shared logic
├── domain-exception.filter.ts      # Catches DomainError
├── application-exception.filter.ts # Catches ApplicationError
├── infrastructure-exception.filter.ts # Catches InfrastructureError
├── presentation-exception.filter.ts # Catches PresentationError
├── global-exception.filter.ts      # Catches all unhandled
└── index.ts                        # Barrel export
```

---

## Error Response Strategies

Strategies format errors according to each entry point's conventions.

### Strategy Pattern

```typescript
interface ErrorResponseStrategy<T extends ErrorResponse> {
  format(error: BaseError | Error, context?: ErrorContext): T;
  getEntryPoint(): EntryPoint;
}
```

### REST Strategy (RFC 7807)

Formats errors according to [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807):

```typescript
// src/infrastructure/exception-handling/strategies/rest-error-response.strategy.ts
@Injectable()
export class RestErrorResponseStrategy extends BaseErrorResponseStrategy<RestErrorResponse> {
  format(error: BaseError | Error, context?: ErrorContext): RestErrorResponse {
    return {
      type: 'https://api.example.com/problems/todo-not-found',
      title: 'Todo Not Found',
      status: 404,
      code: 'TODO_NOT_FOUND',
      detail: 'Todo with id "123" was not found',
      instance: '/api/todos/123',
      traceId: 'm5abc123-xk8def45',
      timestamp: '2026-01-25T10:30:00.000Z',
    };
  }
}
```

### GraphQL Strategy

Formats errors according to [GraphQL Spec](https://spec.graphql.org/October2021/#sec-Errors):

```typescript
// src/infrastructure/exception-handling/strategies/graphql-error-response.strategy.ts
@Injectable()
export class GraphQLErrorResponseStrategy extends BaseErrorResponseStrategy<GraphQLErrorResponse> {
  format(error: BaseError | Error, context?: ErrorContext): GraphQLErrorResponse {
    return {
      message: 'Todo with id "123" was not found',
      code: 'TODO_NOT_FOUND',
      classification: 'NOT_FOUND',
      traceId: 'm5abc123-xk8def45',
      timestamp: '2026-01-25T10:30:00.000Z',
    };
  }
}
```

### Kafka Strategy (DLQ)

Formats errors for Dead Letter Queue processing:

```typescript
// src/infrastructure/exception-handling/strategies/kafka-error-response.strategy.ts
@Injectable()
export class KafkaErrorResponseStrategy extends BaseErrorResponseStrategy<KafkaErrorResponse> {
  format(error: BaseError | Error, context?: ErrorContext): KafkaErrorResponse {
    return {
      error: {
        code: 'TODO_NOT_FOUND',
        message: 'Todo with id "123" was not found',
        type: 'PERMANENT',  // TRANSIENT | PERMANENT | POISON_PILL
        layer: 'DOMAIN',
        timestamp: '2026-01-25T10:30:00.000Z',
        traceId: 'm5abc123-xk8def45',
      },
      retry: {
        retryable: false,
        retryCount: 0,
        maxRetries: 3,
      },
      original: {
        topic: 'todo.events',
        partition: 0,
        offset: '12345',
        payload: { ... },
      },
    };
  }
}
```

### File Locations

```
src/infrastructure/exception-handling/strategies/
├── error-response.strategy.ts           # Interfaces and base class
├── rest-error-response.strategy.ts      # RFC 7807 implementation
├── graphql-error-response.strategy.ts   # GraphQL spec implementation
├── kafka-error-response.strategy.ts     # DLQ format implementation
├── error-response-strategy.factory.ts   # Factory for strategy selection
└── index.ts                             # Barrel export
```

---

## Response Formats

### REST API Response (RFC 7807)

**Content-Type:** `application/problem+json`

```json
{
  "type": "https://api.example.com/problems/todo-not-found",
  "title": "Todo Not Found",
  "status": 404,
  "code": "TODO_NOT_FOUND",
  "detail": "Todo with id '123' was not found",
  "instance": "/api/todos/123",
  "traceId": "m5abc123-xk8def45",
  "timestamp": "2026-01-25T10:30:00.000Z"
}
```

**Validation Error:**

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "code": "TODO_VALIDATION_FAILED",
  "detail": "One or more validation errors occurred",
  "instance": "/api/todos",
  "traceId": "m5abc123-xk8def45",
  "timestamp": "2026-01-25T10:30:00.000Z",
  "errors": [
    { "field": "title", "message": "Title is required" },
    { "field": "title", "message": "Title must be at least 1 character" }
  ]
}
```

### GraphQL Response

```json
{
  "data": null,
  "errors": [
    {
      "message": "Todo with id '123' was not found",
      "path": ["todo"],
      "locations": [{ "line": 2, "column": 3 }],
      "extensions": {
        "code": "TODO_NOT_FOUND",
        "classification": "NOT_FOUND",
        "traceId": "m5abc123-xk8def45",
        "timestamp": "2026-01-25T10:30:00.000Z"
      }
    }
  ]
}
```

**GraphQL Error Classifications:**

| Classification | Description |
|----------------|-------------|
| `BAD_USER_INPUT` | Validation errors, invalid input |
| `NOT_FOUND` | Resource not found |
| `UNAUTHENTICATED` | Not logged in |
| `FORBIDDEN` | Not authorized |
| `INTERNAL_SERVER_ERROR` | Server error (details hidden) |
| `SERVICE_UNAVAILABLE` | Infrastructure issues |

### Kafka DLQ Event

```json
{
  "error": {
    "code": "TODO_NOT_FOUND",
    "message": "Cannot process event: Todo '123' does not exist",
    "type": "PERMANENT",
    "layer": "DOMAIN",
    "timestamp": "2026-01-25T10:30:05.000Z",
    "traceId": "m5abc123-xk8def45",
    "correlationId": "req-789"
  },
  "retry": {
    "retryable": false,
    "retryCount": 3,
    "maxRetries": 3,
    "nextRetryAt": null
  },
  "original": {
    "topic": "todo.events",
    "partition": 0,
    "offset": "12345",
    "key": "todo-123",
    "timestamp": "2026-01-25T10:30:00.000Z",
    "payload": {
      "type": "TODO_COMPLETED",
      "data": { "todoId": "123" }
    }
  }
}
```

**Kafka Error Types:**

| Type | Retryable | Description |
|------|-----------|-------------|
| `TRANSIENT` | Yes | Network issues, temporary failures |
| `PERMANENT` | No | Validation errors, business rule violations |
| `POISON_PILL` | No | Corrupt or unparseable messages |

---

## Flow Diagrams

### Error Handling Flow

```
Exception Thrown
       │
       ▼
┌─────────────────────────────────────┐
│     NestJS Exception Filter         │
│  (catches by error type hierarchy)  │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│     BaseExceptionFilter             │
│  ┌─────────────────────────────┐   │
│  │ detectEntryPoint(host)       │   │
│  │ → REST / GraphQL / Kafka     │   │
│  └─────────────────────────────┘   │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│   ErrorResponseStrategyFactory      │
│  ┌─────────────────────────────┐   │
│  │ getStrategy(entryPoint)      │   │
│  └─────────────────────────────┘   │
└──────────────────┬──────────────────┘
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│   REST   │ │ GraphQL  │ │  Kafka   │
│ Strategy │ │ Strategy │ │ Strategy │
└────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │
     ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ RFC 7807 │ │  GraphQL │ │   DLQ    │
│ Response │ │  Error   │ │  Event   │
└──────────┘ └──────────┘ └──────────┘
```

### HTTP Status Code Mapping

| Error Type | HTTP Status | Description |
|------------|-------------|-------------|
| `TodoNotFoundError` | 404 | Resource not found |
| `TodoValidationError` | 400 | Invalid input data |
| `InvalidTodoStatusError` | 400 | Invalid status value |
| `DomainError` (generic) | 422 | Unprocessable entity |
| `ApplicationValidationError` | 400 | Validation failed |
| `ApplicationError` (generic) | 500 | Internal server error |
| `InfrastructureError` | 503 | Service unavailable |
| `PresentationError` | 400 | Bad request |
| Unknown errors | 500 | Internal server error |

---

## Best Practices

### 1. Always Use Layer-Specific Errors

```typescript
// ✅ Good - Use domain error for business logic
throw new TodoNotFoundError(todoId);

// ❌ Bad - Generic error loses context
throw new Error('Todo not found');
```

### 2. Use Error Codes from Enums

```typescript
// ✅ Good - Type-safe error code
super(DomainErrorCode.TODO_NOT_FOUND, message, context);

// ❌ Bad - String literal can have typos
super('TODO_NOT_FOUNDD', message, context);
```

### 3. Include Context for Debugging

```typescript
// ✅ Good - Context helps debugging
throw new TodoNotFoundError(todoId);
// Results in: { context: { todoId: '123' } }

// ❌ Bad - No context
throw new DomainError('TODO_NOT_FOUND', 'Not found');
```

### 4. Never Expose Internal Details in 5xx Errors

```typescript
// ✅ Good - Strategy hides internal details for 5xx
if (status >= 500) {
  return 'An unexpected error occurred. Please try again later.';
}

// ❌ Bad - Exposes stack trace or internal info
return error.stack;
```

### 5. Use Trace IDs for Correlation

```typescript
// ✅ Good - Include trace ID from request headers
const traceId = request.headers['x-request-id'] || generateTraceId();

// Use for logging
this.logger.error(`Error processing request`, { traceId, error });
```

### 6. Classify Kafka Errors Correctly

```typescript
// ✅ Good - Transient errors are retryable
if (error instanceof KafkaError) {
  return 'TRANSIENT'; // Will retry with backoff
}

// ✅ Good - Permanent errors go straight to DLQ
if (error instanceof TodoValidationError) {
  return 'PERMANENT'; // No point retrying
}
```

### 7. Add New Errors to the Correct Layer

| Scenario | Layer | Error Type |
|----------|-------|------------|
| Business rule violation | Domain | `DomainError` subclass |
| Entity not found | Domain | `TodoNotFoundError` |
| Input validation failed | Application | `ApplicationValidationError` |
| Use case failed | Application | `UseCaseExecutionError` |
| Database connection lost | Infrastructure | `DatabaseError` |
| External API timeout | Infrastructure | `InfrastructureError` |
| Invalid request format | Presentation | `BadRequestError` |

---

## Module Registration

Exception filters and strategies are registered globally in `InfrastructureModule`:

```typescript
// src/infrastructure/infrastructure.module.ts
@Global()
@Module({
  providers: [
    // Strategies
    RestErrorResponseStrategy,
    GraphQLErrorResponseStrategy,
    KafkaErrorResponseStrategy,
    ErrorResponseStrategyFactory,

    // Filters (registered as APP_FILTER)
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_FILTER, useClass: PresentationExceptionFilter },
    { provide: APP_FILTER, useClass: InfrastructureExceptionFilter },
    { provide: APP_FILTER, useClass: ApplicationExceptionFilter },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
  exports: [/* strategies */],
})
export class InfrastructureModule {}
```

---

## Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| `BaseError` | `core/errors/` | Base class for all errors |
| `DomainError` | `domain/errors/` | Business logic errors |
| `ApplicationError` | `application/errors/` | Use case errors |
| `InfrastructureError` | `infrastructure/errors/` | Technical errors |
| `PresentationError` | `presentation/errors/` | Request errors |
| Error Codes | `*/errors/error-codes.ts` | Type-safe error codes |
| Exception Filters | `infrastructure/exception-handling/filters/` | Error catching |
| Response Strategies | `infrastructure/exception-handling/strategies/` | Response formatting |
