import { Context, Fn, Result } from './context';
import { IMiddleware, NextFunction } from './middleware';
import { Pipeline } from './pipeline';

interface OrderCommand {
  orderId: string;
  quantity: number;
}

interface OrderResult {
  success: boolean;
  orderId: string;
}

type PlaceOrder = (command: OrderCommand) => Promise<OrderResult>;

function sayHello(firstName: string, lastName: string): string {
  return `Hello ${firstName} ${lastName}`;
}

describe('Pipeline', () => {
  const createMiddleware = <F extends Fn>(
    fn: (ctx: Context<F>, next: NextFunction<F>) => Promise<Result<F>>,
  ): IMiddleware<F> => ({ handle: fn });

  describe('use', () => {
    it('should add a single middleware', () => {
      const pipeline = new Pipeline<PlaceOrder>();
      const mw = createMiddleware<PlaceOrder>((_ctx, next) => next());

      pipeline.use(mw);

      expect(pipeline.getMiddlewares()).toEqual([mw]);
    });

    it('should add multiple middlewares at once', () => {
      const pipeline = new Pipeline<PlaceOrder>();
      const mw1 = createMiddleware<PlaceOrder>((_ctx, next) => next());
      const mw2 = createMiddleware<PlaceOrder>((_ctx, next) => next());

      pipeline.use(mw1, mw2);

      expect(pipeline.getMiddlewares()).toEqual([mw1, mw2]);
    });

    it('should support fluent chaining', () => {
      const pipeline = new Pipeline<PlaceOrder>();
      const mw1 = createMiddleware<PlaceOrder>((_ctx, next) => next());
      const mw2 = createMiddleware<PlaceOrder>((_ctx, next) => next());

      const result = pipeline.use(mw1).use(mw2);

      expect(result).toBe(pipeline);
      expect(pipeline.getMiddlewares()).toEqual([mw1, mw2]);
    });
  });

  describe('useAll', () => {
    it('should merge middlewares from another pipeline', () => {
      const pipeline1 = new Pipeline<PlaceOrder>();
      const pipeline2 = new Pipeline<PlaceOrder>();
      const mw1 = createMiddleware<PlaceOrder>((_ctx, next) => next());
      const mw2 = createMiddleware<PlaceOrder>((_ctx, next) => next());

      pipeline2.use(mw1, mw2);
      pipeline1.useAll(pipeline2);

      expect(pipeline1.getMiddlewares()).toEqual([mw1, mw2]);
    });

    it('should append after existing middlewares', () => {
      const pipeline1 = new Pipeline<PlaceOrder>();
      const pipeline2 = new Pipeline<PlaceOrder>();
      const mw1 = createMiddleware<PlaceOrder>((_ctx, next) => next());
      const mw2 = createMiddleware<PlaceOrder>((_ctx, next) => next());

      pipeline1.use(mw1);
      pipeline2.use(mw2);
      pipeline1.useAll(pipeline2);

      expect(pipeline1.getMiddlewares()).toEqual([mw1, mw2]);
    });
  });

  describe('getMiddlewares', () => {
    it('should return a shallow copy', () => {
      const pipeline = new Pipeline<PlaceOrder>();
      const mw = createMiddleware<PlaceOrder>((_ctx, next) => next());

      pipeline.use(mw);
      const copy = pipeline.getMiddlewares();
      copy.push(createMiddleware<PlaceOrder>((_ctx, next) => next()));

      expect(pipeline.getMiddlewares()).toHaveLength(1);
    });

    it('should return empty array for new pipeline', () => {
      const pipeline = new Pipeline<PlaceOrder>();

      expect(pipeline.getMiddlewares()).toEqual([]);
    });
  });

  describe('execute', () => {
    const sampleInput: OrderCommand = { orderId: 'ORD-001', quantity: 5 };
    const sampleOutput: OrderResult = { success: true, orderId: 'ORD-001' };

    it('should call handler when no middlewares', async () => {
      const pipeline = new Pipeline<PlaceOrder>();
      const handler = jest.fn().mockResolvedValue(sampleOutput);

      const result = await pipeline.execute(handler, sampleInput);

      expect(result).toEqual(sampleOutput);
      expect(handler).toHaveBeenCalledWith(sampleInput);
    });

    it('should execute middlewares in order (first-added = outermost)', async () => {
      const pipeline = new Pipeline<PlaceOrder>();
      const order: string[] = [];

      const mw1 = createMiddleware<PlaceOrder>(async (_ctx, next) => {
        order.push('mw1-before');
        const result = await next();
        order.push('mw1-after');
        return result;
      });
      const mw2 = createMiddleware<PlaceOrder>(async (_ctx, next) => {
        order.push('mw2-before');
        const result = await next();
        order.push('mw2-after');
        return result;
      });

      pipeline.use(mw1, mw2);
      await pipeline.execute(async (_command: OrderCommand) => {
        order.push('handler');
        return sampleOutput;
      }, sampleInput);

      expect(order).toEqual(['mw1-before', 'mw2-before', 'handler', 'mw2-after', 'mw1-after']);
    });

    it('should pass input to each middleware', async () => {
      const pipeline = new Pipeline<PlaceOrder>();
      const receivedInputs: OrderCommand[] = [];

      const mw = createMiddleware<PlaceOrder>(async (ctx, next) => {
        receivedInputs.push(ctx.args[0]);
        return next();
      });

      pipeline.use(mw);
      await pipeline.execute(
        async (input: OrderCommand) => ({
          success: true,
          orderId: input.orderId,
        }),
        sampleInput,
      );

      expect(receivedInputs[0]).toBe(sampleInput);
    });

    it('should allow short-circuiting without calling next', async () => {
      const pipeline = new Pipeline<PlaceOrder>();
      const handler = jest.fn().mockResolvedValue(sampleOutput);

      const mw = createMiddleware<PlaceOrder>(async () => {
        return { success: false, orderId: 'CANCELLED' };
      });

      pipeline.use(mw);
      const result = await pipeline.execute(handler, sampleInput);

      expect(result).toEqual({ success: false, orderId: 'CANCELLED' });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should propagate errors from handler', async () => {
      const pipeline = new Pipeline<PlaceOrder>();
      const error = new Error('handler error');

      const mw = createMiddleware<PlaceOrder>(async (_ctx, next) => next());
      pipeline.use(mw);

      await expect(
        pipeline.execute(async (_command: OrderCommand) => {
          throw error;
        }, sampleInput),
      ).rejects.toThrow('handler error');
    });

    it('should propagate errors from middleware', async () => {
      const pipeline = new Pipeline<PlaceOrder>();

      const mw = createMiddleware<PlaceOrder>(async () => {
        throw new Error('middleware error');
      });
      pipeline.use(mw);

      await expect(
        pipeline.execute(async (_command: OrderCommand) => sampleOutput, sampleInput),
      ).rejects.toThrow('middleware error');
    });

    it('should allow middleware to catch and handle errors', async () => {
      const pipeline = new Pipeline<PlaceOrder>();

      const errorHandler = createMiddleware<PlaceOrder>(async (_ctx, next) => {
        try {
          return await next();
        } catch {
          return { success: false, orderId: 'ERROR' };
        }
      });
      const failing = createMiddleware<PlaceOrder>(async () => {
        throw new Error('fail');
      });

      pipeline.use(errorHandler, failing);
      const result = await pipeline.execute(
        async (_command: OrderCommand) => sampleOutput,
        sampleInput,
      );

      expect(result).toEqual({ success: false, orderId: 'ERROR' });
    });

    it('should allow middleware to transform the result', async () => {
      const pipeline = new Pipeline<PlaceOrder>();

      const mw = createMiddleware<PlaceOrder>(async (_ctx, next) => {
        const result = await next();
        return { ...result, orderId: result.orderId.toUpperCase() };
      });

      pipeline.use(mw);
      const result = await pipeline.execute(
        async (_command: OrderCommand) => ({
          success: true,
          orderId: 'ord-lowercase',
        }),
        sampleInput,
      );

      expect(result).toEqual({ success: true, orderId: 'ORD-LOWERCASE' });
    });
  });

  describe('pure functions', () => {
    it('should execute a plain multi-argument function without wrapping it', async () => {
      const seen: unknown[] = [];
      const log: IMiddleware = {
        handle: async (ctx, next) => {
          seen.push([ctx.target, ...ctx.args]);
          const result = await next();
          seen.push(result);
          return result;
        },
      };
      const trim: IMiddleware<typeof sayHello> = {
        handle: async (ctx, next) => {
          ctx.args = [ctx.args[0].trim(), ctx.args[1].trim()];
          return next();
        },
      };

      const result = await new Pipeline().use(log, trim).execute(sayHello, ' Kenan ', ' Hancer ');

      expect(result).toBe('Hello Kenan Hancer');
      expect(seen).toEqual([['sayHello', ' Kenan ', ' Hancer '], 'Hello Kenan Hancer']);
    });
  });

  describe('context', () => {
    it('should share one context: changes reach the next middleware and the target', async () => {
      const first: IMiddleware<typeof sayHello> = {
        handle: async (ctx, next) => {
          ctx.args[0] = 'Ada';
          ctx.metadata.set('requestId', 'r-1');
          return next();
        },
      };
      let seenBySecond: unknown[] = [];
      const second: IMiddleware<typeof sayHello> = {
        handle: async (ctx, next) => {
          seenBySecond = [ctx.args[0], ctx.metadata.get('requestId')];
          return next();
        },
      };

      const result = await new Pipeline<typeof sayHello>()
        .use(first, second)
        .execute(sayHello, 'Kenan', 'Hancer');

      expect(seenBySecond).toEqual(['Ada', 'r-1']);
      expect(result).toBe('Hello Ada Hancer');
    });

    it('should create a fresh context for every execution', async () => {
      const seen: unknown[] = [];
      const mw: IMiddleware = {
        handle: async (ctx, next) => {
          seen.push(ctx.metadata.get('visited'));
          ctx.metadata.set('visited', true);
          return next();
        },
      };
      const pipeline = new Pipeline().use(mw);

      await pipeline.execute(sayHello, 'Kenan', 'Hancer');
      await pipeline.execute(sayHello, 'Ada', 'Lovelace');

      expect(seen).toEqual([undefined, undefined]);
    });

    it('should let a middleware replace a readonly command instead of mutating it', async () => {
      class CreateTodoCommand {
        constructor(
          public readonly title: string,
          public readonly description?: string,
        ) {}
      }
      const createTodo = async (command: CreateTodoCommand): Promise<string> => command.title;
      const trimTitle: IMiddleware<typeof createTodo> = {
        handle: async (ctx, next) => {
          const [command] = ctx.args;
          ctx.args = [new CreateTodoCommand(command.title.trim(), command.description)];
          return next();
        },
      };
      const original = new CreateTodoCommand('  Buy milk  ', 'desc');

      const result = await new Pipeline<typeof createTodo>()
        .use(trimTitle)
        .execute(createTodo, original);

      expect(result).toBe('Buy milk');
      expect(original.title).toBe('  Buy milk  ');
    });
  });

  describe('target', () => {
    const recordTargets = (targets: string[]): IMiddleware => ({
      handle: async (ctx, next): Promise<unknown> => {
        targets.push(ctx.target);
        return next();
      },
    });

    it('should use the function name as ctx.target', async () => {
      const targets: string[] = [];

      await new Pipeline().use(recordTargets(targets)).execute(sayHello, 'Kenan', 'Hancer');

      expect(targets).toEqual(['sayHello']);
    });

    it("should fall back to 'anonymous' for anonymous functions", async () => {
      const targets: string[] = [];
      const anonymous = [(): string => 'x'][0];

      await new Pipeline().use(recordTargets(targets)).execute(anonymous);

      expect(targets).toEqual(['anonymous']);
    });

    it('should use the name given by withTarget, e.g. for bound methods', async () => {
      class CreateTodoUseCase {
        private readonly prefix = 'created';

        async execute(title: string): Promise<string> {
          return `${this.prefix}:${title}`;
        }
      }
      const useCase = new CreateTodoUseCase();
      const bound = useCase.execute.bind(useCase);
      const targets: string[] = [];
      const pipeline = new Pipeline().use(recordTargets(targets));

      await pipeline.execute(bound, 'a');
      const result = await pipeline.withTarget('CreateTodoUseCase.execute').execute(bound, 'b');

      expect(targets).toEqual(['bound execute', 'CreateTodoUseCase.execute']);
      expect(result).toBe('created:b');
    });

    it('should return a new pipeline from withTarget and leave the original unchanged', async () => {
      const calls: string[] = [];
      const a: IMiddleware = {
        handle: async (ctx, next) => {
          calls.push(`a:${ctx.target}`);
          return next();
        },
      };
      const b: IMiddleware = {
        handle: async (ctx, next) => {
          calls.push(`b:${ctx.target}`);
          return next();
        },
      };
      const original = new Pipeline().use(a);

      const named = original.withTarget('Greeter.greet');
      original.use(b);
      await named.execute(sayHello, 'Kenan', 'Hancer');
      await original.execute(sayHello, 'Kenan', 'Hancer');

      expect(named).not.toBe(original);
      expect(named.getMiddlewares()).toEqual([a]);
      expect(calls).toEqual(['a:Greeter.greet', 'a:sayHello', 'b:sayHello']);
    });
  });

  describe('retry', () => {
    it('should run the target again when a middleware calls next() twice', async () => {
      let calls = 0;
      const retry: IMiddleware = {
        handle: async (_ctx, next) => {
          try {
            return await next();
          } catch {
            return next();
          }
        },
      };
      const flaky = async (): Promise<string> => {
        calls++;
        if (calls === 1) {
          throw new Error('transient');
        }
        return 'ok';
      };

      const result = await new Pipeline().use(retry).execute(flaky);

      expect(result).toBe('ok');
      expect(calls).toBe(2);
    });
  });
});
