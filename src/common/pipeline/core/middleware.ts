import { Context, Fn, Result } from './context';

export type NextFunction<F extends Fn = Fn> = () => Promise<Result<F>>;

export interface IMiddleware<F extends Fn = Fn> {
  handle(ctx: Context<F>, next: NextFunction<F>): Promise<Result<F>>;
}
