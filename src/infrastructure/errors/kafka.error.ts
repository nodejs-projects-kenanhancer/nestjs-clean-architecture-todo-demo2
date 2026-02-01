import { InfrastructureErrorCode } from './error-codes';
import { InfrastructureError } from './infrastructure.error';

export class KafkaError extends InfrastructureError {
  constructor(operation: string, message: string) {
    super(InfrastructureErrorCode.KAFKA_ERROR, `Kafka error during ${operation}: ${message}`, {
      operation,
    });
  }
}
