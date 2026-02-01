import { ApplicationError } from './application.error';
import { ApplicationErrorCode } from './error-codes';

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export class ApplicationValidationError extends ApplicationError {
  public readonly errors: ValidationErrorDetail[];

  constructor(errors: ValidationErrorDetail[]) {
    super(ApplicationErrorCode.VALIDATION_FAILED, 'Validation failed', { errors });
    this.errors = errors;
  }
}
