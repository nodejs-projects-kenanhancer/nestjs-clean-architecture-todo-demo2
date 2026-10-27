import { Inject, Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { Context, IMiddleware, NextFunction } from './core';
import { GLOBAL_PIPELINE, PIPELINE_RESOLVER } from './pipeline.constants';
import { PipelineModule } from './pipeline.module';
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

// Global entries must be generic middlewares: they run for every pipelined method.
@Injectable()
class LoggingMiddleware implements IMiddleware {
  handle(_ctx: Context, next: NextFunction): Promise<unknown> {
    return next();
  }
}

@Injectable()
class ValidationMiddleware implements IMiddleware {
  handle(_ctx: Context, next: NextFunction): Promise<unknown> {
    return next();
  }
}

class SimpleMiddleware implements IMiddleware {
  handle(_ctx: Context, next: NextFunction): Promise<unknown> {
    return next();
  }
}

describe('PipelineModule', () => {
  describe('register with class types', () => {
    it('should register class types as providers and make them available', async () => {
      const module = await Test.createTestingModule({
        imports: [PipelineModule.register(LoggingMiddleware, ValidationMiddleware)],
      }).compile();

      const logging = module.get(LoggingMiddleware);
      const validation = module.get(ValidationMiddleware);

      expect(logging).toBeInstanceOf(LoggingMiddleware);
      expect(validation).toBeInstanceOf(ValidationMiddleware);
    });

    it('should provide GLOBAL_PIPELINE token with entries', async () => {
      const module = await Test.createTestingModule({
        imports: [PipelineModule.register(LoggingMiddleware)],
      }).compile();

      const entries = module.get(GLOBAL_PIPELINE);

      expect(entries).toEqual([LoggingMiddleware]);
    });

    it('should provide PipelineResolver', async () => {
      const module = await Test.createTestingModule({
        imports: [PipelineModule.register(LoggingMiddleware)],
      }).compile();

      const resolver = module.get(PipelineResolver);

      expect(resolver).toBeInstanceOf(PipelineResolver);
    });
  });

  describe('register with instances', () => {
    it('should store instances in GLOBAL_PIPELINE', async () => {
      const instance = new SimpleMiddleware();

      const module = await Test.createTestingModule({
        imports: [PipelineModule.register(instance)],
      }).compile();

      const entries = module.get(GLOBAL_PIPELINE);

      expect(entries).toEqual([instance]);
    });
  });

  describe('register with mixed entries', () => {
    it('should handle both class types and instances', async () => {
      const instance = new SimpleMiddleware();

      const module = await Test.createTestingModule({
        imports: [PipelineModule.register(LoggingMiddleware, instance)],
      }).compile();

      const entries = module.get(GLOBAL_PIPELINE);
      const logging = module.get(LoggingMiddleware);

      expect(entries).toHaveLength(2);
      expect(entries[0]).toBe(LoggingMiddleware);
      expect(entries[1]).toBe(instance);
      expect(logging).toBeInstanceOf(LoggingMiddleware);
    });
  });

  describe('PipelineResolver integration via register', () => {
    it('should resolve class types through PipelineResolver', async () => {
      const module = await Test.createTestingModule({
        imports: [PipelineModule.register(LoggingMiddleware)],
      }).compile();

      const resolver = module.get(PipelineResolver);
      const pipeline = resolver.resolve<PlaceOrder>();
      const middlewares = pipeline.getMiddlewares();

      expect(middlewares).toHaveLength(1);
      expect(middlewares[0]).toBeInstanceOf(LoggingMiddleware);
    });

    it('should resolve mixed entries through PipelineResolver', async () => {
      const instance = new SimpleMiddleware();

      const module = await Test.createTestingModule({
        imports: [PipelineModule.register(LoggingMiddleware, instance)],
      }).compile();

      const resolver = module.get(PipelineResolver);
      const pipeline = resolver.resolve<PlaceOrder>();
      const middlewares = pipeline.getMiddlewares();

      expect(middlewares).toHaveLength(2);
      expect(middlewares[0]).toBeInstanceOf(LoggingMiddleware);
      expect(middlewares[1]).toBe(instance);
    });

    it('should produce a working pipeline end-to-end', async () => {
      const order: string[] = [];

      @Injectable()
      class TrackedMiddleware implements IMiddleware {
        async handle(_ctx: Context, next: NextFunction): Promise<unknown> {
          order.push('tracked');
          return next();
        }
      }

      const inlineMiddleware: IMiddleware = {
        handle: async (_ctx, next) => {
          order.push('inline');
          return next();
        },
      };

      const module = await Test.createTestingModule({
        imports: [PipelineModule.register(TrackedMiddleware, inlineMiddleware)],
      }).compile();

      const resolver = module.get(PipelineResolver);
      const pipeline = resolver.resolve<PlaceOrder>();

      const result = await pipeline.execute(
        async (_command: OrderCommand) => {
          order.push('handler');
          return { success: true, orderId: 'ORD-001' };
        },
        { orderId: 'ORD-001', quantity: 5 },
      );

      expect(result).toEqual({ success: true, orderId: 'ORD-001' });
      expect(order).toEqual(['tracked', 'inline', 'handler']);
    });
  });

  describe('PIPELINE_RESOLVER token', () => {
    it('should resolve to the same instance as PipelineResolver', async () => {
      const module = await Test.createTestingModule({
        imports: [PipelineModule.register()],
      }).compile();

      // Identity check as a boolean: printing a diff of two resolvers crashes on Nest internals.
      const sameInstance = module.get(PIPELINE_RESOLVER) === module.get(PipelineResolver);
      expect(sameInstance).toBe(true);
    });
  });

  describe('global availability', () => {
    it('should be injectable in modules that do not import PipelineModule', async () => {
      @Injectable()
      class Consumer {
        constructor(
          readonly resolver: PipelineResolver,
          @Inject(PIPELINE_RESOLVER) readonly resolverByToken: PipelineResolver,
        ) {}
      }

      @Module({ providers: [Consumer] })
      class FeatureModule {}

      const module = await Test.createTestingModule({
        imports: [PipelineModule.register(), FeatureModule],
      }).compile();

      const consumer = module.get(Consumer);
      expect(consumer.resolver).toBeInstanceOf(PipelineResolver);
      expect(consumer.resolverByToken).toBeInstanceOf(PipelineResolver);
    });
  });
});
