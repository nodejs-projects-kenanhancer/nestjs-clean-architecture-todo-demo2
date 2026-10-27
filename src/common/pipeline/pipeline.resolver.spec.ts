import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import 'reflect-metadata';

import { Context, IMiddleware, NextFunction } from './core';
import { GLOBAL_PIPELINE } from './pipeline.constants';
import { UseModulePipeline, UsePipeline } from './pipeline.decorator';
import { PipelineResolver } from './pipeline.resolver';

interface OrderCommand {
  orderId: string;
  quantity: number;
}

interface OrderResult {
  success: boolean;
  orderId: string;
}

type PlaceOrder = (command: OrderCommand) => Promise<OrderResult>;

@Injectable()
class LoggingMiddleware implements IMiddleware<PlaceOrder> {
  handle(_ctx: Context<PlaceOrder>, next: NextFunction<PlaceOrder>): Promise<OrderResult> {
    return next();
  }
}

@Injectable()
class ValidationMiddleware implements IMiddleware<PlaceOrder> {
  handle(_ctx: Context<PlaceOrder>, next: NextFunction<PlaceOrder>): Promise<OrderResult> {
    return next();
  }
}

class SimpleMiddleware implements IMiddleware<PlaceOrder> {
  constructor(readonly label: string) {}
  handle(_ctx: Context<PlaceOrder>, next: NextFunction<PlaceOrder>): Promise<OrderResult> {
    return next();
  }
}

