# Exception Handling

This module provides unified exception handling for all entry points (REST, GraphQL, Kafka).

## Quick Reference

### Structure

```
exception-handling/
├── filters/                    # Exception filters (catch errors)
│   ├── base-exception.filter.ts
│   ├── domain-exception.filter.ts
│   ├── application-exception.filter.ts
│   ├── infrastructure-exception.filter.ts
│   ├── presentation-exception.filter.ts
│   └── global-exception.filter.ts
├── strategies/                 # Response formatters
│   ├── error-response.strategy.ts
│   ├── rest-error-response.strategy.ts
│   ├── graphql-error-response.strategy.ts
│   ├── kafka-error-response.strategy.ts
│   └── error-response-strategy.factory.ts
└── README.md
```

### How It Works

```
Error Thrown → Exception Filter → Detect Entry Point → Select Strategy → Format Response
```

1. **Exception Filter** catches errors by layer type (Domain, Application, etc.)
2. **Entry Point Detection** determines if request came from REST, GraphQL, or Kafka
3. **Strategy Selection** picks the appropriate formatter
4. **Response Formatting** creates entry point-specific error response

### Response Formats

| Entry Point | Format | Standard |
|-------------|--------|----------|
| REST | RFC 7807 Problem Details | `application/problem+json` |
| GraphQL | GraphQL Error Extensions | GraphQL Spec |
| Kafka | DLQ Event | Custom |

### Error Code Sources

Error codes come from layer-specific enums:

- `DomainErrorCode` → `src/domain/errors/error-codes.ts`
- `ApplicationErrorCode` → `src/application/errors/error-codes.ts`
- `InfrastructureErrorCode` → `src/infrastructure/errors/error-codes.ts`
- `PresentationErrorCode` → `src/presentation/errors/error-codes.ts`

### Full Documentation

See [docs/error-handling.md](docs/error-handling.md) for complete documentation.
