import { InfrastructureErrorCode } from './error-codes';
import { InfrastructureError } from './infrastructure.error';

export class DatabaseError extends InfrastructureError {
  constructor(operation: string, message: string) {
    super(
      InfrastructureErrorCode.DATABASE_ERROR,
      `Database error during ${operation}: ${message}`,
      {
        operation,
      },
    );
  }
}
