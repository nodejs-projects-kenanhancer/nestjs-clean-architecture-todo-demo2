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
  core/                      # Framework-free core: no NestJS, no reflect-metadata, runs in the browser
    context.ts               # Fn, Result, Context (args, target, metadata)
    middleware.ts            # IMiddleware, NextFunction
    pipeline.ts              # Pipeline: use, useAll, getMiddlewares, withTarget, execute(fn, ...args)
    index.ts                 # Core barrel (the only import for front-end code)
  middleware.interface.ts    # MiddlewareEntry (class type or instance), isMiddlewareClass
  pipeline.constants.ts      # Symbol tokens and metadata keys
  pipeline.decorator.ts      # @UsePipeline, @UseModulePipeline, @PipelineModuleDecorator
  pipeline.resolver.ts       # Scope merging + DI resolution via ModuleRef
  pipeline.module.ts         # PipelineModule.register() NestJS DynamicModule
  index.ts                   # Barrel exports (core + NestJS layer)
```

## Core Concepts

### Context

One `Context` per execution, shared by every middleware and the target function:

```typescript
interface Context<F extends Fn = Fn> {
  args: Parameters<F>;                       // the arguments the target will be called with
  readonly target: string;                   // 'sayHello', 'CreateTodoUseCase.execute', ...
  readonly metadata: Map<string | symbol, unknown>;
}
```

A change to `ctx.args` — in place, or by assigning a new tuple — is what the next middleware and the target see. Middlewares share other data through `ctx.metadata`. Every execution gets a fresh context.

### IMiddleware

```typescript
type NextFunction<F extends Fn = Fn> = () => Promise<Result<F>>; // no arguments

interface IMiddleware<F extends Fn = Fn> {
  handle(ctx: Context<F>, next: NextFunction<F>): Promise<Result<F>>;
}
```

`F` is the function the middleware is written for, and `Result<F>` is `Awaited<ReturnType<F>>`. A plain `IMiddleware` (default `Fn`) is generic and fits any target; `IMiddleware<typeof sayHello>` or `IMiddleware<CreateTodoUseCase['execute']>` types `ctx.args` and the result.

### Pipeline

A pure class that composes middlewares using `reduceRight` — first-added middleware is the outermost wrapper. `execute(fn, ...args)` is the single entry point: the target is passed as is, with its own arguments, and is never wrapped or modified.

```typescript
function sayHello(firstName: string, lastName: string): string {
  return `Hello ${firstName} ${lastName}`;
}

const log: IMiddleware = {
  async handle(ctx, next) {
    console.log(`→ ${ctx.target}(${JSON.stringify(ctx.args)})`);
    const result = await next();
    console.log(`← ${ctx.target} = ${JSON.stringify(result)}`);
    return result;
  },
};

const trim: IMiddleware<typeof sayHello> = {
  async handle(ctx, next) {
    ctx.args = [ctx.args[0].trim(), ctx.args[1].trim()];
    return next();
  },
};

await new Pipeline().use(log, trim).execute(sayHello, '  Kenan ', ' Hancer  ');
// → sayHello(["  Kenan "," Hancer  "])
// ← sayHello = "Hello Kenan Hancer"
```

Arguments and the result are checked against the function: `execute(sayHello, 'Kenan')` is TS2554 and `execute(sayHello, 'Kenan', 42)` is TS2345. The result is always a `Promise`, also for synchronous functions. `new Pipeline<typeof sayHello>()` additionally rejects middlewares written for another function.

Commands with `readonly` fields are replaced, not mutated (`command.title = ...` is TS2540):

```typescript
const trimTitle: IMiddleware<CreateTodoUseCase['execute']> = {
  async handle(ctx, next) {
    const [command] = ctx.args;
    ctx.args = [new CreateTodoCommand(command.title.trim(), command.description)];
    return next();
  },
};
```

### Target name: `withTarget`

`ctx.target` is the function name, or `'anonymous'`. When the name is not meaningful — a bound method is called `'bound execute'` — `withTarget(name)` returns a new pipeline with a copy of the middlewares that reports `name`. The original pipeline is not changed, so a shared pipeline stays safe for concurrent executions.

```typescript
const execute = (command: CreateTodoCommand): Promise<CreateTodoResult> =>
  useCase.execute(command);

