import { IMiddleware, NextFunction } from './middleware.interface';
import { Pipeline } from './pipeline';

interface OrderCommand {
  orderId: string;
  quantity: number;
}

interface OrderResult {
  success: boolean;
  orderId: string;
}

describe('Pipeline', () => {
  const createMiddleware = <TInput, TOutput>(
    fn: (input: TInput, next: NextFunction<TOutput>) => Promise<TOutput>,
  ): IMiddleware<TInput, TOutput> => ({ handle: fn });

  describe('use', () => {
    it('should add a single middleware', () => {
      const pipeline = new Pipeline<OrderCommand, OrderResult>();
      const mw = createMiddleware<OrderCommand, OrderResult>((_input, next) => next());

      pipeline.use(mw);

      expect(pipeline.getMiddlewares()).toEqual([mw]);
    });

    it('should add multiple middlewares at once', () => {
      const pipeline = new Pipeline<OrderCommand, OrderResult>();
      const mw1 = createMiddleware<OrderCommand, OrderResult>((_input, next) => next());
      const mw2 = createMiddleware<OrderCommand, OrderResult>((_input, next) => next());

      pipeline.use(mw1, mw2);

      expect(pipeline.getMiddlewares()).toEqual([mw1, mw2]);
    });

    it('should support fluent chaining', () => {
      const pipeline = new Pipeline<OrderCommand, OrderResult>();
      const mw1 = createMiddleware<OrderCommand, OrderResult>((_input, next) => next());
      const mw2 = createMiddleware<OrderCommand, OrderResult>((_input, next) => next());

      const result = pipeline.use(mw1).use(mw2);

      expect(result).toBe(pipeline);
      expect(pipeline.getMiddlewares()).toEqual([mw1, mw2]);
    });
  });

  describe('useAll', () => {
    it('should merge middlewares from another pipeline', () => {
      const pipeline1 = new Pipeline<OrderCommand, OrderResult>();
      const pipeline2 = new Pipeline<OrderCommand, OrderResult>();
      const mw1 = createMiddleware<OrderCommand, OrderResult>((_input, next) => next());
      const mw2 = createMiddleware<OrderCommand, OrderResult>((_input, next) => next());

      pipeline2.use(mw1, mw2);
      pipeline1.useAll(pipeline2);

      expect(pipeline1.getMiddlewares()).toEqual([mw1, mw2]);
    });

    it('should append after existing middlewares', () => {
      const pipeline1 = new Pipeline<OrderCommand, OrderResult>();
      const pipeline2 = new Pipeline<OrderCommand, OrderResult>();
      const mw1 = createMiddleware<OrderCommand, OrderResult>((_input, next) => next());
      const mw2 = createMiddleware<OrderCommand, OrderResult>((_input, next) => next());

      pipeline1.use(mw1);
      pipeline2.use(mw2);
      pipeline1.useAll(pipeline2);

      expect(pipeline1.getMiddlewares()).toEqual([mw1, mw2]);
    });
  });

  describe('getMiddlewares', () => {
    it('should return a shallow copy', () => {
      const pipeline = new Pipeline<OrderCommand, OrderResult>();
      const mw = createMiddleware<OrderCommand, OrderResult>((_input, next) => next());

      pipeline.use(mw);
      const copy = pipeline.getMiddlewares();
      copy.push(createMiddleware<OrderCommand, OrderResult>((_input, next) => next()));

      expect(pipeline.getMiddlewares()).toHaveLength(1);
    });

    it('should return empty array for new pipeline', () => {
      const pipeline = new Pipeline<OrderCommand, OrderResult>();

      expect(pipeline.getMiddlewares()).toEqual([]);
    });
  });

  describe('execute', () => {
    const sampleInput: OrderCommand = { orderId: 'ORD-001', quantity: 5 };
    const sampleOutput: OrderResult = { success: true, orderId: 'ORD-001' };

    it('should call handler when no middlewares', async () => {
      const pipeline = new Pipeline<OrderCommand, OrderResult>();
      const handler = jest.fn().mockResolvedValue(sampleOutput);

      const result = await pipeline.execute(sampleInput, handler);

      expect(result).toEqual(sampleOutput);
      expect(handler).toHaveBeenCalledWith(sampleInput);
    });

    it('should execute middlewares in order (first-added = outermost)', async () => {
      const pipeline = new Pipeline<OrderCommand, OrderResult>();
      const order: string[] = [];

      const mw1 = createMiddleware<OrderCommand, OrderResult>(async (_input, next) => {
        order.push('mw1-before');
        const result = await next();
        order.push('mw1-after');
        return result;
      });
      const mw2 = createMiddleware<OrderCommand, OrderResult>(async (_input, next) => {
        order.push('mw2-before');
        const result = await next();
        order.push('mw2-after');
        return result;
      });

      pipeline.use(mw1, mw2);
      await pipeline.execute(sampleInput, async () => {
        order.push('handler');
        return sampleOutput;
      });

      expect(order).toEqual(['mw1-before', 'mw2-before', 'handler', 'mw2-after', 'mw1-after']);
    });

    it('should pass input to each middleware', async () => {
      const pipeline = new Pipeline<OrderCommand, OrderResult>();
      const receivedInputs: OrderCommand[] = [];

      const mw = createMiddleware<OrderCommand, OrderResult>(async (input, next) => {
        receivedInputs.push(input);
        return next();
      });

      pipeline.use(mw);
      await pipeline.execute(sampleInput, async input => ({
        success: true,
        orderId: input.orderId,
      }));

      expect(receivedInputs[0]).toBe(sampleInput);
    });

    it('should allow short-circuiting without calling next', async () => {
      const pipeline = new Pipeline<OrderCommand, OrderResult>();
      const handler = jest.fn().mockResolvedValue(sampleOutput);

      const mw = createMiddleware<OrderCommand, OrderResult>(async () => {
        return { success: false, orderId: 'CANCELLED' };
      });

      pipeline.use(mw);
      const result = await pipeline.execute(sampleInput, handler);

      expect(result).toEqual({ success: false, orderId: 'CANCELLED' });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should propagate errors from handler', async () => {
      const pipeline = new Pipeline<OrderCommand, OrderResult>();
      const error = new Error('handler error');

      const mw = createMiddleware<OrderCommand, OrderResult>(async (_input, next) => next());
      pipeline.use(mw);

      await expect(
        pipeline.execute(sampleInput, async () => {
          throw error;
        }),
      ).rejects.toThrow('handler error');
    });

    it('should propagate errors from middleware', async () => {
      const pipeline = new Pipeline<OrderCommand, OrderResult>();

      const mw = createMiddleware<OrderCommand, OrderResult>(async () => {
        throw new Error('middleware error');
      });
      pipeline.use(mw);

      await expect(pipeline.execute(sampleInput, async () => sampleOutput)).rejects.toThrow(
        'middleware error',
      );
    });

    it('should allow middleware to catch and handle errors', async () => {
      const pipeline = new Pipeline<OrderCommand, OrderResult>();

      const errorHandler = createMiddleware<OrderCommand, OrderResult>(async (_input, next) => {
        try {
          return await next();
        } catch {
          return { success: false, orderId: 'ERROR' };
        }
      });
      const failing = createMiddleware<OrderCommand, OrderResult>(async () => {
        throw new Error('fail');
      });

      pipeline.use(errorHandler, failing);
      const result = await pipeline.execute(sampleInput, async () => sampleOutput);

      expect(result).toEqual({ success: false, orderId: 'ERROR' });
    });

    it('should allow middleware to transform the result', async () => {
      const pipeline = new Pipeline<OrderCommand, OrderResult>();

      const mw = createMiddleware<OrderCommand, OrderResult>(async (_input, next) => {
        const result = await next();
        return { ...result, orderId: result.orderId.toUpperCase() };
      });

      pipeline.use(mw);
      const result = await pipeline.execute(sampleInput, async () => ({
        success: true,
        orderId: 'ord-lowercase',
      }));

      expect(result).toEqual({ success: true, orderId: 'ORD-LOWERCASE' });
    });
  });
});
