import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { InfrastructureError } from '../../errors';
import { ErrorResponseStrategyFactory } from '../strategies';
import { BaseExceptionFilter } from './base-exception.filter';

@Catch(InfrastructureError)
export class InfrastructureExceptionFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  protected readonly logger = new Logger(InfrastructureExceptionFilter.name);

  constructor(strategyFactory: ErrorResponseStrategyFactory) {
    super(strategyFactory);
  }

  catch(exception: InfrastructureError, host: ArgumentsHost): void | GraphQLError {
    return this.handleException(exception, host, 'error');
  }
}
