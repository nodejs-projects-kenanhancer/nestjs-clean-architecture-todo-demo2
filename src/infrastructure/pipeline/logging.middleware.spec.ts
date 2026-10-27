import { Logger } from '@nestjs/common';

import { Pipeline } from '@common/pipeline';

import { LoggingMiddleware } from './logging.middleware';

describe('LoggingMiddleware', () => {
  const logs: string[] = [];

  beforeEach(() => {
    logs.length = 0;
    for (const level of ['log', 'warn'] as const) {
      jest
        .spyOn(Logger.prototype, level)
        .mockImplementation((message: unknown, ..._optionalParams: unknown[]) => {
          logs.push(`${level}: ${String(message)}`);
        });
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const pipeline = (): Pipeline =>
    new Pipeline().use(new LoggingMiddleware()).withTarget('CreateTodoUseCase.execute');

  it('should log the start and the end of a call and return its result', async () => {
    const result = await pipeline().execute(async (title: string) => `created:${title}`, 'milk');

    expect(result).toBe('created:milk');
    expect(logs).toEqual([
      'log: → CreateTodoUseCase.execute',
      expect.stringMatching(/^log: ← CreateTodoUseCase\.execute \(\d+ ms\)$/),
    ]);
  });

  it('should log a failure and rethrow the same error', async () => {
    const error = new Error('Title must be at least 1 character(s)');

    await expect(
      pipeline().execute(async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(logs).toEqual([
      'log: → CreateTodoUseCase.execute',
      expect.stringMatching(
        /^warn: ✗ CreateTodoUseCase\.execute failed after \d+ ms: Title must be at least 1 character\(s\)$/,
      ),
    ]);
  });
});
