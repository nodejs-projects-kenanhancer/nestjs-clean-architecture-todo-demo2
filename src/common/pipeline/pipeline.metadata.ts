import 'reflect-metadata';

import { MiddlewareEntry } from './middleware.interface';
import {
  CLASS_PIPELINE_METADATA,
  METHOD_PIPELINE_METADATA,
  MODULE_PIPELINE_METADATA,
} from './pipeline.constants';

function ownEntries(
  metadataKey: symbol,
  target: object,
  propertyKey?: string | symbol,
): MiddlewareEntry[] {
  const entries: unknown =
    propertyKey === undefined
      ? Reflect.getOwnMetadata(metadataKey, target)
      : Reflect.getOwnMetadata(metadataKey, target, propertyKey);
  return (entries as MiddlewareEntry[] | undefined) ?? [];
}

/**
 * Stores entries on `target` itself, in front of the ones already there. Decorators are applied
 * bottom-up, so the top-most decorator ends up outermost, matching the reading order.
 */
export function prependEntries(
  metadataKey: symbol,
  entries: readonly MiddlewareEntry[],
  target: object,
  propertyKey?: string | symbol,
): void {
  const merged = [...entries, ...ownEntries(metadataKey, target, propertyKey)];
  if (propertyKey === undefined) {
    Reflect.defineMetadata(metadataKey, merged, target);
  } else {
    Reflect.defineMetadata(metadataKey, merged, target, propertyKey);
  }
}

/** `target` and its prototype chain, base first, without Object/Function.prototype. */
function baseFirstChain(target: object): object[] {
  const chain: object[] = [];
  let current: object | null = target;
  while (current && current !== Object.prototype && current !== Function.prototype) {
    chain.unshift(current);
    current = Object.getPrototypeOf(current) as object | null;
  }
  return chain;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function getModuleEntries(moduleClass: Function): MiddlewareEntry[] {
  return baseFirstChain(moduleClass).flatMap(cls => ownEntries(MODULE_PIPELINE_METADATA, cls));
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function getClassEntries(targetClass: Function): MiddlewareEntry[] {
  return baseFirstChain(targetClass).flatMap(cls => ownEntries(CLASS_PIPELINE_METADATA, cls));
}

/** Marked by a class-level @UsePipeline, on the class or a base class. */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function isClassMarked(targetClass: Function): boolean {
  return Reflect.getMetadata(CLASS_PIPELINE_METADATA, targetClass) !== undefined;
}

/** Marked by a method-level @UsePipeline (also an empty one), here or on a base class method. */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function isMethodMarked(targetClass: Function, methodName: string | symbol): boolean {
  return (
    Reflect.getMetadata(METHOD_PIPELINE_METADATA, targetClass.prototype as object, methodName) !==
    undefined
  );
}

export function getMethodEntries(
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  targetClass: Function,
  methodName: string | symbol,
): MiddlewareEntry[] {
  return baseFirstChain(targetClass.prototype as object).flatMap(proto =>
    ownEntries(METHOD_PIPELINE_METADATA, proto, methodName),
  );
}
