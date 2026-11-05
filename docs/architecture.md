# Architecture

This document separates the **current state**, verified against the code on November 5, 2026, from the **target**. Decisions are recorded in [ADRs](decisions/README.md).

## Current state

### Runtime and build

- Single-page application: React 19, React Router 8 in declarative mode (`BrowserRouter`, `<Routes>`), TypeScript in strict mode, Vite 8 with `@vitejs/plugin-react` and `@tailwindcss/vite`.
- No server-side rendering. `npm run build` produces static files in `dist/`; the `Dockerfile` serves them with nginx, falling back to `index.html` for client-side routes (`nginx.conf`).
- Dev server on port 3000; `/api` is proxied to `http://localhost:8000` (`vite.config.ts`). No code calls the API yet.
- Import alias `@farm/*` for `src/*`.

### Data

There is **no backend integration**. Farms, fields, and planting plans live in `useFarmStore` (Zustand with `persist`) under the `localStorage` key `farmplan-storage`, versioned through `STORE_VERSION` with migrations. Initial data comes from `src/data/mockData.ts`, shaped like the expected API. Placeholder values are marked with `DemoBadge` in the UI. Backups export and import all data as JSON validated with zod.

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
| `/farms`           | `FarmListPage`    | eager   |
| `/farms/new`       | `FarmCreatePage`  | lazy    |
| `/farms/:farmId`   | `FarmDetailPage`  | lazy    |
| `/plants`          | `PlantsPage`      | eager   |
| `/plants/:plantId` | `PlantDetailPage` | eager   |
| `/settings`        | `SettingsPage`    | eager   |
| `*`                | `NotFoundPage`    | eager   |

The two map pages are lazy so Leaflet and Geoman (about 570 kB) stay out of the main bundle. An `ErrorBoundary` keyed by path wraps all routes.

### Code layout

| Path                    | Responsibility                                                          |
| ----------------------- | ----------------------------------------------------------------------- |
| `src/pages`             | One default-exported page per route                                     |
| `src/components/ui`     | Building blocks: `Card`, `Button`, form fields, `Badge`                 |
| `src/components/shared` | App frame: `Sidebar`, `TopBar`, `PageHeader`, dialogs, toasts           |
| `src/components/<area>` | Feature components: `overview`, `farms`, `map`, `plants`                |
| `src/lib`               | Pure logic with tests: geometry, treelines, GeoJSON, backup, formatting |
| `src/store`             | `useFarmStore`, `useUiStore`, migrations, undo                          |
| `src/types`             | Domain types; geometries as GeoJSON                                     |
| `src/i18n`              | i18next setup, German and English locales                               |
| `src/config`            | Navigation entries                                                      |

### Cross-cutting

- **Theme:** light, dark, or system. `index.html` sets the `dark` class before first paint; `src/theme.ts` keeps it in sync. Dark mode overrides token variables only.
- **i18n:** German reference, English type-checked against it; the language lives in the store.
- **Accessibility:** WCAG 2.1 AA target; token contrast is tested; axe runs in component tests.
- **Quality gates:** `npm run check` (Prettier, oxlint, typecheck, Vitest) and `npm run build` run locally. There is no CI and no Playwright suite yet.

## Target

- **Backend integration:** all domain data comes from the FarmPlan API gateway ([ETCE-LAB/FarmPlan-2.0-Backend](https://github.com/ETCE-LAB/FarmPlan-2.0-Backend)) through one API client with zod-validated responses ([ADR 0004](decisions/0004-api-contracts-and-error-handling.md)). Server data moves to a data-fetching layer; Zustand keeps device and UI state ([ADR 0003](decisions/0003-client-state-and-data-fetching.md)).
- **Authentication:** login and session handling against the backend Identity service, with protected routes. Token storage is an open decision.
- **Third-party data** (soil, weather, solar, geocoding, plant images) through backend adapters, not direct browser calls.
- **Planning:** plant templates, crop placement, and optimizer results on the map, restoring the legacy capabilities listed in the [parity inventory](legacy-feature-parity.md).
- **Delivery:** CI on every PR, branch protection, semantic-release from `main`, and the image built for Docker Compose and Helm ([ADR 0006](decisions/0006-quality-gates-and-dev-promotion.md)).
