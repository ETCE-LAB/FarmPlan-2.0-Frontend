import { apiRequest, noContent, type ApiResult } from './client';
import { sessionUserSchema, type SessionUser } from './auth';

/*
 * Account endpoints of the gateway (backend commit 990a964), all with the bearer token:
 * PATCH /users/me (display name), POST /users/me/password (204), DELETE /users/me (204).
 */

const userResponseSchema = sessionUserSchema.transform((user): SessionUser => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  accountType: user.accountType,
}));

export const updateProfile = (displayName: string): Promise<ApiResult<SessionUser>> =>
  apiRequest('/v1/users/me', { method: 'PATCH', body: { displayName }, schema: userResponseSchema });

/** A wrong current password answers 401, which must not be read as an expired session. */
export const changePassword = (currentPassword: string, newPassword: string) =>
  apiRequest('/v1/users/me/password', {
    method: 'POST',
    body: { currentPassword, newPassword },
    schema: noContent,
    sessionOn401: false,
  });

export const deleteAccount = () => apiRequest('/v1/users/me', { method: 'DELETE', schema: noContent });
