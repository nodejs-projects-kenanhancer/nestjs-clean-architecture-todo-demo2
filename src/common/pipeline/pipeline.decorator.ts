import { Module, type ModuleMetadata } from '@nestjs/common';

import { Fn } from './core';
import { AcceptedBy, GenericOnly, MiddlewareEntry } from './middleware.interface';
import {
  CLASS_PIPELINE_METADATA,
  METHOD_PIPELINE_METADATA,
  MODULE_PIPELINE_METADATA,
} from './pipeline.constants';
import { prependEntries } from './pipeline.metadata';

/** A function with Fn's parameters that returns a Promise, as every wrapped method does. */
type AsyncFn = (...args: Parameters<Fn>) => Promise<unknown>;

type IncompatibleMethods<I, A> = {
  [K in keyof I]: I[K] extends AsyncFn ? (I[K] extends A ? never : K) : never;
}[keyof I];

type CompatibleClass<I, A> = [IncompatibleMethods<I, A>] extends [never]
  ? unknown
  : { __pipelineIncompatibleMethods: IncompatibleMethods<I, A> };

/**
 * On a method, the method must be async and accepted by every entry. On a class, every public
 * async method must be.
 */
export interface PipelineDecorator<A extends Fn> {
  <C extends abstract new (...args: never[]) => object>(
    target: C & CompatibleClass<InstanceType<C>, A>,
  ): void;
  <M extends A & AsyncFn>(
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<M>,
  ): void;
}

export function UsePipeline<const E extends readonly MiddlewareEntry[]>(
  ...entries: E
): PipelineDecorator<AcceptedBy<E>> {
  const decorator = (
    target: object,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ): void => {
    if (propertyKey !== undefined && descriptor !== undefined) {
      prependEntries(METHOD_PIPELINE_METADATA, entries, target, propertyKey);
    } else {
      prependEntries(CLASS_PIPELINE_METADATA, entries, target);
    }
  };
  return decorator as PipelineDecorator<AcceptedBy<E>>;
}

export function UseModulePipeline<const E extends readonly MiddlewareEntry[]>(
  ...entries: E & GenericOnly<E>
): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (target: Function) => {
    prependEntries(MODULE_PIPELINE_METADATA, entries, target);
  };
}

export interface PipelineModuleMetadata<
  E extends readonly MiddlewareEntry[] = readonly MiddlewareEntry[],
> extends ModuleMetadata {
  pipeline?: E & GenericOnly<E>;
}

export function PipelineModuleDecorator<const E extends readonly MiddlewareEntry[] = readonly []>(
  metadata: PipelineModuleMetadata<E>,
): ClassDecorator {
  const { pipeline, ...moduleMetadata } = metadata;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (target: Function) => {
    Module(moduleMetadata)(target);

    if (pipeline && pipeline.length > 0) {
      prependEntries(MODULE_PIPELINE_METADATA, pipeline, target);
    }
  };
}
