import { DomainError } from './domain.error';
import { DomainErrorCode } from './error-codes';

export class TodoValidationError extends DomainError {
  constructor(message: string, field?: string) {
    super(DomainErrorCode.TODO_VALIDATION_FAILED, message, { field });
  }
}
