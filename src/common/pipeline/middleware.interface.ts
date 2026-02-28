import { Type } from '@nestjs/common';

export type NextFunction<TOutput> = () => Promise<TOutput>;

export interface IMiddleware<TInput = unknown, TOutput = unknown> {
  handle(input: TInput, next: NextFunction<TOutput>): Promise<TOutput>;
}

export type MiddlewareEntry<TInput = unknown, TOutput = unknown> =
  | Type<IMiddleware<TInput, TOutput>>
  | IMiddleware<TInput, TOutput>;

export function isMiddlewareClass(entry: MiddlewareEntry): entry is Type<IMiddleware> {
  return typeof entry === 'function';
}
