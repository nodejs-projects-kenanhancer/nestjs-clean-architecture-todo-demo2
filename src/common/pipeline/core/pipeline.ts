import { Context, Fn, Result } from './context';
import { IMiddleware, NextFunction } from './middleware';

export class Pipeline<F extends Fn = Fn> {
  private readonly middlewares: IMiddleware<F>[] = [];
  private target?: string;

  use(...middlewares: IMiddleware<F>[]): this {
    this.middlewares.push(...middlewares);
    return this;
  }

  useAll(pipeline: Pipeline<F>): this {
    this.middlewares.push(...pipeline.getMiddlewares());
    return this;
  }

  getMiddlewares(): IMiddleware<F>[] {
    return [...this.middlewares];
  }

  /**
   * Returns a new pipeline with a copy of the current middlewares whose executions report
   * `target` as ctx.target, e.g. 'CreateTodoUseCase.execute' instead of 'bound execute'.
   */
  withTarget(target: string): Pipeline<F> {
    const pipeline = new Pipeline<F>().use(...this.middlewares);
    pipeline.target = target;
    return pipeline;
  }

  execute<G extends F>(fn: G, ...args: Parameters<G>): Promise<Result<G>> {
    const ctx: Context<G> = {
      args,
      target: this.target ?? (fn.name || 'anonymous'),
      metadata: new Map(),
    };

    // Middlewares are typed for F; G is the function actually executed (G extends F).
    const middlewares = this.middlewares as unknown as IMiddleware<G>[];
    const chain: NextFunction<G> = middlewares.reduceRight<NextFunction<G>>(
      (next, middleware) => () => middleware.handle(ctx, next),
      async () => fn(...ctx.args),
    );

    return chain();
  }
}
