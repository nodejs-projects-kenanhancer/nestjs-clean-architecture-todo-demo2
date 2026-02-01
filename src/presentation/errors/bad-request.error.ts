import { PresentationErrorCode } from './error-codes';
import { PresentationError } from './presentation.error';

export class BadRequestError extends PresentationError {
  constructor(message: string, field?: string) {
    super(PresentationErrorCode.BAD_REQUEST, message, { field });
  }
}
