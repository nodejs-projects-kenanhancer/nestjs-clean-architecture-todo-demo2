import { Injectable, Logger } from '@nestjs/common';

import { Context, IMiddleware, NextFunction } from '@common/pipeline';

/** Logs every pipelined call with its duration; a failure is logged and rethrown unchanged. */
@Injectable()
export class LoggingMiddleware implements IMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);

  async handle(ctx: Context, next: NextFunction): Promise<unknown> {
    const startedAt = Date.now();
    this.logger.log(`→ ${ctx.target}`);

    try {
      const result = await next();
      this.logger.log(`← ${ctx.target} (${Date.now() - startedAt} ms)`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`✗ ${ctx.target} failed after ${Date.now() - startedAt} ms: ${message}`);
      throw error;
    }
  }
}
