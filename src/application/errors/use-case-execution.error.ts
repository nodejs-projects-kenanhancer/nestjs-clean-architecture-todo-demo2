import { ApplicationError } from './application.error';
import { ApplicationErrorCode } from './error-codes';

export class UseCaseExecutionError extends ApplicationError {
  constructor(useCaseName: string, message: string) {
    super(
      ApplicationErrorCode.USE_CASE_EXECUTION_FAILED,
      `Error executing ${useCaseName}: ${message}`,
      {
        useCaseName,
      },
    );
  }
}
