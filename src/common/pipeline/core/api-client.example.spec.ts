import { IMiddleware } from './middleware';
import { Pipeline } from './pipeline';

// Front-end style usage: the core has no NestJS or reflect-metadata, so the same Pipeline can
// wrap an API client. Order (outer → inner): auth → correlation id → retry → error mapping → log.

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(`API request failed with status ${status}`);
  }
}

type FetchJson = (url: string, init?: RequestInit) => Promise<unknown>;

function createFetchJson(fetchFn: typeof fetch): FetchJson {
  return async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
    const response = await fetchFn(url, init);
    if (!response.ok) {
      throw new HttpError(response.status);
    }
    return response.json();
  };
}

function withHeader(init: RequestInit | undefined, name: string, value: string): RequestInit {
  const headers = new Headers(init?.headers);
  headers.set(name, value);
  return { ...init, headers };
}

const auth = (token: string): IMiddleware<FetchJson> => ({
  handle: async (ctx, next): Promise<unknown> => {
    const [url, init] = ctx.args;
    ctx.args = [url, withHeader(init, 'authorization', `Bearer ${token}`)];
    return next();
  },
});

const correlationId = (newId: () => string): IMiddleware<FetchJson> => ({
  handle: async (ctx, next): Promise<unknown> => {
    const [url, init] = ctx.args;
    const id = newId();
    ctx.metadata.set('correlationId', id);
    ctx.args = [url, withHeader(init, 'x-correlation-id', id)];
    return next();
  },
});

const retry = (attempts: number): IMiddleware<FetchJson> => ({
  handle: async (_ctx, next): Promise<unknown> => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await next();
      } catch (error) {
        if (attempt >= attempts || !(error instanceof ApiError && error.retryable)) {
          throw error;
        }
      }
    }
  },
});

const mapErrors: IMiddleware<FetchJson> = {
  handle: async (_ctx, next) => {
    try {
      return await next();
    } catch (error) {
      if (error instanceof HttpError) {
        throw new ApiError(error.status, error.status >= 500);
      }
      throw error;
    }
  },
};

const log = (lines: string[]): IMiddleware<FetchJson> => ({
  handle: async (ctx, next): Promise<unknown> => {
    const prefix = `${ctx.target} ${ctx.args[0]} [${String(ctx.metadata.get('correlationId'))}]`;
    try {
      const result = await next();
      lines.push(`${prefix} ok`);
      return result;
    } catch (error) {
      lines.push(`${prefix} ${(error as Error).message}`);
      throw error;
    }
  },
});

function fakeFetch(statuses: number[]): { fetchFn: typeof fetch; requests: Headers[] } {
  const requests: Headers[] = [];
  const fetchFn = (async (_url: string, init?: RequestInit) => {
    requests.push(new Headers(init?.headers));
    const status = statuses.shift() ?? 200;
    return new Response(JSON.stringify({ status }), { status });
  }) as typeof fetch;
  return { fetchFn, requests };
}

describe('API client pipeline (front-end example)', () => {
  const apiClient = (lines: string[]): Pipeline<FetchJson> =>
    new Pipeline<FetchJson>().use(
      auth('t0k3n'),
      correlationId(() => 'c-1'),
      retry(3),
      mapErrors,
      log(lines),
    );

  it('should retry a 503 with the same auth and correlation headers', async () => {
    const { fetchFn, requests } = fakeFetch([503, 200]);
    const lines: string[] = [];

    const body = await apiClient(lines).execute(createFetchJson(fetchFn), '/todos');

    expect(body).toEqual({ status: 200 });
    expect(requests.map(h => [h.get('authorization'), h.get('x-correlation-id')])).toEqual([
      ['Bearer t0k3n', 'c-1'],
      ['Bearer t0k3n', 'c-1'],
    ]);
    expect(lines).toEqual(['fetchJson /todos [c-1] HTTP 503', 'fetchJson /todos [c-1] ok']);
  });

  it('should map a 404 to a non-retryable ApiError without retrying', async () => {
    const { fetchFn, requests } = fakeFetch([404]);
    const lines: string[] = [];

    const request = apiClient(lines).execute(createFetchJson(fetchFn), '/todos/42');

    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({ status: 404, retryable: false });
    expect(requests).toHaveLength(1);
  });
});
