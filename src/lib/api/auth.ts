import { z } from 'zod';
import { apiRequest, noContent, type ApiResult } from './client';

/*
 * Gateway auth contract
 * return `{ accessToken, tokenType, expiresIn, user }`. The refresh credential is an HttpOnly cookie
 * scoped to `/api/v1/auth`; it never appears in JSON and the frontend never reads it.
 */

export type AccountType = 'user' | 'guest';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  accountType: AccountType;
}

export interface Session {
  token: string;
  user: SessionUser;
}

export const sessionUserSchema = z.object({
  id: z.string().min(1),
  email: z.string(),
  displayName: z.string(),
  accountType: z.enum(['user', 'guest']),
});

const authResponseSchema = z
  .object({
    accessToken: z.string().min(1),
    tokenType: z.string(),
    expiresIn: z.number(),
    user: sessionUserSchema,
  })
  .transform((auth): Session => ({
    token: auth.accessToken,
    user: {
      id: auth.user.id,
      email: auth.user.email,
      displayName: auth.user.displayName,
      accountType: auth.user.accountType,
    },
  }));

const authPost = (path: string, body?: unknown): Promise<ApiResult<Session>> =>
  apiRequest(`/v1/auth/${path}`, { method: 'POST', body, schema: authResponseSchema, auth: false });

export const login = (email: string, password: string) => authPost('login', { email, password });

export const register = (email: string, password: string, displayName: string) =>
  authPost('register', { email, password, displayName });

/** Starts a guest session: no account, no refresh cookie, limited to the guest modules. */
export const guestSession = () => authPost('guest');

/** Renews the session from the refresh cookie (rotates it on the server). */
export const refreshSession = () => authPost('refresh');

/** Revokes the refresh session and clears its cookie; idempotent without a cookie. */
export const logoutSession = () => apiRequest('/v1/auth/logout', { method: 'POST', schema: noContent, auth: false });
