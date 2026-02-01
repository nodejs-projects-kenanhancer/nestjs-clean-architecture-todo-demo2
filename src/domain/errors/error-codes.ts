/**
 * Domain Layer Error Codes
 *
 * These codes represent business domain errors - violations of business rules,
 * entity not found, invalid state transitions, etc.
 */
export enum DomainErrorCode {
  /**
   * A requested todo entity was not found in the system
   */
  TODO_NOT_FOUND = 'TODO_NOT_FOUND',

  /**
   * Todo validation failed - invalid title, description, or other properties
   */
  TODO_VALIDATION_FAILED = 'TODO_VALIDATION_FAILED',

  /**
   * Invalid todo status value or invalid status transition
   */
  INVALID_TODO_STATUS = 'INVALID_TODO_STATUS',

  /**
   * Generic domain error for unspecified domain rule violations
   */
  DOMAIN_ERROR = 'DOMAIN_ERROR',
}
