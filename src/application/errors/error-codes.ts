/**
 * Application Layer Error Codes
 *
 * These codes represent application/use case level errors - validation failures,
 * use case execution errors, authorization failures, etc.
 */
export enum ApplicationErrorCode {
  /**
   * Input validation failed - one or more fields have invalid values
   */
  VALIDATION_FAILED = 'VALIDATION_FAILED',

  /**
   * Use case execution failed due to an unexpected error
   */
  USE_CASE_EXECUTION_FAILED = 'USE_CASE_EXECUTION_FAILED',

  /**
   * Generic application error for unspecified application failures
   */
  APPLICATION_ERROR = 'APPLICATION_ERROR',
}
