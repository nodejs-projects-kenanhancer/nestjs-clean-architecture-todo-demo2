import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { IMiddleware, NextFunction } from './middleware.interface.js';
import { GLOBAL_PIPELINE } from './pipeline.constants.js';
import { PipelineModule } from './pipeline.module.js';
import { PipelineResolver } from './pipeline.resolver.js';

interface OrderCommand {
  orderId: string;
  quantity: number;
}

interface OrderResult {
  success: boolean;
  orderId: string;
}

@Injectable()
class LoggingMiddleware implements IMiddleware<OrderCommand, OrderResult> {
  handle(_input: OrderCommand, next: NextFunction<OrderResult>): Promise<OrderResult> {
    return next();
  }
}

@Injectable()
class ValidationMiddleware implements IMiddleware<OrderCommand, OrderResult> {
  handle(_input: OrderCommand, next: NextFunction<OrderResult>): Promise<OrderResult> {
    return next();
  }
}

class SimpleMiddleware implements IMiddleware<OrderCommand, OrderResult> {
  handle(_input: OrderCommand, next: NextFunction<OrderResult>): Promise<OrderResult> {
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
      const pipeline = resolver.resolve<OrderCommand, OrderResult>();
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
      const pipeline = resolver.resolve<OrderCommand, OrderResult>();
      const middlewares = pipeline.getMiddlewares();

      expect(middlewares).toHaveLength(2);
      expect(middlewares[0]).toBeInstanceOf(LoggingMiddleware);
      expect(middlewares[1]).toBe(instance);
    });

    it('should produce a working pipeline end-to-end', async () => {
      const order: string[] = [];

      @Injectable()
      class TrackedMiddleware implements IMiddleware<OrderCommand, OrderResult> {
        async handle(_input: OrderCommand, next: NextFunction<OrderResult>): Promise<OrderResult> {
          order.push('tracked');
          return next();
        }
      }

      const inlineMiddleware: IMiddleware<OrderCommand, OrderResult> = {
        handle: async (_input, next) => {
          order.push('inline');
          return next();
        },
      };

      const module = await Test.createTestingModule({
        imports: [PipelineModule.register(TrackedMiddleware, inlineMiddleware)],
      }).compile();

      const resolver = module.get(PipelineResolver);
      const pipeline = resolver.resolve<OrderCommand, OrderResult>();

      const result = await pipeline.execute({ orderId: 'ORD-001', quantity: 5 }, async () => {
        order.push('handler');
        return { success: true, orderId: 'ORD-001' };
      });

      expect(result).toEqual({ success: true, orderId: 'ORD-001' });
      expect(order).toEqual(['tracked', 'inline', 'handler']);
    });
  });
});
