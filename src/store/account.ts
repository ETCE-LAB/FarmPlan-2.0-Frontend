import * as accountApi from '@farm/lib/api/account';
import { login, logoutSession } from '@farm/lib/api/auth';
import type { ApiResult } from '@farm/lib/api/client';
import * as farmsApi from '@farm/lib/api/farms';
import * as farmSync from './farmSync';
import { refreshAccessToken, useSessionStore } from './useSessionStore';

/*
 * Account actions for the signed-in user. They coordinate the session with the gateway's identity
 * rules: a password change revokes every session, and deleting the account does not delete farms.
 */

const session = () => useSessionStore.getState().session;

export async function saveDisplayName(displayName: string): Promise<ApiResult<void>> {
  const result = await accountApi.updateProfile(displayName);
  if (!result.ok) return result;
  const current = session();
  if (current) useSessionStore.getState().setSession({ ...current, user: result.data });
  return { ok: true, data: undefined };
}

/**
 * Changes the password. The server revokes all sessions afterwards, so the user is signed in again
 * with the new password; `reauthenticated` is false if that failed and the user was signed out.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ApiResult<{ reauthenticated: boolean }>> {
  const email = session()?.user.email;
  // A 401 from this endpoint means "wrong current password", so make sure the token itself is fresh.
  if (!email || !(await refreshAccessToken())) {
    useSessionStore.getState().logout('expired');
    return { ok: false, error: 'unauthenticated' };
  }
  const result = await accountApi.changePassword(currentPassword, newPassword);
  if (!result.ok) return result;

  const renewed = await login(email, newPassword);
  if (renewed.ok) useSessionStore.getState().setSession(renewed.data);
  else useSessionStore.getState().logout('expired');
  return { ok: true, data: { reauthenticated: renewed.ok } };
}

/**
 * Deletes all farms (with their fields) and then the account. The identity service does not remove
 * farm data, so farms go first; if one cannot be deleted, the account is kept and nothing is lost silently.
 */
export async function deleteAccountAndData(): Promise<ApiResult<void>> {
  const owner = session()?.user.id;
  if (!owner) return { ok: false, error: 'unauthenticated' };
  const farms = await farmsApi.listFarms(owner);
  if (!farms.ok) return farms;
  for (const farm of farms.data) {
    const deleted = await farmSync.deleteFarm(farm.id);
    if (!deleted.ok) return deleted;
  }
  const result = await accountApi.deleteAccount();
  if (!result.ok) return result;
  // Clears the refresh cookie; the server already removed the sessions together with the account.
  await logoutSession();
  useSessionStore.getState().logout();
  return { ok: true, data: undefined };
}
