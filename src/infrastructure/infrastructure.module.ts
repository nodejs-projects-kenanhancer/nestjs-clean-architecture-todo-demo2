import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { TODO_REPOSITORY } from '@domain/repositories';

import {
  ApplicationExceptionFilter,
  DomainExceptionFilter,
  GlobalExceptionFilter,
  InfrastructureExceptionFilter,
  PresentationExceptionFilter,
} from './exception-handling/filters';
import {
  ErrorResponseStrategyFactory,
  GraphQLErrorResponseStrategy,
  KafkaErrorResponseStrategy,
  RestErrorResponseStrategy,
} from './exception-handling/strategies';
import { KafkaService } from './messaging/kafka';
import { InMemoryTodoRepository } from './persistence/repositories';

const strategies = [
  RestErrorResponseStrategy,
  GraphQLErrorResponseStrategy,
  KafkaErrorResponseStrategy,
  ErrorResponseStrategyFactory,
];

// Register filters in order: most specific to least specific
// NestJS processes filters in reverse order of registration
const filters = [
  { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  { provide: APP_FILTER, useClass: PresentationExceptionFilter },
  { provide: APP_FILTER, useClass: InfrastructureExceptionFilter },
  { provide: APP_FILTER, useClass: ApplicationExceptionFilter },
  { provide: APP_FILTER, useClass: DomainExceptionFilter },
];

@Global()
@Module({
  providers: [
    {
      provide: TODO_REPOSITORY,
      useClass: InMemoryTodoRepository,
    },
    KafkaService,
    ...strategies,
    ...filters,
  ],
  exports: [TODO_REPOSITORY, KafkaService, ...strategies],
})
export class InfrastructureModule {}
