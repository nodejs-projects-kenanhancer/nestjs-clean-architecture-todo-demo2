import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';

import { PresentationError } from '@presentation/errors';
import { GraphQLError } from 'graphql';

import { ErrorResponseStrategyFactory } from '../strategies';
import { BaseExceptionFilter } from './base-exception.filter';

@Catch(PresentationError)
export class PresentationExceptionFilter extends BaseExceptionFilter implements ExceptionFilter {
  protected readonly logger = new Logger(PresentationExceptionFilter.name);

  constructor(strategyFactory: ErrorResponseStrategyFactory) {
    super(strategyFactory);
  }

  catch(exception: PresentationError, host: ArgumentsHost): void | GraphQLError {
    return this.handleException(exception, host, 'warn');
  }
}
