import { DynamicModule, Global, Module } from '@nestjs/common';

import { MiddlewareEntry, isMiddlewareClass } from './middleware.interface.js';
import { GLOBAL_PIPELINE, PIPELINE_RESOLVER } from './pipeline.constants.js';
import { PipelineResolver } from './pipeline.resolver.js';

@Global()
@Module({})
export class PipelineModule {
  static register(...entries: MiddlewareEntry[]): DynamicModule {
    const classProviders = entries.filter(isMiddlewareClass);

    return {
      module: PipelineModule,
      global: true,
      providers: [
        ...classProviders,
        { provide: GLOBAL_PIPELINE, useValue: entries },
        { provide: PIPELINE_RESOLVER, useClass: PipelineResolver },
        PipelineResolver,
      ],
      exports: [GLOBAL_PIPELINE, PIPELINE_RESOLVER, PipelineResolver, ...classProviders],
    };
  }
}
