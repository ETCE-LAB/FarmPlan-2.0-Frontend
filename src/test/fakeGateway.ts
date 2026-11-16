import { vi } from 'vitest';
import { INITIAL_FARMS, INITIAL_FIELDS } from '@farm/data/mockData';
import type { SessionUser } from '@farm/lib/api/auth';
import { toApiFarm, toApiFieldInput } from '@farm/lib/api/farms';
import { polygonAreaM2 } from '@farm/lib/geo';
import type { Polygon } from 'geojson';

/*
 * In-memory stand-in for the FarmPlan gateway (`/api/v1`, backend commit 990a964), installed as
 * `fetch` in every test. It mirrors the behavior the frontend relies on: bearer checks, the refresh
 * cookie, direct camelCase resources, paginated lists, independent fields, PATCH merges, 204 deletes,
 * and the `{ error: { code, message, details } }` envelope.
 */

export const TEST_TOKEN = 'test-token';
export const TEST_USER: SessionUser = {
  id: 'user-test',
  email: 'anna@example.org',
  displayName: 'Anna Test',
  accountType: 'user',
};
export const TEST_PASSWORD = 'correct horse battery';

type Json = Record<string, unknown>;

interface RecordedRequest {
  method: string;
  path: string;
  body: unknown;
}

interface Account {
  user: SessionUser;
  password: string;
}

const FARM_KEYS = new Set(['name', 'location', 'climateZone', 'boundary', 'notes', 'contact']);
const FIELD_KEYS = new Set([
  'name',
  'geometry',
  'excludedZones',
  'soilType',
  'soilPh',
  'cropType',
  'irrigation',
  'autoSpacing',
]);

class FakeGateway {
  farms = new Map<string, Json>();
  fields = new Map<string, Json>();
  accounts: Account[] = [];
  /** Access token → user ID. */
  tokens = new Map<string, string>();
  /** User ID whose refresh cookie the "browser" currently holds. */
  refreshCookie: string | null = null;
  requests: RecordedRequest[] = [];
  private failures: { status: number; details: string[]; path?: string }[] = [];
  private counter = 0;

  reset() {
    this.farms.clear();
    this.fields.clear();
    this.requests = [];
    this.failures = [];
    this.counter = 0;
    this.accounts = [{ user: TEST_USER, password: TEST_PASSWORD }];
    this.tokens = new Map([[TEST_TOKEN, TEST_USER.id]]);
    this.refreshCookie = null;
    const now = new Date().toISOString();
    for (const farm of INITIAL_FARMS) {
      this.farms.set(
        farm.id,
        withBoundaryMetrics({
          id: farm.id,
          ...toApiFarm(farm),
          boundary: null,
          createdAt: farm.createdAt,
          updatedAt: now,
        }),
      );
    }
    for (const field of INITIAL_FIELDS) {
      if (!field.geometry) continue;
      this.fields.set(
        field.id,
        this.fieldResource(field.farmId, field.id, toApiFieldInput({ ...field, geometry: field.geometry })),
      );
    }
  }

  /**
   * The next request (or the next one whose path ends with `path`) answers with this status and
   * optional validation detail codes.
   */
  failNext(status: number, details: string[] = [], path?: string) {
    this.failures.push({ status, details, path });
  }

  /** Invalidates all access tokens, as if they had expired. */
  expireTokens() {
    this.tokens.clear();
  }

  private revokeSessions(userId: string) {
    for (const [token, owner] of this.tokens) if (owner === userId) this.tokens.delete(token);
    if (this.refreshCookie === userId) this.refreshCookie = null;
  }

  writes() {
    return this.requests.filter((r) => r.method !== 'GET');
  }

  fieldsOf(farmId: string) {
    return [...this.fields.values()].filter((f) => f.farmId === farmId);
  }

