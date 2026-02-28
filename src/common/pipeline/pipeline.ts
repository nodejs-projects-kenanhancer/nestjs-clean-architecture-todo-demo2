import { IMiddleware, NextFunction } from './middleware.interface';

export class Pipeline<TInput = unknown, TOutput = unknown> {
  private readonly middlewares: IMiddleware<TInput, TOutput>[] = [];

  use(...middlewares: IMiddleware<TInput, TOutput>[]): this {
    this.middlewares.push(...middlewares);
    return this;
  }

  useAll(pipeline: Pipeline<TInput, TOutput>): this {
    this.middlewares.push(...pipeline.getMiddlewares());
    return this;
  }

  getMiddlewares(): IMiddleware<TInput, TOutput>[] {
    return [...this.middlewares];
  }

  async execute(input: TInput, handler: (input: TInput) => Promise<TOutput>): Promise<TOutput> {
    const chain: NextFunction<TOutput> = this.middlewares.reduceRight<NextFunction<TOutput>>(
      (next, middleware) => () => middleware.handle(input, next),
      () => handler(input),
    );

    return chain();
  }
}
