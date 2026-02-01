export interface ErrorContext {
  [key: string]: unknown;
}

export abstract class BaseError extends Error {
  public readonly timestamp: Date;
  public readonly context?: ErrorContext;

  constructor(
    public readonly code: string,
    message: string,
    context?: ErrorContext,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }

  abstract get layer(): string;

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      layer: this.layer,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
    };
  }
}