  private issue(account: Account) {
    this.counter += 1;
    const token = `token-${this.counter}`;
    this.tokens.set(token, account.user.id);
    if (account.user.accountType === 'user') this.refreshCookie = account.user.id;
    return {
      accessToken: token,
      tokenType: 'bearer',
      expiresIn: 3600,
      user: { ...account.user, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    };
  }

  private fieldResource(farmId: string, id: string, data: Json): Json {
    const now = new Date().toISOString();
    const previous = this.fields.get(id);
    return {
      excludedZones: null,
      soilType: null,
      soilPh: null,
      cropType: null,
      irrigation: 'none',
      autoSpacing: false,
      ...previous,
      ...data,
      id,
      farmId,
      areaM2: polygonAreaM2(((data.geometry ?? previous?.geometry) as Polygon) ?? null),
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };
  }

  private invalidField(data: Json | undefined, partial: boolean) {
    if (!data || Object.keys(data).some((k) => !FIELD_KEYS.has(k))) return true;
    if (!partial && (!data.name || !data.geometry)) return true;
    return data.soilType === '' || (partial && Object.keys(data).length === 0);
  }

  fetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost');
    const method = (init.method ?? 'GET').toUpperCase();
    const body = typeof init.body === 'string' ? (JSON.parse(init.body) as Json) : undefined;
    const path = url.pathname;
    this.requests.push({ method, path, body });

    const index = this.failures.findIndex((f) => !f.path || path.endsWith(f.path));
    if (index >= 0) {
      const [failure] = this.failures.splice(index, 1);
      return error(failure.status, failure.details);
    }

    if (path === '/api/v1/auth/login' && method === 'POST') {
      const match = this.accounts.find((a) => a.user.email === body?.email && a.password === body?.password);
      return match ? json(200, this.issue(match)) : error(401);
    }
    if (path === '/api/v1/auth/register' && method === 'POST') {
      const email = String(body?.email ?? '');
      if (String(body?.password ?? '').length < 12 || !email.includes('@') || !body?.displayName) return error(422);
      if (this.accounts.some((a) => a.user.email === email)) return error(409);
      const created: Account = {
        user: {
          id: `user-${this.accounts.length + 1}`,
          email,
          displayName: String(body.displayName),
          accountType: 'user',
        },
        password: String(body.password),
      };
      this.accounts.push(created);
      return json(201, this.issue(created));
    }
    if (path === '/api/v1/auth/guest' && method === 'POST') {
      const guest: Account = {
        user: { id: `guest-${this.accounts.length + 1}`, email: '', displayName: 'Guest', accountType: 'guest' },
        password: '',
      };
      this.accounts.push(guest);
      // Like the gateway: a guest session never keeps another account's refresh cookie.
      this.refreshCookie = null;
      return json(200, this.issue(guest));
    }
    if (path === '/api/v1/auth/refresh' && method === 'POST') {
      const account = this.accounts.find((a) => a.user.id === this.refreshCookie);
      return account ? json(200, this.issue(account)) : error(401);
    }
    if (path === '/api/v1/auth/logout' && method === 'POST') {
      this.refreshCookie = null;
      return new Response(null, { status: 204 });
    }

    const token = new Headers(init.headers).get('Authorization')?.replace(/^Bearer /, '');
    const userId = token ? this.tokens.get(token) : undefined;
    const account = this.accounts.find((a) => a.user.id === userId);
    if (!account) return error(401);
    if (account.user.accountType === 'guest' && /^\/api\/v1\/(farms|fields)/.test(path)) return error(403);

    if (path === '/api/v1/modules' && method === 'GET') {
      const guest = account.user.accountType === 'guest';
      return json(200, {
        modules: ['analysis', 'catalog', 'farms', 'media', 'planning'].map((id) => {
          const availableToGuest = id === 'catalog' || id === 'planning';
          return { id, enabled: true, availableToGuest, accessible: !guest || availableToGuest };
        }),
      });
    }
    if (path === '/api/v1/users/me') {
      if (account.user.accountType === 'guest' && method !== 'GET') return error(403);
      if (method === 'GET') return json(200, account.user);
      if (method === 'PATCH') {
        const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';
        if (!displayName || Object.keys(body!).length !== 1) return error(422);
        account.user = { ...account.user, displayName };
        return json(200, { ...account.user, createdAt: '2026-01-01T00:00:00Z', updatedAt: new Date().toISOString() });
      }
      if (method === 'DELETE') {
        // Like the identity service: farms are not removed together with the account.
        this.accounts = this.accounts.filter((a) => a !== account);
        this.revokeSessions(account.user.id);
        return new Response(null, { status: 204 });
      }
    }
    if (path === '/api/v1/users/me/password' && method === 'POST') {
      if (body?.currentPassword !== account.password) return error(401);
      if (String(body?.newPassword ?? '').length < 12) return error(422);
      account.password = String(body.newPassword);
      // Like the identity service: every access token and refresh session of the user is revoked.
      this.revokeSessions(account.user.id);
      return new Response(null, { status: 204 });
    }

    if (path === '/api/v1/farms') {
      if (method === 'GET') return json(200, page([...this.farms.values()], url));
      if (method === 'POST') {
        if (!body?.name || Object.keys(body).some((k) => !FARM_KEYS.has(k))) return error(422);
        const now = new Date().toISOString();
        const farm = {
          location: '',
          climateZone: '',
          boundary: null,
          notes: '',
          contact: null,
          ...body,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        const created = withBoundaryMetrics(farm);
        this.farms.set(farm.id, created);
        return json(201, created);
      }
    }

    const farmMatch = /^\/api\/v1\/farms\/([^/:]+)$/.exec(path);
    if (farmMatch) {
      const id = decodeURIComponent(farmMatch[1]);
      const existing = this.farms.get(id);
      if (!existing) return error(404);
      if (method === 'GET') return json(200, existing);
      if (method === 'PATCH') {
        if (!body || Object.keys(body).some((k) => !FARM_KEYS.has(k))) return error(422);
        const merged = withBoundaryMetrics({ ...existing, ...body, updatedAt: new Date().toISOString() });
        this.farms.set(id, merged);
        return json(200, merged);
      }
      if (method === 'DELETE') {
        this.farms.delete(id);
        for (const field of this.fieldsOf(id)) this.fields.delete(String(field.id));
        return new Response(null, { status: 204 });
      }
    }

    const fieldsMatch = /^\/api\/v1\/farms\/([^/:]+)\/fields(:bulk)?$/.exec(path);
    if (fieldsMatch) {
      const farmId = decodeURIComponent(fieldsMatch[1]);
      if (!this.farms.has(farmId)) return error(404);
      if (method === 'GET' && !fieldsMatch[2]) return json(200, page(this.fieldsOf(farmId), url));
      if (method === 'POST' && !fieldsMatch[2]) {
        if (this.invalidField(body, false)) return error(422);
        const field = this.fieldResource(farmId, crypto.randomUUID(), body!);
        this.fields.set(String(field.id), field);
        return json(201, field);
      }
      if (method === 'POST') {
        const items = body?.items as Json[] | undefined;
        if (!items?.length || items.some((item) => this.invalidField(item, false))) return error(422);
        const created = items.map((item) => this.fieldResource(farmId, crypto.randomUUID(), item));
        for (const field of created) this.fields.set(String(field.id), field);
        return json(201, { items: created });
      }
    }

    const fieldMatch = /^\/api\/v1\/fields\/([^/]+)$/.exec(path);
    if (fieldMatch) {
      const id = decodeURIComponent(fieldMatch[1]);
      const existing = this.fields.get(id);
      if (!existing) return error(404);
      if (method === 'GET') return json(200, existing);
      if (method === 'PATCH') {
        if (this.invalidField(body, true)) return error(422);
        const field = this.fieldResource(String(existing.farmId), id, body!);
        this.fields.set(id, field);
        return json(200, field);
      }
      if (method === 'DELETE') {
        this.fields.delete(id);
        return new Response(null, { status: 204 });
      }
    }

    return error(404);
  };
}

/** Approximates the server's WGS84 metrics: planar area helper and a haversine perimeter. */
function withBoundaryMetrics(farm: Json): Json {
  const boundary = farm.boundary as Polygon | null;
  if (!boundary) return { ...farm, boundaryAreaM2: null, boundaryPerimeterM: null };
  const ring = boundary.coordinates[0];
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  let perimeter = 0;
  for (let i = 1; i < ring.length; i += 1) {
    const [lng1, lat1] = ring[i - 1];
    const [lng2, lat2] = ring[i];
    const a =
      Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
    perimeter += 2 * 6_371_008.8 * Math.asin(Math.sqrt(a));
  }
  return { ...farm, boundaryAreaM2: polygonAreaM2(boundary), boundaryPerimeterM: perimeter };
}

function page(items: Json[], url: URL) {
  const pageNumber = Number(url.searchParams.get('page') ?? 1);
  const pageSize = Number(url.searchParams.get('pageSize') ?? 20);
  if (pageSize > 100) throw new Error('pageSize above the gateway limit');
  return {
    items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    total: items.length,
    page: pageNumber,
    pageSize,
  };
}

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
}

function error(status: number, details: string[] = []) {
  return json(status, {
    error: {
      code: `http_${status}`,
      message: 'Request failed.',
      details: details.map((code) => ({ path: 'body', code, message: 'Invalid value.' })),
    },
  });
}

export const gateway = new FakeGateway();

export function installFakeGateway() {
  gateway.reset();
  vi.stubGlobal('fetch', gateway.fetch);
}
