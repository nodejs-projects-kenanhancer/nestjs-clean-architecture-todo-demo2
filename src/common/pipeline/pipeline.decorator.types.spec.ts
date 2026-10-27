// Type-level tests. Jest runs ts-jest with diagnostics disabled, so they are enforced by
// `npm run typecheck`: an @ts-expect-error that no longer matches an error fails with TS2578.
import 'reflect-metadata';

import { Context, Fn, IMiddleware, NextFunction, Result } from './core';
import {
  CLASS_PIPELINE_METADATA,
  GLOBAL_PIPELINE,
  METHOD_PIPELINE_METADATA,
  MODULE_PIPELINE_METADATA,
} from './pipeline.constants';
import { PipelineModuleDecorator, UseModulePipeline, UsePipeline } from './pipeline.decorator';
import { PipelineModule } from './pipeline.module';

/** The callback is never run; it only has to compile, or fail to under @ts-expect-error. */
function compileOnly(_check: () => unknown): void {}

class CreateTodoCommand {
  constructor(
    public readonly title: string,
    public readonly description?: string,
  ) {}
}

class CreateTodoResult {
  constructor(public readonly id: string) {}
}

type CreateTodo = (command: CreateTodoCommand) => Promise<CreateTodoResult>;
type PlaceOrder = (order: { orderId: string }) => Promise<unknown>;

class LogMiddleware implements IMiddleware {
  handle(_ctx: Context, next: NextFunction): Promise<unknown> {
    return next();
  }
}

class RetryMiddleware<F extends Fn = Fn> implements IMiddleware<F> {
  constructor(private readonly attempts = 2) {}

  async handle(_ctx: Context<F>, next: NextFunction<F>): Promise<Result<F>> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await next();
      } catch (error) {
        if (attempt >= this.attempts) {
          throw error;
        }
      }
    }
  }
}

class TrimTitleMiddleware implements IMiddleware<CreateTodo> {
  handle(ctx: Context<CreateTodo>, next: NextFunction<CreateTodo>): Promise<CreateTodoResult> {
    const [command] = ctx.args;
    ctx.args = [new CreateTodoCommand(command.title.trim(), command.description)];
    return next();
  }
}

class OrderOnlyMiddleware implements IMiddleware<PlaceOrder> {
  handle(ctx: Context<PlaceOrder>, next: NextFunction<PlaceOrder>): Promise<unknown> {
    void ctx.args[0].orderId;
    return next();
  }
}

const orderOnly: IMiddleware<PlaceOrder> = { handle: async (_ctx, next) => next() };

describe('Pipeline decorator types', () => {
  it('should accept generic middlewares and typed ones written for the method', () => {
    const retry = new RetryMiddleware(3);

    class CreateTodoUseCase {
      @UsePipeline(LogMiddleware, TrimTitleMiddleware, RetryMiddleware, retry)
      async execute(_command: CreateTodoCommand): Promise<CreateTodoResult> {
        return new CreateTodoResult('1');
      }
    }

    expect(
      Reflect.getMetadata(METHOD_PIPELINE_METADATA, CreateTodoUseCase.prototype, 'execute'),
    ).toEqual([LogMiddleware, TrimTitleMiddleware, RetryMiddleware, retry]);
    compileOnly(() => {
      class Mismatch {
        // @ts-expect-error orderOnly is written for PlaceOrder
        @UsePipeline(orderOnly)
        async a(_command: CreateTodoCommand): Promise<CreateTodoResult> {
          return new CreateTodoResult('1');
        }

        // @ts-expect-error a generic middleware does not make an incompatible one acceptable
        @UsePipeline(LogMiddleware, orderOnly)
        async b(_command: CreateTodoCommand): Promise<CreateTodoResult> {
          return new CreateTodoResult('1');
        }

        // @ts-expect-error OrderOnlyMiddleware (DI class) is written for PlaceOrder
        @UsePipeline(OrderOnlyMiddleware)
        async c(_command: CreateTodoCommand): Promise<CreateTodoResult> {
          return new CreateTodoResult('1');
        }
      }
      return Mismatch;
    });
  });

  it('should only mark async methods, with or without middlewares', () => {
    class CreateTodoUseCase {
      @UsePipeline()
      async execute(_command: CreateTodoCommand): Promise<CreateTodoResult> {
        return new CreateTodoResult('1');
      }
    }

    expect(
      Reflect.getMetadata(METHOD_PIPELINE_METADATA, CreateTodoUseCase.prototype, 'execute'),
    ).toEqual([]);
    compileOnly(() => {
      class SyncMethod {
        // @ts-expect-error a wrapped method returns a Promise, so a sync method cannot be marked
        @UsePipeline(LogMiddleware)
        execute(_command: CreateTodoCommand): string {
          return '';
        }
      }
      return SyncMethod;
    });
  });

  it('should check class-level middlewares against the async methods of the class', () => {
    @UsePipeline(LogMiddleware, TrimTitleMiddleware)
    class CreateTodoUseCase {
      async execute(_command: CreateTodoCommand): Promise<CreateTodoResult> {
        return new CreateTodoResult('1');
      }

      label(): string {
        return 'sync methods are not checked';
      }
    }

    expect(Reflect.getMetadata(CLASS_PIPELINE_METADATA, CreateTodoUseCase)).toEqual([
      LogMiddleware,
      TrimTitleMiddleware,
    ]);
    compileOnly(() => {
      // @ts-expect-error orderOnly does not fit CreateTodoUseCase.execute (probe #6)
      @UsePipeline(orderOnly)
      class Mismatch {
        async execute(_command: CreateTodoCommand): Promise<CreateTodoResult> {
          return new CreateTodoResult('1');
        }
      }
      return Mismatch;
    });
  });

  it('should only accept generic middlewares at global and module scope', () => {
    const retry = new RetryMiddleware();
    const dynamicModule = PipelineModule.register(LogMiddleware, RetryMiddleware, retry);

    @UseModulePipeline(LogMiddleware)
    @PipelineModuleDecorator({ pipeline: [retry] })
    class TodoModule {}

    expect(dynamicModule.providers).toContainEqual({
      provide: GLOBAL_PIPELINE,
      useValue: [LogMiddleware, RetryMiddleware, retry],
    });
    expect(Reflect.getMetadata(MODULE_PIPELINE_METADATA, TodoModule)).toEqual([
      LogMiddleware,
      retry,
    ]);
    compileOnly(() => {
      // @ts-expect-error a global middleware runs for every method, so it must be generic
      PipelineModule.register(LogMiddleware, orderOnly);
      // @ts-expect-error the same for a DI class
      PipelineModule.register(OrderOnlyMiddleware);

      // @ts-expect-error a module middleware runs for every method of the module
      @UseModulePipeline(orderOnly)
      class OrderModule {}

      @PipelineModuleDecorator({
        // @ts-expect-error the same through @PipelineModuleDecorator
        pipeline: [orderOnly],
      })
      class OtherOrderModule {}

      return [OrderModule, OtherOrderModule];
    });
  });
});
