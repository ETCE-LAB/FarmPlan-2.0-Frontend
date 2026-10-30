# FarmPlan 2.0 – Frontend

Web app for planning agroforestry farms: map fields, plan treelines and browse the plant catalog.

React 19 · TypeScript (strict) · Vite 8 · Tailwind CSS v4 · Zustand · react-i18next · Leaflet + Geoman

## Quick Start

Requires Node.js 20.19+ or 22.12+ (Vite 8).

```bash
npm install
npm run dev          # http://localhost:3000, /api is proxied to http://localhost:8000
```

| Script             | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| `npm run dev`      | Dev server with HMR                                            |
| `npm run build`    | Typecheck and production build to `dist/`                      |
| `npm run preview`  | Serve the production build locally                             |
| `npm run check`    | Prettier, oxlint, typecheck and Vitest – run before you commit |
| `npm run test`     | Unit and component tests (Vitest, jsdom)                       |
| `npm run test:e2e` | Playwright (once: `npx playwright install chromium`)           |
| `npm run format`   | Format all files with Prettier                                 |

## Status

There is no backend yet. Farms, fields and planting plans live in `localStorage` (`farmplan-storage`);
placeholder values are marked as **demo data** in the UI.

The app is being migrated from the previous FarmPlan V2 prototype in small steps.
Already available:

- App shell with sidebar, top bar, global search, light/dark/system theme and German/English
- Overview dashboard: key figures, field inventory, soil lookup and yield chart
- Undo for destructive actions, confirm dialog, toasts, error boundary

Coming next: plant catalog, farm list, map editor (draw fields, GeoJSON import/export),
farm details with treeline preview, settings with backup/restore and end-to-end tests.

## Project Structure

| Path                    | Contents                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `src/pages`             | One file per route                                                                    |
| `src/components/ui`     | Building blocks: `Card`, `Button`/`buttonClass`, form fields, `Badge`                 |
| `src/components/shared` | App frame: Sidebar, TopBar, PageHeader, ErrorBoundary, dialog, toasts                 |
| `src/components/*`      | Feature components, grouped by page (e.g. `overview`)                                 |
| `src/config`            | Navigation entries                                                                    |
| `src/lib`               | Pure logic: geometry, agronomy, formatting, URL state                                 |
| `src/store`             | `useFarmStore` (persisted, versioned migrations), `useUiStore` (toasts, dialog, menu) |
| `src/types`             | Domain types; geometries are GeoJSON                                                  |
| `src/i18n`              | Translations; `en.ts` is type-checked against `de.ts`                                 |
| `src/data/mockData.ts`  | Demo data shaped like the future API                                                  |
| `src/test`              | Vitest setup and test helpers                                                         |

Imports use the `@farm/*` alias for `src/*`.

## Configuration

| Variable            | Default | Purpose                 |
| ------------------- | ------- | ----------------------- |
| `VITE_API_BASE_URL` | `/api`  | Base URL of the backend |

Vite reads it at build time, so set it in `.env` or the build environment.

## Docker

The image builds the app and serves `dist/` with nginx, including the fallback to `index.html` for client-side routes.

```bash
docker build -t farmplan-frontend --build-arg VITE_API_BASE_URL=https://api.example.com .
docker run -p 8080:80 farmplan-frontend   # http://localhost:8080
```

## Conventions

- **Colors** only via the design tokens in `src/index.css` (`bg-surface`, `text-ink-soft`, `text-brand-fg` …),
  no hex values or raw palettes like `slate-600`. Dark mode only overrides the variables under `.dark`;
  `src/styles/contrast.test.ts` checks every token pair against WCAG AA in both themes.
- **Text** only via `t('…')`. Add new keys to `de.ts` first; TypeScript then requires them in `en.ts`.
- **Coordinates**: Leaflet uses `[lat, lng]`, storage uses GeoJSON `[lng, lat]` – convert only through `src/lib/geo.ts`.
- **URL state** via `useSearchParam`; use `useUpdateSearchParams` to change several parameters at once.
- **Store schema changed?** Bump `STORE_VERSION` in `src/store/migrations.ts` and add a migration.
- **Headings**: `h1` comes from `PageHeader`, card titles are `h2`.

## License

[AGPL-3.0](LICENSE)
