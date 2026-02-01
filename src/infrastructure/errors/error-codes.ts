/**
 * Infrastructure Layer Error Codes
 *
 * These codes represent technical/infrastructure errors - database failures,
 * message broker issues, external service failures, etc.
 */
export enum InfrastructureErrorCode {
  /**
   * Database operation failed
   */
  DATABASE_ERROR = 'DATABASE_ERROR',

  /**
   * Database connection failed or timed out
   */
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',

  /**
   * Kafka operation failed
   */
  KAFKA_ERROR = 'KAFKA_ERROR',

  /**
   * Kafka connection failed or broker unavailable
   */
  KAFKA_CONNECTION_FAILED = 'KAFKA_CONNECTION_FAILED',

  /**
   * External service call failed
   */
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  /**
   * Generic infrastructure error for unspecified technical failures
   */
  INFRASTRUCTURE_ERROR = 'INFRASTRUCTURE_ERROR',
}
