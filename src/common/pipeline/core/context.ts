// `any` is required: `unknown` parameters would reject sayHello(firstName: string, ...) under
// strictFunctionTypes, and an `unknown` result would stop generic middlewares from fitting typed ones.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Fn = (...args: any[]) => any;

/** What the pipeline resolves to: the function's return value, awaited. */
export type Result<F extends Fn> = Awaited<ReturnType<F>>;

/**
 * One context object per execution, shared by every middleware and the target.
 * Changing `args` (in place or by assigning a new tuple) is visible downstream.
 */
export interface Context<F extends Fn = Fn> {
  args: Parameters<F>;
  readonly target: string;
  readonly metadata: Map<string | symbol, unknown>;
}
