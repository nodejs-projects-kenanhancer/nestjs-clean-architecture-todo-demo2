import { Injectable } from '@nestjs/common';

import 'reflect-metadata';

import { IMiddleware, NextFunction } from './middleware.interface';
import {
  CLASS_PIPELINE_METADATA,
  METHOD_PIPELINE_METADATA,
  MODULE_PIPELINE_METADATA,
} from './pipeline.constants';
import { PipelineModuleDecorator, UseModulePipeline, UsePipeline } from './pipeline.decorator';

interface OrderCommand {
  orderId: string;
  quantity: number;
}

interface OrderResult {
  success: boolean;
  orderId: string;
}

class StubMiddleware implements IMiddleware<OrderCommand, OrderResult> {
  handle(_input: OrderCommand, next: NextFunction<OrderResult>): Promise<OrderResult> {
    return next();
  }
}

@Injectable()
class InjectableMiddleware implements IMiddleware<OrderCommand, OrderResult> {
  handle(_input: OrderCommand, next: NextFunction<OrderResult>): Promise<OrderResult> {
    return next();
  }
}

describe('Pipeline Decorators', () => {
  describe('UsePipeline (class decorator)', () => {
    it('should store middleware entries as class metadata', () => {
      const instance = new StubMiddleware();

      @UsePipeline(instance)
      class TestClass {}

      const entries = Reflect.getMetadata(CLASS_PIPELINE_METADATA, TestClass);

      expect(entries).toEqual([instance]);
    });

    it('should store class types as entries', () => {
      @UsePipeline(InjectableMiddleware)
      class TestClass {}

      const entries = Reflect.getMetadata(CLASS_PIPELINE_METADATA, TestClass);

      expect(entries).toEqual([InjectableMiddleware]);
    });

    it('should store mixed entries (class types and instances)', () => {
      const instance = new StubMiddleware();

      @UsePipeline(InjectableMiddleware, instance)
      class TestClass {}

      const entries = Reflect.getMetadata(CLASS_PIPELINE_METADATA, TestClass);

      expect(entries).toEqual([InjectableMiddleware, instance]);
    });
  });

  describe('UsePipeline (method decorator)', () => {
    it('should store middleware entries as method metadata', () => {
      const instance = new StubMiddleware();

      class TestClass {
        @UsePipeline(instance)
        execute(): void {}
      }

      const entries = Reflect.getMetadata(METHOD_PIPELINE_METADATA, TestClass.prototype, 'execute');

      expect(entries).toEqual([instance]);
    });

    it('should store class types as method entries', () => {
      class TestClass {
        @UsePipeline(InjectableMiddleware)
        execute(): void {}
      }

      const entries = Reflect.getMetadata(METHOD_PIPELINE_METADATA, TestClass.prototype, 'execute');

      expect(entries).toEqual([InjectableMiddleware]);
    });

    it('should store separate metadata per method', () => {
      const instance1 = new StubMiddleware();
      const instance2 = new StubMiddleware();

      class TestClass {
        @UsePipeline(instance1)
        method1(): void {}

        @UsePipeline(instance2)
        method2(): void {}
      }

      const entries1 = Reflect.getMetadata(
        METHOD_PIPELINE_METADATA,
        TestClass.prototype,
        'method1',
      );
      const entries2 = Reflect.getMetadata(
        METHOD_PIPELINE_METADATA,
        TestClass.prototype,
        'method2',
      );

      expect(entries1).toEqual([instance1]);
      expect(entries2).toEqual([instance2]);
    });
  });

  describe('UsePipeline (class + method combined)', () => {
    it('should store class and method metadata independently', () => {
      const classInstance = new StubMiddleware();
      const methodInstance = new StubMiddleware();

      @UsePipeline(classInstance)
      class TestClass {
        @UsePipeline(methodInstance)
        execute(): void {}
      }

      const classEntries = Reflect.getMetadata(CLASS_PIPELINE_METADATA, TestClass);
      const methodEntries = Reflect.getMetadata(
        METHOD_PIPELINE_METADATA,
        TestClass.prototype,
        'execute',
      );

      expect(classEntries).toEqual([classInstance]);
      expect(methodEntries).toEqual([methodInstance]);
    });
  });

  describe('UseModulePipeline', () => {
    it('should store middleware entries as module metadata', () => {
      const instance = new StubMiddleware();

      @UseModulePipeline(instance)
      class TestModule {}

      const entries = Reflect.getMetadata(MODULE_PIPELINE_METADATA, TestModule);

      expect(entries).toEqual([instance]);
    });

    it('should store class types as module entries', () => {
      @UseModulePipeline(InjectableMiddleware)
      class TestModule {}

      const entries = Reflect.getMetadata(MODULE_PIPELINE_METADATA, TestModule);

      expect(entries).toEqual([InjectableMiddleware]);
    });
  });

  describe('PipelineModuleDecorator', () => {
    it('should store pipeline metadata on the module', () => {
      @PipelineModuleDecorator({
        pipeline: [InjectableMiddleware],
      })
      class TestModule {}

      const entries = Reflect.getMetadata(MODULE_PIPELINE_METADATA, TestModule);

      expect(entries).toEqual([InjectableMiddleware]);
    });

    it('should not set pipeline metadata when pipeline is empty', () => {
      @PipelineModuleDecorator({
        pipeline: [],
      })
      class TestModule {}

      const entries = Reflect.getMetadata(MODULE_PIPELINE_METADATA, TestModule);

      expect(entries).toBeUndefined();
    });

    it('should not set pipeline metadata when pipeline is omitted', () => {
      @PipelineModuleDecorator({})
      class TestModule {}

      const entries = Reflect.getMetadata(MODULE_PIPELINE_METADATA, TestModule);

      expect(entries).toBeUndefined();
    });
  });
});
