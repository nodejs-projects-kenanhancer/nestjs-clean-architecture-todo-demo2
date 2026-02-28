# Pipeline Middleware Library

A generic **Chain of Responsibility** pipeline library for NestJS applications. It provides transport-agnostic cross-cutting concerns (logging, validation, transactions, retries, etc.) that work regardless of entry point — REST, GraphQL, Kafka, CLI, or direct method calls.

## Why?

NestJS built-in mechanisms (Guards, Pipes, Interceptors, Filters, Middleware) only fire when a request enters through a transport layer (HTTP, GraphQL, microservices). They **don't fire** when:

- A use case is called directly in tests
- A CLI command invokes application logic
- A Kafka consumer processes a message (no HTTP context)
- One use case calls another internally

This library solves that by attaching middleware pipelines at the **application layer**, not the transport layer.

## Architecture

```
src/common/pipeline/
  pipeline.constants.ts      # Symbol tokens and metadata keys
  middleware.interface.ts     # IMiddleware, NextFunction, MiddlewareEntry
  pipeline.ts                # Pipeline class (pure, no NestJS dependency)
  pipeline.decorator.ts      # @UsePipeline, @UseModulePipeline, @PipelineModuleDecorator
  pipeline.resolver.ts       # Scope merging + DI resolution via ModuleRef
  pipeline.module.ts         # PipelineModule.register() NestJS DynamicModule
  index.ts                   # Barrel exports
```

## Core Concepts

### IMiddleware

The fundamental contract. Each middleware receives the input and a `next` function to call the next middleware (or the final handler).

```typescript
interface IMiddleware<TInput = unknown, TOutput = unknown> {
  handle(input: TInput, next: NextFunction<TOutput>): Promise<TOutput>;
}
```

### Pipeline

A pure class (no NestJS dependency) that composes middlewares using `reduceRight` — first-added middleware is the outermost wrapper.

```typescript
interface OrderCommand {
  orderId: string;
  quantity: number;
}

interface OrderResult {
  success: boolean;
  orderId: string;
}

const pipeline = new Pipeline<OrderCommand, OrderResult>();
pipeline.use(loggingMiddleware, validationMiddleware);

const result = await pipeline.execute(
  { orderId: 'ORD-001', quantity: 5 },
  async (input) => {
    // your handler logic
    return { success: true, orderId: input.orderId };
  },
);
```

### MiddlewareEntry

Middlewares can be either:
- **Class types** (`LoggingMiddleware`) — resolved from NestJS DI container at runtime
- **Instances** (`new RetryMiddleware(3)`) — used directly, no DI needed

```typescript
type MiddlewareEntry = Type<IMiddleware> | IMiddleware;
```

## Scope Levels

Middlewares can be registered at 4 scope levels. When a pipeline is resolved, scopes merge in order:

```
Global → Module → Class → Method → Target handler
```

### 1. Global Scope

Register in `AppModule` imports. These run for every resolved pipeline in the app.

```typescript
import { PipelineModule } from '@common/pipeline/index.js';

@Module({
  imports: [
    PipelineModule.register(LoggingMiddleware),
    // ...
  ],
})
export class AppModule {}
```

### 2. Module Scope

Attach to a NestJS module class. These run for pipelines resolved within that module's context.

```typescript
import { UseModulePipeline } from '@common/pipeline/index.js';

@UseModulePipeline(TransactionMiddleware)
@Module({
  providers: [TransactionMiddleware, CreateTodoUseCase],
})
export class TodoModule {}
```

Or use the combined decorator:

```typescript
import { PipelineModuleDecorator } from '@common/pipeline/index.js';

@PipelineModuleDecorator({
  providers: [TransactionMiddleware, CreateTodoUseCase],
  pipeline: [TransactionMiddleware],
})
export class TodoModule {}
```

### 3. Class Scope

Attach to a use case or service class. These run whenever this class's pipeline is resolved.

```typescript
import { UsePipeline } from '@common/pipeline/index.js';

@UsePipeline(ValidationMiddleware)
@Injectable()
export class CreateTodoUseCase {
  // ...
}
```

### 4. Method Scope

Attach to a specific method. These run only when that method's pipeline is resolved.

```typescript
@Injectable()
export class CreateTodoUseCase {
  @UsePipeline(new RetryMiddleware(3))
  async execute(command: CreateTodoCommand): Promise<CreateTodoResult> {
    // ...
  }
}
```

## DI-Aware Middlewares

### @Injectable() Middleware (with DI dependencies)

```typescript
@Injectable()
export class TransactionMiddleware<TInput, TOutput> implements IMiddleware<TInput, TOutput> {
  constructor(private readonly dataSource: DataSource) {}

  async handle(input: TInput, next: NextFunction<TOutput>): Promise<TOutput> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const result = await next();
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

Pass the **class type** — `PipelineResolver` resolves it from the DI container via `ModuleRef`:

```typescript
@UsePipeline(TransactionMiddleware) // class type, resolved by DI
```

### Plain Middleware (no DI dependencies)

```typescript
class RetryMiddleware<TInput, TOutput> implements IMiddleware<TInput, TOutput> {
  constructor(private readonly maxRetries: number) {}

