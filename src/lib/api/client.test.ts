import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { useSessionStore } from '@farm/store/useSessionStore';
import { gateway } from '@farm/test/fakeGateway';
import { apiRequest, fetchAllPages, noContent, statusToError } from './client';

const schema = z.object({ value: z.number() });
const respond = (status: number, body?: unknown) =>
  vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));

describe('apiRequest', () => {
  afterEach(() => vi.useRealTimers());

  it('sends the session token and validates the response', async () => {
    const fetchMock = respond(200, { value: 1 });
    vi.stubGlobal('fetch', fetchMock);
    await expect(apiRequest('/v1/x', { schema })).resolves.toEqual({ ok: true, data: { value: 1 } });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/x');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer test-token');
  });

  it('serializes JSON bodies', async () => {
    const fetchMock = respond(200, { value: 1 });
    vi.stubGlobal('fetch', fetchMock);
    await apiRequest('/v1/x', { method: 'POST', body: { a: 1 }, schema });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.body).toBe('{"a":1}');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });

  it('omits the token when auth is disabled', async () => {
    const fetchMock = respond(200, { value: 1 });
    vi.stubGlobal('fetch', fetchMock);
    await apiRequest('/v1/x', { schema, auth: false });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).has('Authorization')).toBe(false);
  });

  it('rejects responses that do not match the schema', async () => {
    vi.stubGlobal('fetch', respond(200, { value: 'nope' }));
    await expect(apiRequest('/v1/x', { schema })).resolves.toEqual({
      ok: false,
      error: 'invalidResponse',
      status: 200,
    });
  });

  it('rejects non-JSON bodies', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>', { status: 200 })),
    );
    await expect(apiRequest('/v1/x', { schema })).resolves.toMatchObject({ ok: false, error: 'invalidResponse' });
  });

  it('renews an expired token once via the refresh cookie and retries', async () => {
    gateway.refreshCookie = 'user-test';
    gateway.expireTokens();
    const result = await apiRequest('/v1/farms?page=1&pageSize=1', { schema: z.object({ total: z.number() }) });
    expect(result).toEqual({ ok: true, data: { total: 2 } });
    expect(gateway.requests.map((r) => r.path)).toEqual(['/api/v1/farms', '/api/v1/auth/refresh', '/api/v1/farms']);
    expect(useSessionStore.getState().session?.token).toMatch(/^token-/);
  });

  it('shares one refresh between concurrent requests', async () => {
    gateway.refreshCookie = 'user-test';
    gateway.expireTokens();
    const schema = z.object({ total: z.number() });
    await Promise.all([apiRequest('/v1/farms', { schema }), apiRequest('/v1/farms', { schema })]);
    expect(gateway.requests.filter((r) => r.path === '/api/v1/auth/refresh')).toHaveLength(1);
  });

  it('logs out when the session cannot be renewed', async () => {
    gateway.expireTokens();
    await expect(apiRequest('/v1/farms', { schema })).resolves.toMatchObject({
      ok: false,
      error: 'unauthenticated',
      status: 401,
    });
    expect(useSessionStore.getState()).toMatchObject({ session: null, expired: true });
  });

  it('does not refresh requests without auth', async () => {
    vi.stubGlobal('fetch', respond(401));
    await apiRequest('/v1/x', { schema, auth: false });
    expect(useSessionStore.getState().session).not.toBeNull();
  });

  it('reads detail codes from the error envelope', async () => {
    vi.stubGlobal(
      'fetch',
      respond(422, {
        error: {
          code: 'validation_failed',
          message: 'x',
          details: [{ path: 'geometry', code: 'self_intersecting', message: 'x' }],
        },
      }),
    );
    await expect(apiRequest('/v1/x', { schema })).resolves.toEqual({
      ok: false,
      error: 'validation',
      status: 422,
      details: ['self_intersecting'],
    });
  });

  it('accepts empty 204 responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    await expect(apiRequest('/v1/x', { method: 'DELETE', schema: noContent })).resolves.toEqual({
      ok: true,
      data: undefined,
    });
  });

  it('reports network failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('offline'))),
    );
    await expect(apiRequest('/v1/x', { schema })).resolves.toEqual({ ok: false, error: 'network' });
  });

  it('times out slow requests', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_, reject) =>
            init.signal!.addEventListener('abort', () => reject(new DOMException('', 'AbortError'))),
          ),
      ),
    );
    const pending = apiRequest('/v1/x', { schema, timeoutMs: 50 });
    await vi.advanceTimersByTimeAsync(60);
    await expect(pending).resolves.toEqual({ ok: false, error: 'timeout' });
  });

  it('distinguishes caller cancellation from timeouts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_, reject) =>
            init.signal!.addEventListener('abort', () => reject(new DOMException('', 'AbortError'))),
          ),
      ),
    );
    const controller = new AbortController();
    const pending = apiRequest('/v1/x', { schema, signal: controller.signal });
    controller.abort();
    await expect(pending).resolves.toEqual({ ok: false, error: 'aborted' });
  });
});

describe('statusToError', () => {
  it.each([
    [400, 'validation'],
    [403, 'forbidden'],
    [404, 'notFound'],
    [409, 'conflict'],
    [422, 'validation'],
    [429, 'rateLimited'],
    [500, 'server'],
    [502, 'unavailable'],
    [503, 'unavailable'],
  ] as const)('maps %i to %s', (status, code) => {
    expect(statusToError(status)).toBe(code);
  });
});

describe('fetchAllPages', () => {
  it('follows pages until all items are read', async () => {
    const all = Array.from({ length: 230 }, (_, i) => ({ n: i }));
    const fetchMock = vi.fn(async (url: string) => {
      const params = new URL(url, 'http://localhost').searchParams;
      const page = Number(params.get('page'));
      const size = Number(params.get('pageSize'));
      return new Response(JSON.stringify({ items: all.slice((page - 1) * size, page * size), total: all.length }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await fetchAllPages('/v1/things', z.object({ n: z.number() }));
    expect(result.ok && result.data).toHaveLength(230);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
