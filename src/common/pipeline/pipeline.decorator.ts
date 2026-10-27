import { Module, type ModuleMetadata } from '@nestjs/common';

import { MiddlewareEntry } from './middleware.interface';
import {
  CLASS_PIPELINE_METADATA,
  METHOD_PIPELINE_METADATA,
  MODULE_PIPELINE_METADATA,
} from './pipeline.constants';
import { prependEntries } from './pipeline.metadata';

export function UsePipeline(...entries: MiddlewareEntry[]): ClassDecorator & MethodDecorator {
  return (
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    target: object | Function,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    if (propertyKey !== undefined && descriptor !== undefined) {
      prependEntries(METHOD_PIPELINE_METADATA, entries, target, propertyKey);
    } else {
      prependEntries(CLASS_PIPELINE_METADATA, entries, target);
    }
  };
}

export function UseModulePipeline(...entries: MiddlewareEntry[]): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (target: Function) => {
    prependEntries(MODULE_PIPELINE_METADATA, entries, target);
  };
}

export interface PipelineModuleMetadata extends ModuleMetadata {
  pipeline?: MiddlewareEntry[];
}

export function PipelineModuleDecorator(metadata: PipelineModuleMetadata): ClassDecorator {
  const { pipeline, ...moduleMetadata } = metadata;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (target: Function) => {
    Module(moduleMetadata)(target);

    if (pipeline && pipeline.length > 0) {
      prependEntries(MODULE_PIPELINE_METADATA, pipeline, target);
    }
  };
}
