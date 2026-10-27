import { Controller, Get, Injectable, Module, ModuleMetadata, Scope } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { Test, TestingModule } from '@nestjs/testing';

import { Context, IMiddleware, NextFunction } from './core';
import { MiddlewareEntry } from './middleware.interface';
import { UseModulePipeline, UsePipeline } from './pipeline.decorator';
import { PipelineConfigurationError } from './pipeline.errors';
import { PipelineModule } from './pipeline.module';

const calls: string[] = [];

const record = (label: string): IMiddleware => ({
  handle: async (ctx, next): Promise<unknown> => {
    calls.push(`${label}:${ctx.target}`);
    return next();
  },
});

function testingModule(
  metadata: ModuleMetadata,
  globals: MiddlewareEntry[] = [],
): Promise<TestingModule> {
  return Test.createTestingModule({
    ...metadata,
    imports: [PipelineModule.register(...globals), ...(metadata.imports ?? [])],
  }).compile();
}

/** Wrapping happens in onModuleInit, which compile() does not run. */
async function initialized(
  metadata: ModuleMetadata,
  globals?: MiddlewareEntry[],
): Promise<TestingModule> {
  return (await testingModule(metadata, globals)).init();
}

async function initError(metadata: ModuleMetadata): Promise<Error> {
  const moduleRef = await testingModule(metadata);
  return moduleRef.init().then(
    () => {
      throw new Error('init() was expected to fail');
    },
    (error: Error) => error,
  );
}

