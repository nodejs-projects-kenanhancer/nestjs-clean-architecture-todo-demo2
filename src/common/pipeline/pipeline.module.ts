import { DynamicModule, Module } from '@nestjs/common';

import { GenericOnly, MiddlewareEntry, isMiddlewareClass } from './middleware.interface';
import { GLOBAL_PIPELINE, PIPELINE_RESOLVER } from './pipeline.constants';
import { PipelineResolver } from './pipeline.resolver';

@Module({})
export class PipelineModule {
  static register<const E extends readonly MiddlewareEntry[]>(
    ...entries: E & GenericOnly<E>
  ): DynamicModule {
    const classProviders = (entries as readonly MiddlewareEntry[]).filter(isMiddlewareClass);

    return {
      module: PipelineModule,
      global: true,
      providers: [
        ...classProviders,
        { provide: GLOBAL_PIPELINE, useValue: entries },
        PipelineResolver,
        { provide: PIPELINE_RESOLVER, useExisting: PipelineResolver },
      ],
      exports: [GLOBAL_PIPELINE, PIPELINE_RESOLVER, PipelineResolver, ...classProviders],
    };
  }
}
