# ADR 0007: Session handling and server data sync

- **Status:** Accepted
- **Date:** November 10, 2026
- **Supersedes in part:** [ADR 0003](0003-client-state-and-data-fetching.md) (data-fetching layer for farms and fields), open token question of [ADR 0004](0004-api-contracts-and-error-handling.md)

## Context

The backend gateway (`ETCE-LAB/FarmPlan-2.0-Backend`, commit `990a964`) offers registration, login, guest sessions, refresh, and logout under `/api/v1/auth`, farm CRUD under `/api/v1/farms`, and fields as an independent resource under `/api/v1/farms/{farmId}/fields` and `/api/v1/fields/{id}`. Auth responses return a one-hour access token (`{ accessToken, tokenType, expiresIn, user }`); the refresh credential is an `HttpOnly`, `SameSite=Strict` cookie scoped to `/api/v1/auth` and rotated on every refresh. Farm and field routes require a bearer token; guests may not use them. Lists are paginated (`{ items, total, page, pageSize }`, at most 100 per page), `PATCH` is partial, `DELETE` answers `204`, and errors use `{ error: { code, message, details } }`. The server assigns UUIDs and computes field areas; it validates geometry topology and rejects unknown properties.

## Decision

- **Token storage:** the access token lives in memory only (`useSessionStore`, not persisted). At startup `restoreSession()` calls `POST /auth/refresh`; the browser sends the refresh cookie, which scripts cannot read. Protected routes show a waiting state until that answers. A `401` on an authenticated request triggers one shared refresh and a single retry; if the refresh fails, the session is cleared and the login page explains why. Logging out calls `POST /auth/logout` to revoke the refresh session.
- **Protected routes:** `/farms`, `/farms/new`, `/farms/:farmId`, and `/account` require an account (`RequireAuth`). The overview, plant catalog, and settings stay public. Guests see an explanation instead of these pages.
- **Guest sessions and modules:** the login page offers `POST /auth/guest`. Guests start on the overview, farms are not loaded for them, and the session ends with the page. After sign-in the frontend loads `GET /modules` and hides navigation entries whose module is not accessible; unknown access (signed out, not loaded, request failed) hides nothing, because the backend enforces access anyway.
- **Account management:** `/account` changes the display name (`PATCH /users/me`), the password (`POST /users/me/password`), and deletes the account (`DELETE /users/me`). The password endpoint answers `401` for a wrong current password, so this request opts out of the session refresh (`sessionOn401: false`) after the token has been refreshed explicitly. The server revokes every session on a password change; the frontend signs in again with the new password. Account deletion first deletes all farms, because the identity service does not remove farm data; if a farm cannot be deleted, the account is kept.
- **Server data in Zustand:** farms and fields stay in `useFarmStore` as a non-persisted cache of the server state with `farmsStatus` and `farmsError`. `src/store/farmSync.ts` is the only writer: it loads all pages of farms and each farm's fields when the signed-in user changes (not on token refresh), clears on logout, and wraps every mutation. No new dependency (TanStack Query) is added for now.
- **Write strategy:** creating a farm, saving master data, and deleting a farm wait for the server. A new farm's fields are created in one atomic `fields:bulk` import; if it fails, the farm is deleted again. Field edits (drawing, attributes, exclusion zones) are applied locally first and sent as single `POST`/`PATCH`/`DELETE` requests; writes per farm are serialized in the order they were made. New fields carry a temporary client ID until the server answers; `farmSync` then swaps in the UUID (fields and plan references) and resolves the temporary ID for queued writes and the selected field in the URL. A failed write shows an error toast, naming geometry rejections such as `self_intersecting` or `outside_farm_boundary`, and reloads the server state. Several new fields (GeoJSON import) go in one atomic `fields:bulk` request. The farm boundary is applied locally first and saved with `PATCH /farms/{id}`; area and perimeter come from the server, and a rejected boundary (for example one that does not cover every field) is restored to the previous one.
- **Undo:** field changes keep undo by sending the difference between the current and the previous local state. A restored deleted field is created again and gets a new server ID. Deleting a farm has no undo, because the gateway has no soft delete; the confirmation dialog says so.
- **Local data:** `STORE_VERSION` 2 no longer persists farms and fields; device settings and demo plans are kept. Backups (also from version 1) are imported into the account as new farms. The session token of an earlier development state (`sessionStorage` key `farmplan-session`) is removed at startup.
- **Dev proxy:** the Vite proxy keeps the browser's `Host` header (`changeOrigin: false`), because the gateway's auth routes reject requests whose `Origin` does not match the request authority.

## Consequences

- Reloading keeps a signed-in account signed in for the refresh cookie's lifetime (30 days on the server); guest sessions have no refresh cookie and end with the page.
- The access token is never in web storage, but any script running in the page can still use it while the page is open, so XSS protection (no HTML rendering of user or API data) remains essential.
- The refresh cookie is rotated on each refresh. Two tabs refreshing at the same moment can invalidate each other's cookie and sign one tab out; one shared refresh per tab limits this within a tab only.
- Concurrent edits from two tabs or devices to the same field overwrite each other (last write wins) until the backend offers optimistic concurrency (for example `updatedAt` preconditions).
- Fields embedded in legacy farm documents are not exposed by the gateway's public farm resource and are therefore not shown; the backend does not migrate them.
- Deleting an account from another client than this frontend leaves farms behind until the backend removes them itself.

## Open questions

- Whether to move server data to TanStack Query once more resources (catalog, plans) are connected.
- Production deployment: the frontend and the gateway must share one origin for the refresh cookie and the Origin check.
