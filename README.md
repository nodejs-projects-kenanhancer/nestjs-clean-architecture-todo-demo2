# NestJS Clean Architecture Todo Demo

A comprehensive Todo application demonstrating **Clean Architecture** principles with **NestJS**, featuring multiple presentation layers (REST, GraphQL, Kafka) and strict separation of concerns.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Principles](#principles)
- [Design Patterns](#design-patterns)
- [Project Structure](#project-structure)
- [Layer Descriptions](#layer-descriptions)
- [Mapper Pattern](#mapper-pattern)
- [Error Handling](#error-handling)
- [Getting Started](#getting-started)
- [Pipeline Module](#pipeline-module)
- [Tech Stack](#tech-stack)
- [API Examples](#api-examples)

## Architecture Overview

This project implements **Clean Architecture** (also known as Onion Architecture or Hexagonal Architecture), where dependencies flow **inward** toward the domain layer. The architecture ensures that business logic remains independent of frameworks, databases, and external services.

### The Dependency Rule

> **Dependencies point INWARD. Inner layers know nothing about outer layers.**

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│    PRESENTATION LAYER (Outer)                                                 │
│    ┌─────────────────────────────────────────────────────────────────────┐   │
│    │                                                                     │   │
│    │   REST              GraphQL            Kafka                        │   │
│    │   ┌──────────┐      ┌──────────┐      ┌──────────┐                 │   │
│    │   │Controller│      │ Resolver │      │ Handler  │                 │   │
│    │   │          │      │          │      │          │                 │   │
│    │   │ Request  │      │  Input   │      │ Message  │  ← Own Types    │   │
│    │   │ Response │      │  Type    │      │ Payload  │                 │   │
│    │   └────┬─────┘      └────┬─────┘      └────┬─────┘                 │   │
│    │        │                 │                 │                        │   │
│    │        ▼                 ▼                 ▼                        │   │
│    │   ┌─────────────────────────────────────────────┐                  │   │
│    │   │              M A P P E R S                  │ ← Convert to     │   │
│    │   │  toCommand(Request) → Command              │   inner types    │   │
│    │   │  toResponse(Result) ← Result               │                  │   │
│    │   └─────────────────────┬───────────────────────┘                  │   │
│    │                         │                                          │   │
│    └─────────────────────────┼──────────────────────────────────────────┘   │
│                              │ depends on                                    │
│                              ▼                                               │
│    ┌─────────────────────────────────────────────────────────────────────┐   │
│    │                                                                     │   │
│    │   APPLICATION LAYER                                                 │   │
│    │   ┌───────────────────────────────────────────────────────────┐    │   │
│    │   │                                                           │    │   │
│    │   │  Commands              Use Cases              Queries     │    │   │
│    │   │  ┌──────────┐         ┌──────────┐         ┌──────────┐  │    │   │
│    │   │  │ Create   │────────▶│ UseCase  │◀────────│ GetById  │  │    │   │
│    │   │  │ Update   │         │ execute()│         │ List     │  │    │   │
│    │   │  │ Delete   │         └────┬─────┘         └──────────┘  │    │   │
│    │   │  └──────────┘              │                             │    │   │
│    │   │                            │                             │    │   │
│    │   │  Results ◀─────────────────┘                             │    │   │
│    │   │  ┌──────────┐                                            │    │   │
│    │   │  │ Result   │  (Application layer's own output types)    │    │   │
│    │   │  └──────────┘                                            │    │   │
│    │   └───────────────────────────┬───────────────────────────────┘    │   │
│    │                               │                                    │   │
│    └───────────────────────────────┼────────────────────────────────────┘   │
│                                    │ depends on                              │
│                                    ▼                                         │
│    ┌─────────────────────────────────────────────────────────────────────┐   │
│    │                                                                     │   │
│    │   DOMAIN LAYER (Inner - No dependencies on outer layers)            │   │
│    │   ┌───────────────────────────────────────────────────────────┐    │   │
│    │   │                                                           │    │   │
│    │   │  Entities            Value Objects         Domain Events  │    │   │
│    │   │  ┌──────────┐       ┌──────────┐          ┌──────────┐   │    │   │
│    │   │  │  Todo    │       │ TodoId   │          │ Created  │   │    │   │
│    │   │  │          │       │ Title    │          │ Deleted  │   │    │   │
│    │   │  └──────────┘       │ Desc     │          │ Completed│   │    │   │
│    │   │                     └──────────┘          └──────────┘   │    │   │
│    │   │                                                           │    │   │
│    │   │  Repository Interfaces (Ports)                            │    │   │
│    │   │  ┌─────────────────────────────────────────────────────┐ │    │   │
│    │   │  │ interface TodoRepository { save(), findById(), ... } │ │    │   │
│    │   │  └─────────────────────────────────────────────────────┘ │    │   │
│    │   └───────────────────────────────────────────────────────────┘    │   │
│    │                                                                     │   │
│    └─────────────────────────────────────────────────────────────────────┘   │
│                                    ▲                                         │
│                                    │ implements                              │
│    ┌─────────────────────────────────────────────────────────────────────┐   │
│    │                                                                     │   │
│    │   INFRASTRUCTURE LAYER (Implements domain interfaces)               │   │
│    │   ┌───────────────────────────────────────────────────────────┐    │   │
│    │   │  Repository Implementations          External Services    │    │   │
│    │   │  ┌──────────────────────┐           ┌──────────────────┐ │    │   │
│    │   │  │ InMemoryTodoRepo     │           │ KafkaService     │ │    │   │
│    │   │  │ (swap to Postgres)   │           │                  │ │    │   │
│    │   │  └──────────────────────┘           └──────────────────┘ │    │   │
│    │   └───────────────────────────────────────────────────────────┘    │   │
│    │                                                                     │   │
│    └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow & Type Conversions Across All Layers

Each layer boundary requires type conversion. **Outer layers own their mappers** to convert to/from inner layer types:

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        COMPLETE REQUEST/RESPONSE FLOW                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

 PRESENTATION          APPLICATION              DOMAIN              INFRASTRUCTURE
 (REST/GraphQL)        (Use Cases)              (Business)          (Persistence)
 ───────────────       ─────────────            ──────────          ─────────────────

     Request           Command                  Entity               Persistence
    ┌────────┐        ┌────────┐              ┌────────┐            ┌────────┐
    │ Create │        │ Create │              │  Todo  │            │ Todo   │
    │  Todo  │        │  Todo  │              │ Entity │            │ Record │
    │Request │        │Command │              │        │            │ (DB)   │
    └───┬────┘        └───┬────┘              └───┬────┘            └───┬────┘
        │                 │                      │                     │
        │   ┌─────────┐   │                      │                     │
        │   │ Mapper  │   │    ┌──────────┐      │    ┌──────────┐    │
        └──▶│toCommand│───┴───▶│ Use Case │──────┴───▶│Repository│────┘
            │   ()    │        │execute() │           │  save()  │
            └─────────┘        └────┬─────┘           └────┬─────┘
                                    │                      │
        ┌───────────────────────────┘                      │
        │                                                  │
        │   ┌──────────┐       ┌────────┐                 │
        │   │  Result  │       │  Todo  │                 │
        │   │ fromEnt- │◀──────│ Entity │◀────────────────┘
        │   │  ity()   │       │        │      toDomain()
        │   └────┬─────┘       └────────┘      (in Repository)
        │        │
        │        │ Result
        ▼        ▼
    ┌─────────┐  ┌────────┐
    │ Mapper  │  │ Create │
    │toRespon-│◀─│  Todo  │
    │  se()   │  │ Result │
    └────┬────┘  └────────┘
         │
         ▼
    ┌────────┐
    │ Create │
    │  Todo  │
    │Response│
    └────────┘


┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         TYPE CONVERSIONS AT EACH BOUNDARY                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  BOUNDARY                    CONVERSION                      WHO OWNS IT            │
│  ─────────────────────────────────────────────────────────────────────────────────  │
│                                                                                     │
│  Presentation → Application  Request DTO → Command          Presentation Layer     │
│                              (via Mapper.toCommand())       (owns Mapper)           │
│                                                                                     │
│  Application → Domain        Command → Entity               Application Layer      │
│                              (via Todo.create())            (Use Case calls         │
│                                                              domain factory)        │
│                                                                                     │
│  Domain → Infrastructure     Entity → Persistence Model     Infrastructure Layer   │
│                              (via toPersistence())          (Repository impl)       │
│                                                                                     │
│  Infrastructure → Domain     Persistence Model → Entity     Infrastructure Layer   │
│                              (via toDomain())               (Repository impl)       │
│                                                                                     │
│  Domain → Application        Entity → Result                Application Layer      │
│                              (via Result.fromEntity())      (Use Case creates       │
│                                                              Result)                │
│                                                                                     │
│  Application → Presentation  Result → Response DTO          Presentation Layer     │
│                              (via Mapper.toResponse())      (owns Mapper)           │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Example: Complete Create Todo Flow

```typescript
// 1. PRESENTATION LAYER - Controller receives HTTP request
@Post()
async create(@Body() request: CreateTodoRequest): Promise<CreateTodoResponse> {
  // 2. Mapper converts Presentation type → Application type
  const command = this.mapper.toCommand(request);  // CreateTodoRequest → CreateTodoCommand

  // 3. APPLICATION LAYER - Use Case orchestrates
  const result = await this.createTodoUseCase.execute(command);

  // 4. Mapper converts Application type → Presentation type
  return this.mapper.toResponse(result);  // CreateTodoResult → CreateTodoResponse
}

// Inside CreateTodoUseCase.execute():
async execute(command: CreateTodoCommand): Promise<CreateTodoResult> {
  // 5. DOMAIN LAYER - Create entity from command data
  const todo = Todo.create(command.title, command.description);  // Command → Entity

  // 6. INFRASTRUCTURE LAYER - Repository persists (may convert to DB model internally)
  const saved = await this.todoRepository.save(todo);  // Entity → DB → Entity

  // 7. APPLICATION LAYER - Convert entity to result
  return CreateTodoResult.fromEntity(saved);  // Entity → Result
}

// Inside InMemoryTodoRepository (Infrastructure):
async save(todo: Todo): Promise<Todo> {
  // Convert domain entity to persistence model (if needed)
  const record = this.toPersistence(todo);  // Entity → Persistence Model
  this.storage.set(record.id, record);

  // Convert back to domain entity
  return this.toDomain(record);  // Persistence Model → Entity
}
```

### Why Each Layer Owns Its Mappers

| Layer | Owns Mappers For | Reason |
|-------|------------------|--------|
| **Presentation** | DTO ↔ Command/Result | Knows HTTP/GraphQL specifics (serialization, validation decorators) |
| **Application** | Command → Entity, Entity → Result | Orchestrates domain operations, creates results |
| **Infrastructure** | Entity ↔ Persistence Model | Knows database specifics (ORM entities, column mappings) |
| **Domain** | None (pure) | No external dependencies, only business logic |

## Principles

### Clean Architecture Principles

| Principle | Description |
|-----------|-------------|
| **Dependency Rule** | Dependencies point inward. Outer layers depend on inner layers, never the reverse. |
| **Independence** | Business logic is independent of UI, database, frameworks, and external agencies. |
| **Testability** | Business rules can be tested without UI, database, web server, or any external element. |
| **Flexibility** | External components (database, UI) can be swapped without changing business logic. |

### SOLID Principles

| Principle | Implementation |
|-----------|----------------|
| **S** - Single Responsibility | Each class has one reason to change (e.g., `CreateTodoUseCase` only handles creation) |
| **O** - Open/Closed | New features added via new classes (e.g., new mappers) without modifying existing code |
| **L** - Liskov Substitution | Repository implementations are interchangeable (e.g., swap `InMemoryTodoRepository` for a database-backed implementation) |
| **I** - Interface Segregation | Granular mapper interfaces (`IRestCommandMapper`, `IRestQueryMapper`) instead of one large interface |
| **D** - Dependency Inversion | High-level modules depend on abstractions (e.g., use cases depend on `TodoRepository` interface) |

### Domain-Driven Design (DDD) Concepts

- **Entities**: Objects with identity (`Todo`)
- **Value Objects**: Immutable objects without identity (`TodoId`, `TodoTitle`, `TodoDescription`)
- **Aggregates**: Cluster of entities treated as a unit (`Todo` is an aggregate root)
- **Repository Pattern**: Abstraction over data persistence
- **Domain Events**: Events that domain experts care about (`TodoCreatedEvent`, `TodoCompletedEvent`)

## Design Patterns

### CQRS (Command Query Responsibility Segregation)

Commands and queries are separated into distinct models:

```
Commands (Write)              Queries (Read)
├── CreateTodoCommand         ├── GetTodoByIdQuery
├── UpdateTodoCommand         └── ListTodosQuery
├── DeleteTodoCommand
└── CompleteTodoCommand
```

### Repository Pattern

Abstract data access behind interfaces:

```typescript
// Domain layer defines the contract
interface TodoRepository {
  save(todo: Todo): Promise<Todo>;
  findById(id: TodoId): Promise<Todo | null>;
  findAll(): Promise<Todo[]>;
  delete(id: TodoId): Promise<void>;
}

// Infrastructure layer provides implementation
class InMemoryTodoRepository implements TodoRepository { ... }
```

### Mapper Pattern (Granular Interface-Based)

Type-safe, single-responsibility mappers for each operation:

```typescript
// Interfaces
interface IRestCommandMapper<TRequest, TCommand, TResult, TResponse> {
  toCommand(request: TRequest): TCommand;
  toResponse(result: TResult): TResponse;
}

interface IRestQueryMapper<TParams, TQuery, TResult, TResponse> {
  toQuery(params: TParams): TQuery;
  toResponse(result: TResult): TResponse;
}

// Implementation
@Injectable()
class CreateTodoRestMapper implements IRestCommandMapper<
  CreateTodoRequest, CreateTodoCommand, CreateTodoResult, CreateTodoResponse
> { ... }
```

### Use Case Pattern

Each use case encapsulates a single business operation:

```typescript
@Injectable()
class CreateTodoUseCase implements UseCase<CreateTodoCommand, CreateTodoResult> {
  constructor(private readonly todoRepository: TodoRepository) {}

  async execute(command: CreateTodoCommand): Promise<CreateTodoResult> {
    const todo = Todo.create(command.title, command.description);
    const saved = await this.todoRepository.save(todo);
    return CreateTodoResult.fromEntity(saved);
  }
}
```

### Strategy Pattern

Error response formatting varies by entry point (REST, GraphQL, Kafka):

```typescript
interface ErrorResponseStrategy<T> {
  getEntryPoint(): EntryPoint;
  format(error: Error, context?: ErrorContext): T;
}

class RestErrorResponseStrategy implements ErrorResponseStrategy<RestErrorResponse> { ... }
class GraphQLErrorResponseStrategy implements ErrorResponseStrategy<GraphQLErrorResponse> { ... }
```

## Project Structure

```
src/
├── app.module.ts                    # Root application module
├── main.ts                          # Application entry point
│
├── common/                          # Shared utilities and modules
│   └── pipeline/                    # Transport-agnostic middleware pipeline
│       ├── middleware.interface.ts   # IMiddleware<TInput, TOutput>
│       ├── pipeline.ts              # Pipeline class with fluent API
│       ├── pipeline.module.ts       # NestJS module integration
│       ├── pipeline.decorator.ts    # @UsePipeline, @UseModulePipeline
│       ├── pipeline.resolver.ts     # Pipeline dependency resolver
│       └── pipeline.constants.ts    # Metadata constants
│
├── core/                            # Shared kernel (cross-cutting concerns)
│   ├── contracts/                   # Interface definitions
│   │   ├── mapper.contract.ts       # Generic mapper interfaces
│   │   ├── presentation-mapper.contract.ts  # REST/GraphQL/Kafka mapper interfaces
│   │   ├── repository.contract.ts   # Base repository interface
│   │   └── use-case.contract.ts     # Use case interface
│   ├── errors/                      # Base error classes
│   ├── types/                       # Shared types (EntryPoint enum)
│   └── utilities/                   # Utility functions (Result type)
│
├── domain/                          # Enterprise business rules
│   ├── entities/                    # Domain entities
│   │   └── todo.entity.ts           # Todo aggregate root
│   ├── value-objects/               # Value objects
│   │   ├── todo-id.vo.ts            # Todo identifier
│   │   ├── todo-title.vo.ts         # Todo title with validation
│   │   └── todo-description.vo.ts   # Todo description with validation
│   ├── repositories/                # Repository interfaces (ports)
│   │   └── todo.repository.ts
│   ├── events/                      # Domain events
│   │   ├── todo-created.event.ts
│   │   ├── todo-completed.event.ts
│   │   └── todo-deleted.event.ts
│   └── errors/                      # Domain-specific errors
│       ├── domain.error.ts
│       ├── todo-not-found.error.ts
│       ├── todo-validation.error.ts
│       └── invalid-todo-status.error.ts
│
├── application/                     # Application business rules
│   ├── application.module.ts        # Application layer module
│   ├── todo/
│   │   ├── commands/                # Write operations (CQRS)
│   │   │   ├── create-todo/
│   │   │   │   ├── create-todo.command.ts
│   │   │   │   ├── create-todo.use-case.ts
│   │   │   │   └── create-todo.result.ts
│   │   │   ├── update-todo/
│   │   │   ├── delete-todo/
│   │   │   └── complete-todo/
│   │   └── queries/                 # Read operations (CQRS)
│   │       ├── get-todo-by-id/
│   │       │   ├── get-todo-by-id.query.ts
│   │       │   ├── get-todo-by-id.use-case.ts
│   │       │   └── get-todo-by-id.result.ts
│   │       └── list-todos/
│   └── errors/                      # Application-specific errors
│
├── infrastructure/                  # Frameworks & drivers
│   ├── infrastructure.module.ts
│   ├── persistence/
│   │   ├── repositories/            # Repository implementations
│   │   │   └── in-memory-todo.repository.ts
│   │   └── entities/                # Persistence entities (ORM)
│   ├── messaging/
│   │   └── kafka/                   # Kafka service
│   ├── exception-handling/
│   │   ├── filters/                 # NestJS exception filters
│   │   │   ├── global-exception.filter.ts
│   │   │   ├── domain-exception.filter.ts
│   │   │   └── application-exception.filter.ts
│   │   └── strategies/              # Error response strategies
│   │       ├── rest-error-response.strategy.ts
│   │       ├── graphql-error-response.strategy.ts
│   │       └── kafka-error-response.strategy.ts
│   └── errors/                      # Infrastructure-specific errors
│
└── presentation/                    # Interface adapters
    ├── presentation.module.ts
    │
    ├── rest/                        # REST API
    │   ├── rest.module.ts
    │   ├── controllers/
    │   │   └── todo.controller.ts
    │   ├── dtos/
    │   │   ├── requests/            # Input DTOs
    │   │   │   ├── create-todo.request.ts
    │   │   │   └── update-todo.request.ts
    │   │   └── responses/           # Output DTOs
    │   │       └── todo.response.ts
    │   └── mappers/                 # REST-specific mappers
    │       ├── mapper.tokens.ts     # DI tokens
    │       ├── create-todo-rest.mapper.ts
    │       ├── update-todo-rest.mapper.ts
    │       ├── delete-todo-rest.mapper.ts
    │       ├── get-todo-by-id-rest.mapper.ts
    │       └── list-todos-rest.mapper.ts
    │
    ├── graphql/                     # GraphQL API
    │   ├── graphql.module.ts
    │   ├── resolvers/
    │   │   └── todo.resolver.ts
    │   ├── dtos/
    │   │   ├── inputs/              # GraphQL input types
    │   │   │   ├── create-todo.input.ts
    │   │   │   └── update-todo.input.ts
    │   │   └── types/               # GraphQL object types
    │   │       └── todo.type.ts
    │   ├── args/                    # GraphQL arguments
    │   │   ├── get-todo.args.ts
    │   │   └── list-todos.args.ts
    │   └── mappers/                 # GraphQL-specific mappers
    │       ├── mapper.tokens.ts
    │       ├── create-todo-graphql.mapper.ts
    │       ├── update-todo-graphql.mapper.ts
    │       ├── delete-todo-graphql.mapper.ts
    │       ├── get-todo-graphql.mapper.ts
    │       └── list-todos-graphql.mapper.ts
    │
    ├── kafka/                       # Kafka messaging
    │   ├── kafka.module.ts
    │   ├── handlers/                # Message handlers
    │   │   ├── todo-kafka.handler.ts
    │   │   └── todo-event.handler.ts
    │   ├── publishers/              # Event publishers
    │   │   └── todo-event.publisher.ts
    │   ├── messages/                # Incoming message types
    │   ├── payloads/                # Outgoing payload types
    │   ├── dtos/
    │   └── mappers/
    │
    └── errors/                      # Presentation-specific errors
```

## Layer Descriptions

### Core Layer
Shared kernel containing cross-cutting concerns: interfaces, base classes, and utilities used across all layers.

### Domain Layer
The heart of the application containing:
- **Entities**: Business objects with identity and behavior
- **Value Objects**: Immutable objects representing concepts
- **Repository Interfaces**: Abstractions for data access (ports)
- **Domain Events**: Business-relevant events
- **Domain Errors**: Business rule violations

### Application Layer
Orchestrates the flow of data and coordinates domain objects:
- **Commands**: Represent intent to change state
- **Queries**: Represent intent to read state
- **Use Cases**: Execute business operations
- **Results**: Return data from use cases

### Infrastructure Layer
Implements interfaces defined in inner layers:
- **Repository Implementations**: Concrete data access
- **External Services**: Kafka, HTTP clients, etc.
- **Exception Handling**: Filters and strategies

### Presentation Layer
Handles external communication:
- **REST**: Controllers, DTOs, mappers
- **GraphQL**: Resolvers, inputs, types, mappers
- **Kafka**: Handlers, messages, payloads, mappers

## Mapper Pattern

### Why Granular Mappers?

Instead of a single monolithic mapper class, each operation has its own mapper implementing a specific interface:

| Benefit | Description |
|---------|-------------|
| **Single Responsibility** | Each mapper handles one transformation |
| **Type Safety** | Compile-time guarantees with 4-type generics |
| **Testability** | Easy to unit test in isolation |
| **Open/Closed** | Add new mappers without modifying existing ones |

### Mapper Interfaces

```typescript
// REST
IRestCommandMapper<TRequest, TCommand, TResult, TResponse>
IRestQueryMapper<TParams, TQuery, TResult, TResponse>

// GraphQL
IGraphqlMutationMapper<TInput, TCommand, TResult, TType>
IGraphqlQueryMapper<TArgs, TQuery, TResult, TType>

// Kafka
IKafkaCommandMapper<TMessage, TCommand, TResult, TPayload>
IKafkaQueryMapper<TMessage, TQuery, TResult, TPayload>
```

### Data Flow

```
REST Request → Mapper.toCommand() → Command → UseCase → Result → Mapper.toResponse() → REST Response
```

## Error Handling

Layered error handling with RFC 7807 Problem Details for REST:

```
Domain Errors → Application Errors → Infrastructure Errors → Presentation Errors
     ↓                  ↓                    ↓                      ↓
TodoNotFoundError  ValidationError    DatabaseError         BadRequestError
     ↓                  ↓                    ↓                      ↓
     └──────────────────┴────────────────────┴──────────────────────┘
                                    ↓
                         Exception Filters
                                    ↓
                    Error Response Strategy (REST/GraphQL/Kafka)
```

## Pipeline Module

A transport-agnostic middleware pipeline system located in `src/common/pipeline/`. It provides composable, type-safe middleware execution for any request/response flow.

### Core Components

- **`Pipeline<TInput, TOutput>`** - Main pipeline class with fluent API
- **`IMiddleware<TInput, TOutput>`** - Middleware interface with `handle(input, next)` method
- **Decorators** - `@UsePipeline()`, `@UseModulePipeline()`, `@PipelineModuleDecorator()` for declarative usage

### Execution Model

```
Input → MW1.before → MW2.before → Handler → MW2.after → MW1.after → Output
```

### Example

```typescript
const pipeline = new Pipeline<string, string>();

pipeline.use({
  async handle(input: string, next: NextFunction<string>) {
    console.log('before');
    const result = await next();
    console.log('after');
    return result;
  },
});

const result = await pipeline.execute('hello', async () => 'world');
```

### Features

- Type-safe generics for input/output
- Composable and chainable middlewares
- Error-aware (middleware can catch and transform errors)
- Short-circuitable (can return without calling next)
- Mergeable pipelines via `useAll()`
- Comprehensive test suite with 45 tests

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 24.14.0 LTS | Runtime |
| **TypeScript** | 6.0.0-beta | Language |
| **NestJS** | 11.x | Framework |
| **Apollo Server** | 5.x | GraphQL |
| **KafkaJS** | 2.x | Event streaming |
| **Jest** | 30.x | Testing |
| **ESLint** | 9.x | Linting |
| **Prettier** | 3.x | Formatting |

### TypeScript Configuration

- **IDE/Type Checking**: `module: esnext` + `moduleResolution: bundler` (extensionless imports)
- **Production Build**: `module: commonjs` (via `tsconfig.build.json` override)
- **Target**: ES2024
- **Path Aliases**: `@core/*`, `@domain/*`, `@application/*`, `@infrastructure/*`, `@presentation/*`, `@common/*`

## Getting Started

### Prerequisites

- Node.js 24+ (LTS)
- npm 11+

### Installation

```bash
npm install
```

### Running the Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## API Examples

### REST API

```bash
# Create a todo
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Clean Architecture", "description": "Study the principles"}'

# Get all todos
curl http://localhost:3000/api/todos

# Get todo by ID
curl http://localhost:3000/api/todos/{id}

# Update a todo
curl -X PUT http://localhost:3000/api/todos/{id} \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title", "status": "COMPLETED"}'

# Delete a todo
curl -X DELETE http://localhost:3000/api/todos/{id}
```

### GraphQL API

Access GraphQL Playground at `http://localhost:3000/graphql`

```graphql
# Create a todo
mutation {
  createTodo(input: { title: "Learn GraphQL", description: "Study queries and mutations" }) {
    id
    title
    status
    createdAt
  }
}

# Get all todos
query {
  todos {
    id
    title
    status
  }
}

# Get todo by ID
query {
  todo(id: "uuid-here") {
    id
    title
    description
    status
    createdAt
    updatedAt
  }
}
```

## License

MIT
