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
│    │   │  │ PostgresTodoRepo     │           │ HttpClient       │ │    │   │
│    │   │  └──────────────────────┘           └──────────────────┘ │    │   │
│    │   └───────────────────────────────────────────────────────────┘    │   │
│    │                                                                     │   │
│    └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow with Mappers

Mappers are **owned by the outer layer** and convert between layer-specific types:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           REQUEST FLOW (Inward)                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  REST Request          Mapper                 Application          Domain      │
│  ┌──────────┐         ┌──────────┐           ┌──────────┐        ┌──────────┐ │
│  │CreateTodo│         │toCommand │           │CreateTodo│        │   Todo   │ │
│  │ Request  │────────▶│    ()    │──────────▶│ Command  │───────▶│ Entity   │ │
│  │  (DTO)   │         │          │           │          │        │          │ │
│  └──────────┘         └──────────┘           └──────────┘        └──────────┘ │
│       │                                                                        │
│       │  Presentation Layer      │       Application Layer    │  Domain Layer │
│       │  owns these types        │       owns these types     │  owns these   │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                           RESPONSE FLOW (Outward)                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  REST Response         Mapper                 Application          Domain      │
│  ┌──────────┐         ┌──────────┐           ┌──────────┐        ┌──────────┐ │
│  │CreateTodo│         │toResponse│           │CreateTodo│        │   Todo   │ │
│  │ Response │◀────────│    ()    │◀──────────│  Result  │◀───────│ Entity   │ │
│  │  (DTO)   │         │          │           │          │        │          │ │
│  └──────────┘         └──────────┘           └──────────┘        └──────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Why Mappers Live in the Outer Layer

| Aspect | Explanation |
|--------|-------------|
| **Dependency Rule** | Outer layers depend on inner layers. Mappers know about both their own DTOs AND application types. |
| **Type Ownership** | Each layer owns its types. REST owns `CreateTodoRequest`, Application owns `CreateTodoCommand`. |
| **No Leakage** | Application layer never knows about REST DTOs, GraphQL inputs, or Kafka messages. |
| **Flexibility** | You can add a new presentation layer (gRPC) without changing application or domain code. |

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
| **L** - Liskov Substitution | Repository implementations are interchangeable (`InMemoryTodoRepository` ↔ `PostgresTodoRepository`) |
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

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

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