describe('PipelineExplorer', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  describe('automatic wrapping', () => {
    it('should run global, module, class and method middlewares without a manual resolve', async () => {
      @UsePipeline(record('class'))
      @Injectable()
      class CreateTodoUseCase {
        @UsePipeline(record('method'))
        async execute(title: string): Promise<string> {
          return `created:${title}`;
        }
      }

      @UseModulePipeline(record('module'))
      @Module({ providers: [CreateTodoUseCase] })
      class TodoModule {}

      const moduleRef = await initialized({ imports: [TodoModule] }, [record('global')]);
      const result = await moduleRef.get(CreateTodoUseCase).execute('milk');

      expect(result).toBe('created:milk');
      expect(calls).toEqual([
        'global:CreateTodoUseCase.execute',
        'module:CreateTodoUseCase.execute',
        'class:CreateTodoUseCase.execute',
        'method:CreateTodoUseCase.execute',
      ]);
    });

    it('should keep `this` and call the method with the arguments changed by middlewares', async () => {
      const trim: IMiddleware<(title: string) => Promise<string>> = {
        handle: async (ctx, next) => {
          const [title] = ctx.args;
          ctx.args = [title.trim()];
          return next();
        },
      };

      @Injectable()
      class Prefix {
        readonly value = 'created';
      }

      @Injectable()
      class CreateTodoUseCase {
        constructor(private readonly prefix: Prefix) {}

        @UsePipeline(trim)
        async execute(title: string): Promise<string> {
          return `${this.prefix.value}:${title}`;
        }
      }

      const moduleRef = await initialized({ providers: [Prefix, CreateTodoUseCase] });

      expect(await moduleRef.get(CreateTodoUseCase).execute('  milk ')).toBe('created:milk');
    });

    it('should rethrow the error of the method unchanged', async () => {
      const error = new Error('boom');

      @Injectable()
      class CreateTodoUseCase {
        @UsePipeline(record('method'))
        async execute(): Promise<void> {
          throw error;
        }
      }

      const moduleRef = await initialized({ providers: [CreateTodoUseCase] });

      await expect(moduleRef.get(CreateTodoUseCase).execute()).rejects.toBe(error);
      expect(calls).toEqual(['method:CreateTodoUseCase.execute']);
    });

    it('should leave unmarked methods and instances created with new unwrapped', async () => {
      @Injectable()
      class CreateTodoUseCase {
        @UsePipeline(record('method'))
        async execute(): Promise<string> {
          return 'ok';
        }

        async other(): Promise<string> {
          return 'ok';
        }
      }

      const moduleRef = await initialized({ providers: [CreateTodoUseCase] });
      await moduleRef.get(CreateTodoUseCase).other();
      await new CreateTodoUseCase().execute();

      expect(calls).toEqual([]);
    });

    it('should not wrap before init()', async () => {
      @Injectable()
      class CreateTodoUseCase {
        @UsePipeline(record('method'))
        async execute(): Promise<string> {
          return 'ok';
        }
      }

      const moduleRef = await testingModule({ providers: [CreateTodoUseCase] });
      await moduleRef.get(CreateTodoUseCase).execute();

      expect(calls).toEqual([]);
    });

    it('should build each pipeline once: one transient middleware instance per method', async () => {
      let created = 0;

      @Injectable({ scope: Scope.TRANSIENT })
      class CountingMiddleware implements IMiddleware {
        private readonly id = ++created;

        handle(ctx: Context, next: NextFunction): Promise<unknown> {
          calls.push(`${this.id}:${ctx.target}`);
          return next();
        }
      }

      @Injectable()
      class TodoUseCases {
        @UsePipeline(CountingMiddleware)
        async create(): Promise<void> {}

        @UsePipeline(CountingMiddleware)
        async remove(): Promise<void> {}
      }

      const moduleRef = await initialized({ providers: [CountingMiddleware, TodoUseCases] });
      const useCases = moduleRef.get(TodoUseCases);
      await useCases.create();
      await useCases.create();
      await useCases.remove();

      const [first, second, third] = calls.map(call => call.split(':')[0]);
      expect(calls.map(call => call.split(':')[1])).toEqual([
        'TodoUseCases.create',
        'TodoUseCases.create',
        'TodoUseCases.remove',
      ]);
      expect(second).toBe(first);
      expect(third).not.toBe(first);
    });

    it('should wrap a provider once when it is also registered under an alias', async () => {
      @Injectable()
      class CreateTodoUseCase {
        @UsePipeline(record('method'))
        async execute(): Promise<string> {
          return 'ok';
        }
      }

      const moduleRef = await initialized({
        providers: [CreateTodoUseCase, { provide: 'CREATE_TODO', useExisting: CreateTodoUseCase }],
      });
      await moduleRef.get(CreateTodoUseCase).execute();

      expect(calls).toEqual(['method:CreateTodoUseCase.execute']);
    });
  });

  describe('startup errors', () => {
    it('should name a class middleware that is not registered as a provider', async () => {
      @Injectable()
      class NotRegistered implements IMiddleware {
        handle(_ctx: Context, next: NextFunction): Promise<unknown> {
          return next();
        }
      }

      @Injectable()
      class CreateTodoUseCase {
        @UsePipeline(NotRegistered)
        async execute(): Promise<void> {}
      }

      const error = await initError({ providers: [CreateTodoUseCase] });

      expect(error).toBeInstanceOf(PipelineConfigurationError);
      expect(error.message).toContain(
        'NotRegistered is used by CreateTodoUseCase.execute but is not registered as a provider',
      );
    });

    it('should reject a request-scoped middleware', async () => {
      @Injectable({ scope: Scope.REQUEST })
      class PerRequest implements IMiddleware {
        handle(_ctx: Context, next: NextFunction): Promise<unknown> {
          return next();
        }
      }

      @Injectable()
      class CreateTodoUseCase {
        @UsePipeline(PerRequest)
        async execute(): Promise<void> {}
      }

      const error = await initError({ providers: [PerRequest, CreateTodoUseCase] });

      expect(error).toBeInstanceOf(PipelineConfigurationError);
      expect(error.message).toContain(
        'PerRequest (used by CreateTodoUseCase.execute) is request-scoped',
      );
    });

    it.each([
      ['request', Scope.REQUEST],
      ['transient', Scope.TRANSIENT],
    ])(
      'should reject a marked provider that is not a singleton (%s scope)',
      async (_name, scope) => {
        @Injectable({ scope })
        class CreateTodoUseCase {
          @UsePipeline()
          async execute(): Promise<void> {}
        }

        const error = await initError({ providers: [CreateTodoUseCase] });

        expect(error).toBeInstanceOf(PipelineConfigurationError);
        expect(error.message).toContain(
          'CreateTodoUseCase uses @UsePipeline but is not a singleton provider',
        );
      },
    );

    it('should reject @UsePipeline on a controller', async () => {
      @Controller('todos')
      class TodoController {
        @Get()
        @UsePipeline()
        async list(): Promise<string[]> {
          return [];
        }
      }

      const error = await initError({ controllers: [TodoController] });

      expect(error).toBeInstanceOf(PipelineConfigurationError);
      expect(error.message).toContain(
        '@UsePipeline is not supported on controllers (TodoController)',
      );
    });

    it('should reject @UsePipeline on a transport handler method of a provider', async () => {
      @Resolver()
      class TodoResolver {
        @Query(() => [String])
        @UsePipeline()
        async todos(): Promise<string[]> {
          return [];
        }
      }

      const error = await initError({ providers: [TodoResolver] });

      expect(error).toBeInstanceOf(PipelineConfigurationError);
      expect(error.message).toContain('TodoResolver.todos is a transport handler');
    });

    it('should reject a class-level @UsePipeline when none of its methods is marked', async () => {
      @UsePipeline(record('class'))
      @Injectable()
      class CreateTodoUseCase {
        async execute(): Promise<void> {}
      }

      const error = await initError({ providers: [CreateTodoUseCase] });

      expect(error).toBeInstanceOf(PipelineConfigurationError);
      expect(error.message).toContain(
        'CreateTodoUseCase has a class-level @UsePipeline but none of its methods is marked',
      );
    });
  });
});
