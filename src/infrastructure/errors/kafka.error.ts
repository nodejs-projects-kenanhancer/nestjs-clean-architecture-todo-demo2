import { InfrastructureError } from './infrastructure.error';
import { InfrastructureErrorCode } from './error-codes';

export class KafkaError extends InfrastructureError {
  constructor(operation: string, message: string) {
    super(InfrastructureErrorCode.KAFKA_ERROR, `Kafka error during ${operation}: ${message}`, {
      operation,
    });
  }
}
