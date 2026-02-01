import { PresentationError } from './presentation.error';
import { PresentationErrorCode } from './error-codes';

export class BadRequestError extends PresentationError {
  constructor(message: string, field?: string) {
    super(PresentationErrorCode.BAD_REQUEST, message, { field });
  }
}