  async handle(input: TInput, next: NextFunction<TOutput>): Promise<TOutput> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await next();
      } catch (error) {
        if (attempt === this.maxRetries) throw error;
      }
    }
    throw new Error('Unreachable');
  }
}
```

Pass an **instance** — used directly, no DI resolution:

```typescript
@UsePipeline(new RetryMiddleware(3)) // instance, used as-is
```

### Mixed

```typescript
@UsePipeline(TransactionMiddleware, new RetryMiddleware(3))
```

## PipelineResolver

The `PipelineResolver` is the key integration point. It collects middleware entries from all applicable scopes, resolves class types from the DI container, and returns a ready-to-execute `Pipeline`.

```typescript
@Injectable()
export class CreateTodoUseCase implements UseCase<CreateTodoCommand, CreateTodoResult> {
  constructor(private readonly pipelineResolver: PipelineResolver) {}

  async execute(command: CreateTodoCommand): Promise<CreateTodoResult> {
    const pipeline = this.pipelineResolver.resolve<CreateTodoCommand, CreateTodoResult>(
      TodoModule,           // module scope
      CreateTodoUseCase,    // class scope
      'execute',            // method scope
    );

    return pipeline.execute(command, async (cmd) => {
      // actual business logic here
      return result;
    });
  }
}
```

## Execution Order

Middlewares execute in onion/wrapper order. First-added is outermost:

```
Global MW → Module MW → Class MW → Method MW → Handler
                                                  ↓
Global MW ← Module MW ← Class MW ← Method MW ← result
```

Each middleware can:
- **Transform input** before calling `next()`
- **Transform output** after `next()` returns
- **Short-circuit** by returning without calling `next()`
- **Handle errors** by wrapping `next()` in try/catch

## Pipeline Class (Standalone Usage)

The `Pipeline` class can be used independently of NestJS for simple cases:

```typescript
import { Pipeline, IMiddleware } from '@common/pipeline/index.js';

interface OrderCommand {
  orderId: string;
  quantity: number;
}

interface OrderResult {
  success: boolean;
  orderId: string;
}

const logging: IMiddleware<OrderCommand, OrderResult> = {
  handle: async (input, next) => {
    console.log('Processing order', input.orderId);
    const result = await next();
    console.log('Order result', result.success);
    return result;
  },
};

const pipeline = new Pipeline<OrderCommand, OrderResult>();
pipeline.use(logging);

const result = await pipeline.execute(
  { orderId: 'ORD-001', quantity: 5 },
  async (input) => ({ success: true, orderId: input.orderId }),
);
// Logs: Processing order ORD-001
// Logs: Order result true
// result = { success: true, orderId: 'ORD-001' }
```

## API Reference

### `IMiddleware<TInput, TOutput>`

| Method | Description |
|--------|-------------|
| `handle(input, next)` | Process the input and optionally call `next()` to continue the chain |

### `Pipeline<TInput, TOutput>`

| Method | Description |
|--------|-------------|
| `use(...middlewares)` | Add middleware instances. Returns `this` for chaining |
| `useAll(pipeline)` | Merge all middlewares from another Pipeline |
| `getMiddlewares()` | Returns a shallow copy of the middleware array |
| `execute(input, handler)` | Build the chain and execute with the given handler |

### `PipelineResolver`

| Method | Description |
|--------|-------------|
| `resolve(moduleClass?, targetClass?, methodName?)` | Collect entries from all scopes, resolve DI, return Pipeline |

### `PipelineModule`

| Method | Description |
|--------|-------------|
| `register(...entries)` | Returns a global DynamicModule with the given middleware entries |

### Decorators

| Decorator | Target | Description |
|-----------|--------|-------------|
| `@UsePipeline(...entries)` | Class or Method | Attach middleware at class or method scope |
| `@UseModulePipeline(...entries)` | Class (Module) | Attach middleware at module scope |
| `@PipelineModuleDecorator(metadata)` | Class (Module) | Combined `@Module()` + pipeline metadata |

### Constants (Symbol Tokens)

| Token | Description |
|-------|-------------|
| `GLOBAL_PIPELINE` | DI token for global middleware entries array |
| `PIPELINE_RESOLVER` | DI token for PipelineResolver |
| `CLASS_PIPELINE_METADATA` | Reflect metadata key for class-level decorators |
| `METHOD_PIPELINE_METADATA` | Reflect metadata key for method-level decorators |
| `MODULE_PIPELINE_METADATA` | Reflect metadata key for module-level decorators |

## Testing

Run the pipeline library tests:

```bash
npx jest --no-coverage common/pipeline
```

### Test Coverage

| Test File | Tests | What's Covered |
|-----------|-------|----------------|
| `pipeline.spec.ts` | 12 | use, useAll, getMiddlewares, execute (ordering, short-circuit, errors, transform) |
| `pipeline.decorator.spec.ts` | 11 | @UsePipeline class/method, @UseModulePipeline, @PipelineModuleDecorator |
| `pipeline.resolver.spec.ts` | 10 | All 4 scopes, partial scopes, DI resolution, mixed entries |
| `pipeline.module.spec.ts` | 11 | register() with class types/instances/mixed, DI integration |
| **Total** | **44** | |

## Design Decisions

1. **Generic, not domain-specific**: Lives in `src/common/`, has no knowledge of domain entities or use cases. Can be extracted to a standalone npm package.

2. **DI-aware but not DI-dependent**: The `Pipeline` class is pure TypeScript — no NestJS imports. Only `PipelineResolver` and `PipelineModule` depend on NestJS for DI integration.

3. **Class types vs instances**: Supporting both allows `@Injectable()` middlewares with full DI (database connections, loggers, config) alongside simple parameterized middlewares (`new RetryMiddleware(3)`) that don't need DI.

4. **Scope merging, not override**: All scopes accumulate. A method-level pipeline doesn't replace the class-level one — it extends it. This follows the principle of least surprise.

5. **`reduceRight` composition**: First-added middleware is outermost, matching the natural reading order of decorator stacking and `use()` calls.