await pipeline.withTarget('CreateTodoUseCase.execute').execute(execute, command);
```

Prefer a typed arrow function over `useCase.execute.bind(useCase)`: with `strictBindCallApply: false` (this repo) `bind` returns `any`, so the arguments are no longer type-checked.

### MiddlewareEntry

Middlewares can be either:
- **Class types** (`LoggingMiddleware`) — resolved from NestJS DI container at runtime
- **Instances** (`new RetryMiddleware(3)`) — used directly, no DI needed

```typescript
type MiddlewareEntry<F extends Fn = Fn> = Type<IMiddleware<F>> | IMiddleware<F>;
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
export class TransactionMiddleware<F extends Fn = Fn> implements IMiddleware<F> {
  constructor(private readonly dataSource: DataSource) {}

  async handle(_ctx: Context<F>, next: NextFunction<F>): Promise<Result<F>> {
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

In a generic middleware class, declare the return type as `Promise<Result<F>>`: the type TypeScript infers for `async handle` does not match `IMiddleware<F>` (TS2416).

Pass the **class type** — `PipelineResolver` resolves it from the DI container via `ModuleRef`:

```typescript
@UsePipeline(TransactionMiddleware) // class type, resolved by DI
```

### Plain Middleware (no DI dependencies)

```typescript
class RetryMiddleware<F extends Fn = Fn> implements IMiddleware<F> {
  constructor(private readonly maxRetries: number) {}

  async handle(_ctx: Context<F>, next: NextFunction<F>): Promise<Result<F>> {
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

Every attempt sees the same `ctx`, so argument changes made by middlewares inside the retry run again on the already changed arguments and must be idempotent (trimming is, appending is not).

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
    const pipeline = this.pipelineResolver
      .resolve<CreateTodoUseCase['execute']>(
        TodoModule,           // module scope
        CreateTodoUseCase,    // class scope
        'execute',            // method scope
      )
      .withTarget('CreateTodoUseCase.execute');

    return pipeline.execute(async (cmd: CreateTodoCommand) => {
      // actual business logic here
      return result;
    }, command);
  }
}
```

## Execution Order

Middlewares execute in onion/wrapper order. First-added is outermost:

```
Global MW → Module MW → Class MW → Method MW → Target
                                                 ↓
Global MW ← Module MW ← Class MW ← Method MW ← result
```

Each middleware can:
- **Change the arguments** (`ctx.args`) before calling `next()`
- **Transform output** after `next()` returns
- **Short-circuit** by returning without calling `next()`
- **Handle errors** by wrapping `next()` in try/catch
- **Retry** by calling `next()` again
- **Share data** with later middlewares through `ctx.metadata`

## Using the Core Without NestJS (Front-End)

`core/` imports nothing from NestJS or `reflect-metadata` and compiles without Node types, so front-end code (Next.js/React, an API client) can use it directly:

```typescript
import { IMiddleware, Pipeline } from '@common/pipeline/core';
```

Do not import `@common/pipeline` in the browser: that barrel also exports the NestJS layer. `core/api-client.example.spec.ts` shows an API client chain: auth → correlation id → retry → error mapping → log. The isolation is enforced by `core/core-isolation.spec.ts` (imports) and `tsconfig.core.json` (browser-like compile in `npm run typecheck`).

## API Reference

### `Context<F>`

| Property | Description |
|----------|-------------|
| `args` | The target's arguments; middlewares may change them or assign a new tuple |
| `target` | Function name, `'anonymous'`, or the name given by `withTarget` |
| `metadata` | `Map` shared by the middlewares of one execution |

### `IMiddleware<F>`

| Method | Description |
|--------|-------------|
| `handle(ctx, next)` | Inspect or change `ctx`, optionally call `next()` (no arguments) to continue the chain |

### `Pipeline<F>`

| Method | Description |
|--------|-------------|
| `use(...middlewares)` | Add middleware instances. Returns `this` for chaining |
| `useAll(pipeline)` | Merge all middlewares from another Pipeline |
| `getMiddlewares()` | Returns a shallow copy of the middleware array |
| `withTarget(name)` | Returns a new pipeline (copy of the middlewares) whose executions report `name` as `ctx.target` |
| `execute(fn, ...args)` | Run `fn(...args)` through the middlewares; resolves to the awaited result of `fn` |

### `PipelineResolver`

| Method | Description |
|--------|-------------|
| `resolve<F>(moduleClass?, targetClass?, methodName?)` | Collect entries from all scopes, resolve DI, return `Pipeline<F>` |

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
| `PIPELINE_RESOLVER` | Alias token for `PipelineResolver` (same instance) |
| `CLASS_PIPELINE_METADATA` | Reflect metadata key for class-level decorators |
| `METHOD_PIPELINE_METADATA` | Reflect metadata key for method-level decorators |
| `MODULE_PIPELINE_METADATA` | Reflect metadata key for module-level decorators |

## Testing

Run the pipeline library tests:

```bash
npx jest --no-coverage src/common/pipeline
npm run typecheck   # type-level tests (*.types.spec.ts) and the browser-like core compile
```

### Test Coverage

| Test File | Tests | What's Covered |
|-----------|-------|----------------|
| `core/pipeline.spec.ts` | 24 | use, useAll, getMiddlewares, execute (ordering, short-circuit, errors, transform), plain multi-argument functions, shared context, readonly commands, target and `withTarget`, retry |
| `core/pipeline.types.spec.ts` | 4 | Compile-time checks, enforced by `npm run typecheck`: arguments, result, `ctx.args`, `next()`, typed pipelines, readonly fields |
| `core/core-isolation.spec.ts` | 4 | `core/` imports nothing outside `core/` and does not use reflect-metadata |
| `core/api-client.example.spec.ts` | 2 | Front-end API client chain (auth, correlation id, retry, error mapping, log) |
| `pipeline.decorator.spec.ts` | 12 | @UsePipeline class/method, @UseModulePipeline, @PipelineModuleDecorator |
| `pipeline.resolver.spec.ts` | 9 | All 4 scopes, partial scopes, DI resolution, mixed entries |
| `pipeline.module.spec.ts` | 10 | register() with class types/instances/mixed, DI integration, `PIPELINE_RESOLVER` alias, global availability |
| **Total** | **65** | |

## Design Decisions

1. **Generic, not domain-specific**: Lives in `src/common/`, has no knowledge of domain entities or use cases. Can be extracted to a standalone npm package.

2. **Framework-free core**: `core/` (`Pipeline`, `Context`, `IMiddleware`) is pure TypeScript — no NestJS, no reflect-metadata, no Node types — so it also runs in the browser. Only the decorators, `PipelineResolver` and `PipelineModule` depend on NestJS for DI integration.

3. **Class types vs instances**: Supporting both allows `@Injectable()` middlewares with full DI (database connections, loggers, config) alongside simple parameterized middlewares (`new RetryMiddleware(3)`) that don't need DI.

4. **Scope merging, not override**: All scopes accumulate. A method-level pipeline doesn't replace the class-level one — it extends it. This follows the principle of least surprise.

5. **`reduceRight` composition**: First-added middleware is outermost, matching the natural reading order of decorator stacking and `use()` calls.

6. **The target is not wrapped**: `execute(fn, ...args)` runs any function as is — a plain `sayHello(firstName, lastName)` needs no adapter, decorator or single-input object.

7. **One shared context, argumentless `next()`**: Middlewares pass changes to the next middleware and the target through `ctx`, so writing a middleware never means forwarding arguments.
