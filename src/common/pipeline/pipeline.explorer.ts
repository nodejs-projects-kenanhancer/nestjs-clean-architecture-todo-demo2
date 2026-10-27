import { Injectable, OnModuleInit, Scope } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryService, MetadataScanner, ModuleRef } from '@nestjs/core';
import type { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';

import { IMiddleware, Pipeline } from './core';
import { MiddlewareEntry, isMiddlewareClass } from './middleware.interface';
import { PipelineConfigurationError } from './pipeline.errors';
import { isClassMarked, isMethodMarked } from './pipeline.metadata';
import { PipelineResolver } from './pipeline.resolver';

const WRAPPED = Symbol('PIPELINE_WRAPPED');

// Put on handler methods by @Get/@Post..., @MessagePattern/@EventPattern and @Query/@Mutation/
// @ResolveField. Nest calls those handlers itself, so a wrapped instance method would be bypassed.
const TRANSPORT_HANDLER_METADATA = [
  PATH_METADATA,
  'microservices:pattern',
  'graphql:resolver_name',
];

type Method = ((...args: unknown[]) => unknown) & { [WRAPPED]?: true };

/**
 * Wraps the marked methods of singleton providers at startup, so calling them runs the pipeline:
 * global → module (the provider's host module) → class → method → the original method.
 */
@Injectable()
export class PipelineExplorer implements OnModuleInit {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly moduleRef: ModuleRef,
    private readonly resolver: PipelineResolver,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const wrapper of this.discovery.getControllers()) {
      this.rejectMarkedController(wrapper);
    }
    for (const wrapper of this.discovery.getProviders()) {
      await this.wrapProvider(wrapper);
    }
  }

  private rejectMarkedController(wrapper: InstanceWrapper): void {
    const controller = this.classOf(wrapper);
    if (controller && (isClassMarked(controller) || this.markedMethods(controller).length > 0)) {
      throw new PipelineConfigurationError(
        `@UsePipeline is not supported on controllers (${controller.name}). ` +
          'Mark the use case method the controller calls instead.',
      );
    }
  }

  private async wrapProvider(wrapper: InstanceWrapper): Promise<void> {
    const targetClass = this.classOf(wrapper);
    if (!targetClass || wrapper.isAlias) {
      return;
    }

    const methods = this.markedMethods(targetClass);
    if (methods.length === 0) {
      if (isClassMarked(targetClass)) {
        throw new PipelineConfigurationError(
          `${targetClass.name} has a class-level @UsePipeline but none of its methods is marked. ` +
            'Mark each method that should run through the pipeline with @UsePipeline().',
        );
      }
      return;
    }

    if (!wrapper.isDependencyTreeStatic() || wrapper.isTransient) {
      throw new PipelineConfigurationError(
        `${targetClass.name} uses @UsePipeline but is not a singleton provider; ` +
          'request-scoped and transient providers are not supported.',
      );
    }

    for (const methodName of methods) {
      await this.wrapMethod(wrapper.instance as object, targetClass, methodName, wrapper);
    }
  }

  private async wrapMethod(
    instance: object,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    targetClass: Function,
    methodName: string,
    wrapper: InstanceWrapper,
  ): Promise<void> {
    const original = Reflect.get(instance, methodName) as Method;
    if (original[WRAPPED]) {
      return;
    }

    const target = `${targetClass.name}.${methodName}`;
    if (TRANSPORT_HANDLER_METADATA.some(key => Reflect.hasMetadata(key, original))) {
      throw new PipelineConfigurationError(
        `${target} is a transport handler; @UsePipeline is not supported there. ` +
          'Mark the use case method it calls instead.',
      );
    }

    const middlewares: IMiddleware[] = [];
    for (const entry of this.resolver.entries(wrapper.host?.metatype, targetClass, methodName)) {
      middlewares.push(await this.instantiate(entry, target));
    }

    // Built once per method; every call creates only its own context.
    const pipeline = new Pipeline().use(...middlewares).withTarget(target);
    const call = (...args: unknown[]): unknown => original.apply(instance, args);
    const wrapped: Method = (...args) => pipeline.execute(call, ...args);
    wrapped[WRAPPED] = true;

    Object.defineProperty(instance, methodName, {
      value: wrapped,
      writable: true,
      configurable: true,
    });
  }

  private async instantiate(entry: MiddlewareEntry, target: string): Promise<IMiddleware> {
    if (!isMiddlewareClass(entry)) {
      return entry;
    }

    let scope: Scope | undefined;
    try {
      scope = this.moduleRef.introspect(entry).scope;
    } catch {
      throw new PipelineConfigurationError(
        `${entry.name} is used by ${target} but is not registered as a provider. ` +
          'Add it to the providers of a module, or pass it to PipelineModule.register(...).',
      );
    }

    if (scope === Scope.REQUEST) {
      throw new PipelineConfigurationError(
        `${entry.name} (used by ${target}) is request-scoped; ` +
          'pipeline middlewares must be singleton or transient providers.',
      );
    }

    // A transient middleware gets its own instance for each wrapped method.
    return scope === Scope.TRANSIENT
      ? this.moduleRef.resolve(entry, undefined, { strict: false })
      : this.moduleRef.get(entry, { strict: false });
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private classOf(wrapper: InstanceWrapper): Function | undefined {
    const { instance, metatype } = wrapper;
    if (instance && typeof instance === 'object') {
      return instance.constructor;
    }
    // Request-scoped and transient providers have no static instance; only class providers
    // (no `inject`) can carry the decorators.
    return typeof metatype === 'function' && !wrapper.inject ? metatype : undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private markedMethods(targetClass: Function): string[] {
    return this.metadataScanner
      .getAllMethodNames(targetClass.prototype as object)
      .filter(methodName => isMethodMarked(targetClass, methodName));
  }
}
