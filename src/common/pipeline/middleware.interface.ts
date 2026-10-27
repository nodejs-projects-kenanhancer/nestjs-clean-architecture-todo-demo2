import { Type } from '@nestjs/common';

import { Fn, IMiddleware } from './core';

export type MiddlewareEntry<F extends Fn = Fn> = Type<IMiddleware<F>> | IMiddleware<F>;

export function isMiddlewareClass(entry: MiddlewareEntry): entry is Type<IMiddleware> {
  return typeof entry === 'function';
}
