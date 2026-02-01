import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';

import { GraphQLError } from 'graphql';

import { ApplicationError } from '../../../application/errors';
import { ErrorResponseStrategyFactory } from '../strategies';
import { BaseExceptionFilter } from './base-exception.filter';

@Catch(ApplicationError)
export class ApplicationExceptionFilter extends BaseExceptionFilter implements ExceptionFilter {
  protected readonly logger = new Logger(ApplicationExceptionFilter.name);

  constructor(strategyFactory: ErrorResponseStrategyFactory) {
    super(strategyFactory);
  }

  catch(exception: ApplicationError, host: ArgumentsHost): void | GraphQLError {
    return this.handleException(exception, host, 'warn');
  }
}
