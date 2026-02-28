import { Module, type ModuleMetadata } from '@nestjs/common';

import 'reflect-metadata';

import { MiddlewareEntry } from './middleware.interface';
import {
  CLASS_PIPELINE_METADATA,
  METHOD_PIPELINE_METADATA,
  MODULE_PIPELINE_METADATA,
} from './pipeline.constants';

export function UsePipeline(...entries: MiddlewareEntry[]): ClassDecorator & MethodDecorator {
  return (
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    target: object | Function,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    if (propertyKey !== undefined && descriptor !== undefined) {
      Reflect.defineMetadata(METHOD_PIPELINE_METADATA, entries, target, propertyKey);
    } else {
      Reflect.defineMetadata(CLASS_PIPELINE_METADATA, entries, target);
    }
  };
}

export function UseModulePipeline(...entries: MiddlewareEntry[]): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (target: Function) => {
    Reflect.defineMetadata(MODULE_PIPELINE_METADATA, entries, target);
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
      Reflect.defineMetadata(MODULE_PIPELINE_METADATA, pipeline, target);
    }
  };
}
