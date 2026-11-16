import { z } from 'zod';

/** Error codes double as i18n keys under `api.errors.<code>`. */
export type ApiErrorCode =
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'unauthenticated'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'validation'
  | 'rateLimited'
  | 'unavailable'
  | 'server'
  | 'invalidResponse';

export type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: ApiErrorCode;
      status?: number;
      /** Machine-readable detail codes from the gateway error envelope, e.g. `outside_farm_boundary`. */
      details?: string[];
    };

export type ApiFailure = Extract<ApiResult<unknown>, { ok: false }>;

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');
export const DEFAULT_TIMEOUT_MS = 10_000;

interface AuthHooks {
  getToken: () => string | null;
  /** Obtains a new access token via the refresh cookie; `null` if the session cannot be renewed. */
  refresh: () => Promise<string | null>;
  onUnauthorized: () => void;
}

let authHooks: AuthHooks = { getToken: () => null, refresh: async () => null, onUnauthorized: () => {} };

/** Wired up by the session store; keeps this module free of store imports. */
export function configureApiAuth(hooks: AuthHooks) {
  authHooks = hooks;
}

export interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  schema: z.ZodType<T>;
  /** Send the session's bearer token. Defaults to true. */
  auth?: boolean;
  /**
   * Treat a 401 as an expired session: refresh once, retry, and sign out if that fails. Defaults to true.
   * Disable it for endpoints that answer 401 for other reasons, such as a wrong current password.
   */
  sessionOn401?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export function statusToError(status: number): ApiErrorCode {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 422) return 'validation';
  if (status === 429) return 'rateLimited';
  if (status === 502 || status === 503 || status === 504) return 'unavailable';
  return 'server';
}

/** `{ error: { code, message, details: [{ path, code, message }] } }`; read leniently, it only refines messages. */
const errorEnvelopeSchema = z.object({
  error: z.object({ details: z.array(z.object({ code: z.string() })).catch([]) }),
});

async function readErrorDetails(response: Response): Promise<string[]> {
  try {
    const parsed = errorEnvelopeSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.error.details.map((d) => d.code) : [];
  } catch {
    return [];
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions<T>): Promise<ApiResult<T>> {
  const { auth = true, sessionOn401 = true } = options;
  const token = auth ? authHooks.getToken() : null;
  const first = await send(path, options, token);
  if (!(first.status === 401 && token && sessionOn401)) return first.result;

  // Access tokens are short-lived: renew once via the refresh cookie and retry.
  const renewed = await authHooks.refresh();
  if (!renewed) {
    authHooks.onUnauthorized();
    return first.result;
  }
  const second = await send(path, options, renewed);
  if (second.status === 401) authHooks.onUnauthorized();
  return second.result;
}

async function send<T>(
  path: string,
  { method = 'GET', body, schema, signal, timeoutMs = DEFAULT_TIMEOUT_MS }: RequestOptions<T>,
  token: string | null,
): Promise<{ result: ApiResult<T>; status?: number }> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', forwardAbort, { once: true });

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'same-origin',
        signal: controller.signal,
      });
    } catch {
      if (timedOut) return { result: { ok: false, error: 'timeout' } };
      if (controller.signal.aborted) return { result: { ok: false, error: 'aborted' } };
      return { result: { ok: false, error: 'network' } };
    }

    const { status } = response;
    if (!response.ok) {
      const details = await readErrorDetails(response);
      return {
        status,
        result: { ok: false, error: statusToError(status), status, ...(details.length ? { details } : {}) },
      };
    }

    let json: unknown = undefined;
    if (status !== 204) {
      try {
        json = await response.json();
      } catch {
        return { status, result: { ok: false, error: 'invalidResponse', status } };
      }
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) return { status, result: { ok: false, error: 'invalidResponse', status } };
    return { status, result: { ok: true, data: parsed.data } };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

/** Schema for empty `204 No Content` responses. */
export const noContent = z.undefined();

/** Reads every page of a `{ items, total, page, pageSize }` collection. */
export async function fetchAllPages<T>(
  path: string,
  itemSchema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<ApiResult<T[]>> {
  const pageSchema = z.object({ items: z.array(itemSchema), total: z.number().int().nonnegative() });
  const pageSize = 100;
  const items: T[] = [];
  for (let page = 1; ; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const result = await apiRequest(`${path}${separator}page=${page}&pageSize=${pageSize}`, {
      schema: pageSchema,
      signal,
    });
    if (!result.ok) return result;
    items.push(...result.data.items);
    if (result.data.items.length < pageSize || items.length >= result.data.total) return { ok: true, data: items };
  }
}
