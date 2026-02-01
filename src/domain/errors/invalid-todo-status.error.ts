import { DomainError } from './domain.error';
import { DomainErrorCode } from './error-codes';

export class InvalidTodoStatusError extends DomainError {
  constructor(status: string) {
    super(DomainErrorCode.INVALID_TODO_STATUS, `'${status}' is not a valid todo status`, {
      status,
    });
  }
}
