# Development and checks

## Requirements

Node.js 20.19+ or 22.12+ (required by Vite 8) and npm. Docker is optional, for the production image.

## Commands

| Command            | Purpose                                                             | Status                                                  |
| ------------------ | ------------------------------------------------------------------- | ------------------------------------------------------- |
| `npm install`      | Install dependencies                                                | available                                               |
| `npm run dev`      | Dev server on http://localhost:3000; `/api` → http://localhost:8000 | available                                               |
| `npm run check`    | `prettier --check`, `oxlint`, `tsc -b`, `vitest run`                | available                                               |
| `npm run build`    | `tsc -b` and `vite build` to `dist/`                                | available                                               |
| `npm run test`     | Vitest once; `npm run test:watch` in watch mode                     | available                                               |
| `npm run format`   | Format all files with Prettier                                      | available                                               |
| `npm run preview`  | Serve `dist/` locally                                               | available                                               |
| `npm run test:e2e` | Playwright                                                          | **not set up**: no `playwright.config.ts` or `e2e/` yet |

To work against the real backend, start it from the backend repository with `docker compose -f infra/compose.yaml up --build`; the dev server proxies `/api` to it and keeps the browser's `Host` header, which the gateway's auth Origin check requires. Register an account on `/login` to use the farm pages; a reload keeps you signed in through the refresh cookie.

`npm run check` and `npm run build` must pass before every commit, push for review, and merge, as described in [CONTRIBUTING.md](../CONTRIBUTING.md). Prettier also checks Markdown, so documentation changes are covered by the gate.

## Verified results

On November 16, 2026, on branch `feat/implementBackend`: `npm run check` passed with 26 test files and 309 tests; `npm run build` passed. The recorded farm and field list fixtures and the frontend's farm, boundary, and field request bodies were validated against the gateway's pydantic models (backend `990a964`); the account bodies were checked against the model source by reading it; no run against the Compose stack at that backend revision. Re-run and update these numbers when they change; an earlier run is not evidence for later edits.

## Tests

| Level                | Tool                          | Location                      |
| -------------------- | ----------------------------- | ----------------------------- |
| Logic                | Vitest                        | `src/lib/*.test.ts`           |
| Stores               | Vitest                        | `src/store/*.test.ts`         |
| Components and pages | Vitest, Testing Library, axe  | `src/**/*.test.tsx`           |
| Design tokens        | Vitest                        | `src/styles/contrast.test.ts` |
| End to end           | Playwright with axe (planned) | `e2e/*.spec.ts`               |

`src/test/setup.ts` polyfills `matchMedia` and `<dialog>` for jsdom and, before each test, installs the in-memory gateway from `src/test/fakeGateway.ts` as `fetch`, signs in a test user, seeds the demo farms on the fake gateway and in the store, and switches to German. Use `gateway.failNext(status, details?, path?)` to test error paths, `gateway.expireTokens()` and `gateway.refreshCookie` for the session refresh, and `flushFarmSync()` to wait for pending writes. Use `renderWithRouter` and `expectNoAxeViolations` from `src/test/utils.tsx`.

## Docker

```sh
docker build -t farmplan-frontend --build-arg VITE_API_BASE_URL=https://api.example.com .
docker run -p 8080:80 farmplan-frontend
```

`VITE_API_BASE_URL` is read at build time and is public in the bundle.

## Known gaps

- No CI, no branch protection, no semantic-release.
- No Playwright suite; `tsconfig.e2e.json` exists but is not referenced from `tsconfig.json` until `e2e/` exists.
- Plans, plant catalog, soil, and yield are still demo data.
