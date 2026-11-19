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
docker build -t farmplan-frontend .
docker run -p 8080:80 -e API_UPSTREAM=http://api-gateway:8000 farmplan-frontend
```

- `VITE_API_BASE_URL` is a build argument, defaults to `/api`, and is public in the bundle. Leave it at `/api` when nginx proxies the API.
- `API_UPSTREAM` (runtime, `http(s)://host[:port]` without a path) makes nginx proxy `/api/` to the gateway; `docker/40-api-proxy.sh` writes that location at container start and keeps the browser's `Host` header for the gateway's Origin check. Without it, `/api/` answers 503 instead of falling through to `index.html`. An invalid value stops the container.

## Full stack with Docker Compose

The umbrella repository [ETCE-LAB/FarmPlan-2.0](https://github.com/ETCE-LAB/FarmPlan-2.0) holds frontend, backend, documentation, and ML as submodules, and its `docker-compose.yml` includes `FarmPlan-2.0-Backend/infra/compose.yaml` and adds a `frontend` service. To use this image there, build it from `FarmPlan-2.0-Frontend` and set `API_UPSTREAM=http://api-gateway:8000`. As of November 19, 2026 the umbrella repository still builds its own `deployment/frontend.Dockerfile`, whose proxy sends `Host $host`; `$host` drops the port, so sign-in fails with 403 on any port other than 80.

Verified on November 18, 2026 with a Compose file that includes the backend Compose file (backend `develop`) and builds this image with `API_UPSTREAM`: all services became healthy; register, login, the refresh cookie, and `GET /api/v1/farms` worked through nginx; a foreign Origin got 403; a headless Chromium signed in through the UI and stayed signed in after a reload.

Over plain HTTP the stack only works on `localhost`, because the gateway sets the refresh cookie `Secure` only when `APP_ENV=production`; a TLS-terminating proxy in front must forward the original `Host` and scheme, or the Origin check rejects sign-in.

## Known gaps

- No CI, no branch protection, no semantic-release.
- No Playwright suite; `tsconfig.e2e.json` exists but is not referenced from `tsconfig.json` until `e2e/` exists.
- Plans, plant catalog, soil, and yield are still demo data.
