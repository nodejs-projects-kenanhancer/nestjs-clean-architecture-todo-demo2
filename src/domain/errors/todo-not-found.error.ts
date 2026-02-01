import { DomainError } from './domain.error';
import { DomainErrorCode } from './error-codes';

export class TodoNotFoundError extends DomainError {
  constructor(todoId: string) {
    super(DomainErrorCode.TODO_NOT_FOUND, `Todo with id '${todoId}' was not found`, {
      todoId,
    });
  }
}
