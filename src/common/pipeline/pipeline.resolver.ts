import { Inject, Injectable, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { Fn, IMiddleware, Pipeline } from './core';
import { MiddlewareEntry, isMiddlewareClass } from './middleware.interface';
import { GLOBAL_PIPELINE } from './pipeline.constants';
import { getClassEntries, getMethodEntries, getModuleEntries } from './pipeline.metadata';

@Injectable()
export class PipelineResolver {
  constructor(
    private readonly moduleRef: ModuleRef,
    @Optional()
    @Inject(GLOBAL_PIPELINE)
    private readonly globalEntries?: MiddlewareEntry[],
  ) {}

  resolve<F extends Fn = Fn>(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    moduleClass?: Function | null,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    targetClass?: Function | null,
    methodName?: string | null,
  ): Pipeline<F> {
    const entries: MiddlewareEntry[] = [];

    if (this.globalEntries) {
      entries.push(...this.globalEntries);
    }

    // Each scope is collected along the inheritance chain, base class first.
    if (moduleClass) {
      entries.push(...getModuleEntries(moduleClass));
    }

    if (targetClass) {
      entries.push(...getClassEntries(targetClass));
    }

    if (targetClass && methodName) {
      entries.push(...getMethodEntries(targetClass, methodName));
    }

    const middlewares: IMiddleware<F>[] = entries.map(entry =>
      isMiddlewareClass(entry)
        ? this.moduleRef.get(entry, { strict: false })
        : (entry as IMiddleware<F>),
    );

    const pipeline = new Pipeline<F>();
    pipeline.use(...middlewares);
    return pipeline;
  }
}
