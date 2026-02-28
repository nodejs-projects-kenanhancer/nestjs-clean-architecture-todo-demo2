import { BaseError, ErrorContext } from '@core/errors';

export abstract class PresentationError extends BaseError {
  constructor(code: string, message: string, context?: ErrorContext) {
    super(code, message, context);
  }

  get layer(): string {
    return 'PRESENTATION';
  }
}
