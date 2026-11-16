import { create } from 'zustand';
import { configureApiAuth } from '@farm/lib/api/client';
import { logoutSession, refreshSession, type Session } from '@farm/lib/api/auth';
import { listModules, type ModuleAccess, type ModuleId } from '@farm/lib/api/modules';

/*
 * Session handling per ADR 0007: the access token is kept in memory only. After a reload the session
 * is restored through the gateway's HttpOnly refresh cookie, which scripts cannot read. Guest
 * sessions have no refresh cookie and end with the page.
 */

/** `restoring` until the startup refresh has answered; protected routes wait for it. */
export type SessionStatus = 'restoring' | 'ready';

interface SessionState {
  session: Session | null;
  status: SessionStatus;
  /** Set when the backend rejected the session, so the login page can explain why. */
  expired: boolean;
  /** Module access for the signed-in account from `/v1/modules`; null while unknown. */
  modules: ModuleAccess[] | null;
  setSession: (session: Session) => void;
  /** Clears the local session only; use `signOut()` to also revoke it on the server. */
  logout: (reason?: 'expired') => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  session: null,
  status: 'restoring',
  expired: false,
  modules: null,
  setSession: (session) =>
    set((state) => ({
      session,
      status: 'ready',
      expired: false,
      // Token refreshes keep the module list; a different account starts without one.
      modules: state.session?.user.id === session.user.id ? state.modules : null,
    })),
  logout: (reason) => set({ session: null, status: 'ready', expired: reason === 'expired', modules: null }),
}));

export const useSessionUser = () => useSessionStore((s) => s.session?.user ?? null);

/**
 * Whether the module may be offered in the UI. Unknown (signed out, or not loaded yet) counts as
 * accessible: protected routes still ask for a login, and the backend enforces access either way.
 */
export const isModuleAccessible = (modules: ModuleAccess[] | null, module: ModuleId | undefined) =>
  !module || !modules || modules.some((m) => m.id === module && m.accessible);

/** Loads module access for the current account; failures leave it unknown. */
export async function loadModules(signal?: AbortSignal) {
  const userId = useSessionStore.getState().session?.user.id;
  if (!userId) return;
  const result = await listModules(signal);
  if (result.ok && useSessionStore.getState().session?.user.id === userId) {
    useSessionStore.setState({ modules: result.data });
  }
}

let pendingRefresh: Promise<string | null> | null = null;

/** Renews the access token; concurrent callers share one request because the server rotates the cookie. */
export function refreshAccessToken(): Promise<string | null> {
  pendingRefresh ??= refreshSession()
    .then((result) => {
      if (!result.ok) return null;
      useSessionStore.getState().setSession(result.data);
      return result.data.token;
    })
    .finally(() => {
      pendingRefresh = null;
    });
  return pendingRefresh;
}

/** Called once at startup: resumes a signed-in session from the refresh cookie, if there is one. */
export async function restoreSession() {
  // Version 1 kept the token in sessionStorage; never leave it behind.
  sessionStorage.removeItem('farmplan-session');
  const token = await refreshAccessToken();
  if (!token && useSessionStore.getState().status === 'restoring') useSessionStore.setState({ status: 'ready' });
}

/** Revokes the refresh session on the server and clears local state, even if the server is unreachable. */
export async function signOut() {
  await logoutSession();
  useSessionStore.getState().logout();
}

configureApiAuth({
  getToken: () => useSessionStore.getState().session?.token ?? null,
  refresh: refreshAccessToken,
  onUnauthorized: () => useSessionStore.getState().logout('expired'),
});
