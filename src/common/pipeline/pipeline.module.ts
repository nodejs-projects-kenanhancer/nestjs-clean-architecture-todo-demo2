import { DynamicModule, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { GenericOnly, MiddlewareEntry, isMiddlewareClass } from './middleware.interface';
import { GLOBAL_PIPELINE, PIPELINE_RESOLVER } from './pipeline.constants';
import { PipelineExplorer } from './pipeline.explorer';
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
      imports: [DiscoveryModule],
      providers: [
        ...classProviders,
        { provide: GLOBAL_PIPELINE, useValue: entries },
        PipelineResolver,
        { provide: PIPELINE_RESOLVER, useExisting: PipelineResolver },
        PipelineExplorer,
      ],
      exports: [GLOBAL_PIPELINE, PIPELINE_RESOLVER, PipelineResolver, ...classProviders],
    };
  }
}
