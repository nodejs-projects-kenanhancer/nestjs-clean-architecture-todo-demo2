import { BaseError, ErrorContext } from '@core/errors';

export abstract class DomainError extends BaseError {
  constructor(code: string, message: string, context?: ErrorContext) {
    super(code, message, context);
  }

  get layer(): string {
    return 'DOMAIN';
  }
}
