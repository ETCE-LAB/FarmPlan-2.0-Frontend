# Architecture

This document separates the **current state**, verified against the code on November 10, 2026, from the **target**. Decisions are recorded in [ADRs](decisions/README.md).

## Current state

### Runtime and build

- Single-page application: React 19, React Router 8 in declarative mode (`BrowserRouter`, `<Routes>`), TypeScript in strict mode, Vite 8 with `@vitejs/plugin-react` and `@tailwindcss/vite`.
- No server-side rendering. `npm run build` produces static files in `dist/`; the `Dockerfile` serves them with nginx, falling back to `index.html` for client-side routes (`nginx.conf`).
- Dev server on port 3000; `/api` is proxied to `http://localhost:8000` (`vite.config.ts`), the backend gateway from `docker compose -f infra/compose.yaml up` in the backend repository.
- Import alias `@farm/*` for `src/*`.

### Data

**Backend-connected:** authentication, account management, guest sessions, module access, and farms with their fields and boundary ([ADR 0007](decisions/0007-session-and-server-data-sync.md)).

- `src/lib/api/client.ts` is the only place that calls `fetch`: base URL from `VITE_API_BASE_URL` (default `/api`), a 10-second timeout, abort signals, typed error codes, and zod validation of every response. `auth.ts`, `account.ts`, `modules.ts`, and `farms.ts` in `src/lib/api` map the gateway contract (`/api/v1/auth/*`, `/api/v1/users/me`, `/api/v1/modules`, `/api/v1/farms`, `/api/v1/farms/{id}/fields`, `/api/v1/fields/{id}`, backend `990a964`) to the frontend types. Paginated lists are read completely with `fetchAllPages`.
- `useSessionStore` keeps the access token and profile in memory only. At startup `restoreSession()` renews the session through the gateway's `HttpOnly` refresh cookie; a `401` triggers one refresh and a retry, and signs the user out if that fails. It also holds the account's module access from `/api/v1/modules`, which the sidebar uses to hide pages the account cannot use. `src/store/account.ts` coordinates profile, password, and account deletion with the session.
- `useFarmStore` holds farms and fields as a non-persisted cache of the server state; `src/store/farmSync.ts` loads them when the signed-in user changes and performs every write. Fields are a server resource; field edits are applied optimistically and sent as single requests, serialized per farm. New fields keep a temporary ID until the server's UUID arrives.

**Still demo data:** planting plans (persisted in `localStorage` under `farmplan-storage`, `STORE_VERSION` 2, together with language, theme, base layer, and the active farm), the plant catalog (`src/data/mockData.ts`), soil lookup, and yield chart. Placeholder values are marked with `DemoBadge`. Backups download the loaded farms and fields as JSON and import a backup into the account as new farms.

### Data flow

```text
          URL (React Router): /farms/:farmId?field=…   /plants?…&sort=…   ?q=… (search)
                      │ useParams / useSearchParam
┌────────────┐  ┌─────▼──────┐   selectors    ┌───────────────────────────┐
│ src/lib    │◄─│ pages/     │◄───────────────│ useFarmStore (Zustand)    │──► localStorage
│ pure logic │  │ components/│──── actions ──►│ farms · fields · plans    │    (versioned)
└────────────┘  └─────┬──────┘                │ language · theme · layer  │
                      │ showToast / confirmAction └───────────────────────┘
                ┌─────▼──────┐
                │ useUiStore │  toasts · confirm dialog · mobile sidebar
                └────────────┘
```

### Routes

| Path               | Page              | Loading |
| ------------------ | ----------------- | ------- |
| `/`                | `OverviewPage`    | eager   |
| `/login`           | `LoginPage`       | eager   |
| `/farms`           | `FarmListPage`    | eager   |
| `/farms/new`       | `FarmCreatePage`  | lazy    |
| `/farms/:farmId`   | `FarmDetailPage`  | lazy    |
| `/plants`          | `PlantsPage`      | eager   |
| `/plants/:plantId` | `PlantDetailPage` | eager   |
| `/settings`        | `SettingsPage`    | eager   |
| `*`                | `NotFoundPage`    | eager   |

The three `/farms` routes require an account (`RequireAuth`) and redirect to `/login?from=…` otherwise; the redirect target is restricted to app paths. The two map pages are lazy so Leaflet and Geoman (about 570 kB) stay out of the main bundle; the farm map in the hardiness zone legend (`FarmZoneMap`) is loaded the same way, only when the legend opens. An `ErrorBoundary` keyed by path wraps all routes.

### Code layout

| Path                    | Responsibility                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `src/pages`             | One default-exported page per route                                                |
| `src/components/ui`     | Building blocks: `Card`, `Button`, form fields, `Badge`                            |
| `src/components/shared` | App frame: `Sidebar`, `TopBar`, `PageHeader`, dialogs, toasts                      |
| `src/components/<area>` | Feature components: `overview`, `farms`, `map`, `plants`                           |
| `src/lib`               | Pure logic with tests: geometry, treelines, GeoJSON, backup, formatting            |
| `src/lib/api`           | API client, gateway contracts, and response schemas                                |
| `src/store`             | `useFarmStore`, `useSessionStore`, `useUiStore`, `farmSync`, `account`, migrations |
| `src/types`             | Domain types; geometries as GeoJSON                                                |
| `src/i18n`              | i18next setup, German and English locales                                          |
| `src/config`            | Navigation entries                                                                 |

### Cross-cutting

- **Theme:** light, dark, or system. `index.html` sets the `dark` class before first paint; `src/theme.ts` keeps it in sync. Dark mode overrides token variables only.
- **i18n:** German reference, English type-checked against it; the language lives in the store.
- **Accessibility:** WCAG 2.1 AA target; token contrast is tested; axe runs in component tests.
- **Quality gates:** `npm run check` (Prettier, oxlint, typecheck, Vitest) and `npm run build` run locally. There is no CI and no Playwright suite yet.

## Target

- **Backend integration:** all domain data comes from the FarmPlan API gateway; today this is true for farms and fields only ([ETCE-LAB/FarmPlan-2.0-Backend](https://github.com/ETCE-LAB/FarmPlan-2.0-Backend)) through one API client with zod-validated responses ([ADR 0004](decisions/0004-api-contracts-and-error-handling.md)). Server data moves to a data-fetching layer; Zustand keeps device and UI state ([ADR 0003](decisions/0003-client-state-and-data-fetching.md)).
- **Authentication:** login, registration, guest sessions, session refresh, server-side logout, protected routes, and account management exist. Guest sessions end with the page, because the gateway issues no refresh cookie for them.
- **Third-party data** (soil, weather, solar, geocoding, plant images) through backend adapters, not direct browser calls.
- **Planning:** plant templates, crop placement, and optimizer results on the map, restoring the legacy capabilities listed in the [parity inventory](legacy-feature-parity.md).
- **Delivery:** CI on every PR, branch protection, semantic-release from `main`, and the image built for Docker Compose and Helm ([ADR 0006](decisions/0006-quality-gates-and-dev-promotion.md)).
