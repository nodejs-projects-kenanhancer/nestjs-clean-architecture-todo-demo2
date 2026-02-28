import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';

import { DomainError } from '@domain/errors';
import { GraphQLError } from 'graphql';

import { ErrorResponseStrategyFactory } from '../strategies';
import { BaseExceptionFilter } from './base-exception.filter';

@Catch(DomainError)
export class DomainExceptionFilter extends BaseExceptionFilter implements ExceptionFilter {
  protected readonly logger = new Logger(DomainExceptionFilter.name);

  constructor(strategyFactory: ErrorResponseStrategyFactory) {
    super(strategyFactory);
  }

  catch(exception: DomainError, host: ArgumentsHost): void | GraphQLError {
    return this.handleException(exception, host, 'warn');
  }
}
