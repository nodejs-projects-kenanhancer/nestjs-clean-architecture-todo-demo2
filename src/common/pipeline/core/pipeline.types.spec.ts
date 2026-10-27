// Type-level tests. Jest runs ts-jest with diagnostics disabled, so they are enforced by
// `npm run typecheck`: an @ts-expect-error that no longer matches an error fails with TS2578.
import { IMiddleware } from './middleware';
import { Pipeline } from './pipeline';

/** The callback is never run; it only has to compile, or fail to under @ts-expect-error. */
function compileOnly(_check: () => unknown): void {}

function sayHello(firstName: string, lastName: string): string {
  return `Hello ${firstName} ${lastName}`;
}

class CreateTodoCommand {
  constructor(
    public readonly title: string,
    public readonly description?: string,
  ) {}
}

type CreateTodo = (command: CreateTodoCommand) => Promise<string>;

describe('Pipeline types', () => {
  it('should check arguments and the result against the executed function', async () => {
    const pipeline = new Pipeline();

    const greeting: string = await pipeline.execute(sayHello, 'Kenan', 'Hancer');

    expect(greeting).toBe('Hello Kenan Hancer');
    compileOnly(async () => {
      // @ts-expect-error TS2554: lastName is missing
      await pipeline.execute(sayHello, 'Kenan');
      // @ts-expect-error TS2345: a number is not a string
      await pipeline.execute(sayHello, 'Kenan', 42);
      // @ts-expect-error TS2322: sayHello returns a string
      const count: number = await pipeline.execute(sayHello, 'Kenan', 'Hancer');
      return count;
    });
  });

  it('should type ctx.args and next() from the function', () => {
    const trim: IMiddleware<typeof sayHello> = {
      handle: async (ctx, next) => {
        ctx.args = [ctx.args[0].trim(), ctx.args[1].trim()];
        return next();
      },
    };

    expect(trim).toBeDefined();
    compileOnly(() => {
      const invalid: IMiddleware<typeof sayHello> = {
        handle: async (ctx, next) => {
          // @ts-expect-error TS2493: sayHello has two parameters
          void ctx.args[2];
          // @ts-expect-error TS2554: next() takes no arguments
          return next(ctx.args);
        },
      };
      return invalid;
    });
  });

  it('should reject a middleware written for another function in a typed pipeline', () => {
    const log: IMiddleware = { handle: async (_ctx, next) => next() };
    const orderOnly: IMiddleware<(orderId: number) => Promise<boolean>> = {
      handle: async (_ctx, next) => next(),
    };

    const pipeline = new Pipeline<typeof sayHello>().use(log);

    expect(pipeline.getMiddlewares()).toEqual([log]);
    compileOnly(() => {
      // @ts-expect-error orderOnly handles (orderId: number) => Promise<boolean>
      pipeline.use(orderOnly);
    });
  });

  it('should keep readonly command fields readonly inside a middleware', () => {
    const trimTitle: IMiddleware<CreateTodo> = {
      handle: async (ctx, next) => {
        const [command] = ctx.args;
        ctx.args = [new CreateTodoCommand(command.title.trim(), command.description)];
        return next();
      },
    };

    expect(trimTitle).toBeDefined();
    compileOnly(() => {
      const mutating: IMiddleware<CreateTodo> = {
        handle: async (ctx, next) => {
          const [command] = ctx.args;
          // @ts-expect-error TS2540: replace the command instead of mutating it
          command.title = command.title.trim();
          return next();
        },
      };
      return mutating;
    });
  });
});
