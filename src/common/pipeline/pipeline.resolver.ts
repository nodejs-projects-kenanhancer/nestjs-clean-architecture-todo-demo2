import { Inject, Injectable, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { IMiddleware, MiddlewareEntry, isMiddlewareClass } from './middleware.interface';
import { Pipeline } from './pipeline';
import {
  CLASS_PIPELINE_METADATA,
  GLOBAL_PIPELINE,
  METHOD_PIPELINE_METADATA,
  MODULE_PIPELINE_METADATA,
} from './pipeline.constants';

@Injectable()
export class PipelineResolver {
  constructor(
    private readonly moduleRef: ModuleRef,
    @Optional()
    @Inject(GLOBAL_PIPELINE)
    private readonly globalEntries?: MiddlewareEntry[],
  ) {}

  resolve<TInput, TOutput>(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    moduleClass?: Function | null,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    targetClass?: Function | null,
    methodName?: string | null,
  ): Pipeline<TInput, TOutput> {
    const entries: MiddlewareEntry[] = [];

    if (this.globalEntries) {
      entries.push(...this.globalEntries);
    }

    if (moduleClass) {
      const moduleEntries = Reflect.getMetadata(MODULE_PIPELINE_METADATA, moduleClass) as
        | MiddlewareEntry[]
        | undefined;
      if (moduleEntries) {
        entries.push(...moduleEntries);
      }
    }

    if (targetClass) {
      const classEntries = Reflect.getMetadata(CLASS_PIPELINE_METADATA, targetClass) as
        | MiddlewareEntry[]
        | undefined;
      if (classEntries) {
        entries.push(...classEntries);
      }
    }

    if (targetClass && methodName) {
      const methodEntries = Reflect.getMetadata(
        METHOD_PIPELINE_METADATA,
        targetClass.prototype,
        methodName,
      ) as MiddlewareEntry[] | undefined;
      if (methodEntries) {
        entries.push(...methodEntries);
      }
    }

    const middlewares: IMiddleware<TInput, TOutput>[] = entries.map(entry =>
      isMiddlewareClass(entry)
        ? this.moduleRef.get(entry, { strict: false })
        : (entry as IMiddleware<TInput, TOutput>),
    );

    const pipeline = new Pipeline<TInput, TOutput>();
    pipeline.use(...middlewares);
    return pipeline;
  }
}
