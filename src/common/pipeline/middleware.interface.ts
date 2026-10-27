import { Type } from '@nestjs/common';

import { Fn, IMiddleware } from './core';

export type MiddlewareEntry<F extends Fn = Fn> = Type<IMiddleware<F>> | IMiddleware<F>;

export function isMiddlewareClass(entry: MiddlewareEntry): entry is Type<IMiddleware> {
  return typeof entry === 'function';
}

/** The function type an entry is written for: F of IMiddleware<F>, for class types and instances. */
export type EntryFn<E> =
  E extends Type<IMiddleware<infer F>> ? F : E extends IMiddleware<infer F> ? F : never;

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (
  x: infer I,
) => void
  ? I
  : never;

/** The method type all entries accept: the intersection of their function types (Fn if none). */
export type AcceptedBy<E extends readonly unknown[]> = [E[number]] extends [never]
  ? Fn
  : UnionToIntersection<EntryFn<E[number]>> & Fn;

type NonGenericIndex<E extends readonly unknown[]> = {
  [I in keyof E]: unknown[] extends Parameters<EntryFn<E[I]>> ? never : I;
}[number];

/**
 * Global and module entries run for every pipelined method, so they must accept any arguments.
 * Resolves to `unknown` when they do; otherwise to a type whose property names the bad index.
 */
export type GenericOnly<E extends readonly unknown[]> = [NonGenericIndex<E>] extends [never]
  ? unknown
  : { __pipelineNonGenericEntryAt: NonGenericIndex<E> };
