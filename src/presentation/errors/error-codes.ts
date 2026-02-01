/**
 * Presentation Layer Error Codes
 *
 * These codes represent presentation/API level errors - bad requests,
 * invalid input format, authentication/authorization issues at the API level, etc.
 */
export enum PresentationErrorCode {
  /**
   * Request is malformed or contains invalid data
   */
  BAD_REQUEST = 'BAD_REQUEST',

  /**
   * Request input format is invalid (e.g., invalid JSON, wrong content type)
   */
  INVALID_INPUT_FORMAT = 'INVALID_INPUT_FORMAT',

  /**
   * Required request parameter is missing
   */
  MISSING_PARAMETER = 'MISSING_PARAMETER',

  /**
   * Generic presentation error for unspecified request issues
   */
  PRESENTATION_ERROR = 'PRESENTATION_ERROR',
}
