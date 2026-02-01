import { Injectable } from '@nestjs/common';
import { EntryPoint } from '../../../core/types';
import {
  ErrorResponseStrategy,
  ErrorResponse,
  RestErrorResponse,
  GraphQLErrorResponse,
  KafkaErrorResponse,
} from './error-response.strategy';
import { RestErrorResponseStrategy } from './rest-error-response.strategy';
import { GraphQLErrorResponseStrategy } from './graphql-error-response.strategy';
import { KafkaErrorResponseStrategy } from './kafka-error-response.strategy';

@Injectable()
export class ErrorResponseStrategyFactory {
  constructor(
    private readonly restStrategy: RestErrorResponseStrategy,
    private readonly graphqlStrategy: GraphQLErrorResponseStrategy,
    private readonly kafkaStrategy: KafkaErrorResponseStrategy,
  ) {}

  getStrategy(entryPoint: EntryPoint): ErrorResponseStrategy<ErrorResponse> {
    switch (entryPoint) {
      case EntryPoint.REST:
        return this.restStrategy;
      case EntryPoint.GRAPHQL:
        return this.graphqlStrategy;
      case EntryPoint.KAFKA:
        return this.kafkaStrategy;
      default:
        return this.restStrategy;
    }
  }

  getRestStrategy(): ErrorResponseStrategy<RestErrorResponse> {
    return this.restStrategy;
  }

  getGraphQLStrategy(): ErrorResponseStrategy<GraphQLErrorResponse> {
    return this.graphqlStrategy;
  }

  getKafkaStrategy(): ErrorResponseStrategy<KafkaErrorResponse> {
    return this.kafkaStrategy;
  }
}