describe('PipelineResolver', () => {
  describe('resolve with all scopes', () => {
    it('should merge global, module, class, and method scopes in order', async () => {
      const globalInstance = new SimpleMiddleware('global');
      const moduleInstance = new SimpleMiddleware('module');
      const classInstance = new SimpleMiddleware('class');
      const methodInstance = new SimpleMiddleware('method');

      @UseModulePipeline(moduleInstance)
      class TestModule {}

      @UsePipeline(classInstance)
      class TestClass {
        @UsePipeline(methodInstance)
        execute(): void {}
      }

      const module = await Test.createTestingModule({
        providers: [PipelineResolver, { provide: GLOBAL_PIPELINE, useValue: [globalInstance] }],
      }).compile();

      const resolver = module.get(PipelineResolver);
      const pipeline = resolver.resolve<PlaceOrder>(TestModule, TestClass, 'execute');
      const middlewares = pipeline.getMiddlewares();

      expect(middlewares).toHaveLength(4);
      expect((middlewares[0] as SimpleMiddleware).label).toBe('global');
      expect((middlewares[1] as SimpleMiddleware).label).toBe('module');
      expect((middlewares[2] as SimpleMiddleware).label).toBe('class');
      expect((middlewares[3] as SimpleMiddleware).label).toBe('method');
    });
  });

  describe('resolve with partial scopes', () => {
    it('should resolve with only global scope', async () => {
      const globalInstance = new SimpleMiddleware('global');

      const module = await Test.createTestingModule({
        providers: [PipelineResolver, { provide: GLOBAL_PIPELINE, useValue: [globalInstance] }],
      }).compile();

      const resolver = module.get(PipelineResolver);
      const pipeline = resolver.resolve<PlaceOrder>();
      const middlewares = pipeline.getMiddlewares();

      expect(middlewares).toHaveLength(1);
      expect((middlewares[0] as SimpleMiddleware).label).toBe('global');
    });

    it('should resolve with only class and method scopes', async () => {
      const classInstance = new SimpleMiddleware('class');
      const methodInstance = new SimpleMiddleware('method');

      @UsePipeline(classInstance)
      class TestClass {
        @UsePipeline(methodInstance)
        execute(): void {}
      }

      const module = await Test.createTestingModule({
        providers: [PipelineResolver],
      }).compile();

      const resolver = module.get(PipelineResolver);
      const pipeline = resolver.resolve<PlaceOrder>(null, TestClass, 'execute');
      const middlewares = pipeline.getMiddlewares();

      expect(middlewares).toHaveLength(2);
      expect((middlewares[0] as SimpleMiddleware).label).toBe('class');
      expect((middlewares[1] as SimpleMiddleware).label).toBe('method');
    });

    it('should resolve empty pipeline when no scopes provide entries', async () => {
      const module = await Test.createTestingModule({
        providers: [PipelineResolver],
      }).compile();

      const resolver = module.get(PipelineResolver);
      const pipeline = resolver.resolve<PlaceOrder>();
      const middlewares = pipeline.getMiddlewares();

      expect(middlewares).toHaveLength(0);
    });
  });

  describe('DI resolution of class types', () => {
    it('should resolve @Injectable() class types via ModuleRef', async () => {
      const module = await Test.createTestingModule({
        providers: [
          PipelineResolver,
          LoggingMiddleware,
          { provide: GLOBAL_PIPELINE, useValue: [LoggingMiddleware] },
        ],
      }).compile();

      const resolver = module.get(PipelineResolver);
      const pipeline = resolver.resolve<PlaceOrder>();
      const middlewares = pipeline.getMiddlewares();

      expect(middlewares).toHaveLength(1);
      expect(middlewares[0]).toBeInstanceOf(LoggingMiddleware);
    });

    it('should pass through instance entries without DI resolution', async () => {
      const instance = new SimpleMiddleware('direct');

      const module = await Test.createTestingModule({
        providers: [PipelineResolver, { provide: GLOBAL_PIPELINE, useValue: [instance] }],
      }).compile();

      const resolver = module.get(PipelineResolver);
      const pipeline = resolver.resolve<PlaceOrder>();
      const middlewares = pipeline.getMiddlewares();

      expect(middlewares).toHaveLength(1);
      expect(middlewares[0]).toBe(instance);
    });

    it('should handle mixed class types and instances', async () => {
      const instance = new SimpleMiddleware('direct');

      @UsePipeline(LoggingMiddleware, instance)
      class TestClass {}

      const module = await Test.createTestingModule({
        providers: [PipelineResolver, LoggingMiddleware],
      }).compile();

      const resolver = module.get(PipelineResolver);
      const pipeline = resolver.resolve<PlaceOrder>(null, TestClass);
      const middlewares = pipeline.getMiddlewares();

      expect(middlewares).toHaveLength(2);
      expect(middlewares[0]).toBeInstanceOf(LoggingMiddleware);
      expect(middlewares[1]).toBe(instance);
    });

    it('should resolve class types from different scopes', async () => {
      @UseModulePipeline(LoggingMiddleware)
      class TestModule {}

      @UsePipeline(ValidationMiddleware)
      class TestClass {}

      const module = await Test.createTestingModule({
        providers: [PipelineResolver, LoggingMiddleware, ValidationMiddleware],
      }).compile();

      const resolver = module.get(PipelineResolver);
      const pipeline = resolver.resolve<PlaceOrder>(TestModule, TestClass);
      const middlewares = pipeline.getMiddlewares();

      expect(middlewares).toHaveLength(2);
      expect(middlewares[0]).toBeInstanceOf(LoggingMiddleware);
      expect(middlewares[1]).toBeInstanceOf(ValidationMiddleware);
    });
  });

  describe('execute resolved pipeline', () => {
    it('should produce a working pipeline that executes in scope order', async () => {
      const order: string[] = [];

      const globalMw: IMiddleware<PlaceOrder> = {
        handle: async (_ctx, next) => {
          order.push('global');
          return next();
        },
      };

      @Injectable()
      class TrackedMiddleware implements IMiddleware<PlaceOrder> {
        async handle(
          _ctx: Context<PlaceOrder>,
          next: NextFunction<PlaceOrder>,
        ): Promise<OrderResult> {
          order.push('class-di');
          return next();
        }
      }

      @UsePipeline(TrackedMiddleware)
      class TestClass {}

      const module = await Test.createTestingModule({
        providers: [
          PipelineResolver,
          TrackedMiddleware,
          { provide: GLOBAL_PIPELINE, useValue: [globalMw] },
        ],
      }).compile();

      const resolver = module.get(PipelineResolver);
      const pipeline = resolver.resolve<PlaceOrder>(null, TestClass);

      const result = await pipeline.execute(
        async (_command: OrderCommand) => {
          order.push('handler');
          return { success: true, orderId: 'ORD-001' };
        },
        { orderId: 'ORD-001', quantity: 5 },
      );

      expect(result).toEqual({ success: true, orderId: 'ORD-001' });
      expect(order).toEqual(['global', 'class-di', 'handler']);
    });
  });

  describe('stacked decorators and inheritance', () => {
    const mw = (label: string): SimpleMiddleware => new SimpleMiddleware(label);

    const resolveLabels = async (
      ...scope: Parameters<PipelineResolver['resolve']>
    ): Promise<string[]> => {
      const module = await Test.createTestingModule({
        providers: [PipelineResolver, { provide: GLOBAL_PIPELINE, useValue: [mw('global')] }],
      }).compile();
      const middlewares = module
        .get(PipelineResolver)
        .resolve(...scope)
        .getMiddlewares();
      return middlewares.map(middleware => (middleware as SimpleMiddleware).label);
    };

    it('should apply stacked method decorators top-most first', async () => {
      class TestClass {
        @UsePipeline(mw('A'))
        @UsePipeline(mw('B'))
        execute(): void {}
      }

      expect(await resolveLabels(null, TestClass, 'execute')).toEqual(['global', 'A', 'B']);
    });

    it('should merge base and derived class scopes, base first', async () => {
      @UsePipeline(mw('parent'))
      class Parent {}

      @UsePipeline(mw('child'))
      class Child extends Parent {}

      expect(await resolveLabels(null, Child)).toEqual(['global', 'parent', 'child']);
    });

    it('should inherit the base class scope when the subclass has no decorator', async () => {
      @UsePipeline(mw('parent'))
      class Parent {}

      class Child extends Parent {}

      expect(await resolveLabels(null, Child)).toEqual(['global', 'parent']);
    });

    it('should merge the method scopes of an overridden method, base first', async () => {
      class Parent {
        @UsePipeline(mw('parent-method'))
        execute(): void {}
      }

      class Child extends Parent {
        @UsePipeline(mw('child-method'))
        execute(): void {}
      }

      expect(await resolveLabels(null, Child, 'execute')).toEqual([
        'global',
        'parent-method',
        'child-method',
      ]);
    });

    it('should merge base and derived module scopes, base first', async () => {
      @UseModulePipeline(mw('base-module'))
      class BaseModule {}

      @UseModulePipeline(mw('derived-module'))
      class DerivedModule extends BaseModule {}

      expect(await resolveLabels(DerivedModule)).toEqual([
        'global',
        'base-module',
        'derived-module',
      ]);
    });

    it('should order all scopes: global, module, class (base → derived), method (base → derived)', async () => {
      @UseModulePipeline(mw('module-1'))
      @UseModulePipeline(mw('module-2'))
      class TestModule {}

      @UsePipeline(mw('parent-class'))
      class Parent {
        @UsePipeline(mw('parent-method'))
        execute(): void {}
      }

      @UsePipeline(mw('child-class-1'))
      @UsePipeline(mw('child-class-2'))
      class Child extends Parent {
        @UsePipeline(mw('child-method'))
        execute(): void {}
      }

      expect(await resolveLabels(TestModule, Child, 'execute')).toEqual([
        'global',
        'module-1',
        'module-2',
        'parent-class',
        'child-class-1',
        'child-class-2',
        'parent-method',
        'child-method',
      ]);
    });
  });
});
