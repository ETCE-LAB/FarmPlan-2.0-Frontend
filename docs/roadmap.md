# Roadmap

Priorities with acceptance criteria. The roadmap describes order, not a request to implement everything at once. Mark items done only with evidence: merged code and passing checks.

## Done

- Vite SPA with React 19, React Router 8, TypeScript strict, Tailwind v4.
- Tooling: Prettier, oxlint, TypeScript project references, Vitest with jsdom; `npm run check` and `npm run build` pass.
- Design tokens, light/dark/system theme, token contrast test.
- German and English UI with type-checked keys.
- Overview, plant catalog, farm list, farm creation and details with map editor, GeoJSON import/export, treeline preview, settings with backup and restore. All on demo data in `localStorage`.
- Docker image serving the build with nginx.
- API client with timeouts, typed errors, and zod-validated responses (`src/lib/api`).
- Login, registration, logout, session refresh through the `HttpOnly` cookie, protected farm routes; access token in memory only ([ADR 0007](decisions/0007-session-and-server-data-sync.md)).
- Farms through `/api/v1/farms` and fields as their own resource instead of `localStorage`; existing local data can be imported from a backup (parity L5, L22).
- Farm boundary drawing with server-computed area and perimeter (L6, L7); crop type, irrigation, and automatic spacing per field (L10); GeoJSON imports as one atomic request.
- Account page with display name, password change, and account deletion; guest sessions; navigation follows `/api/v1/modules`.

## P0 – Foundation and authentication

| Item                    | Acceptance criteria                                                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playwright E2E and a11y | `playwright.config.ts` and `e2e/` exist; drawing, layer switching, mobile navigation, and axe scans in both themes pass offline; the e2e reference is back in `tsconfig.json` |
| CI                      | Every PR into `dev` and `main` runs `npm run check`, `npm run build`, and Playwright; failures block merging                                                                  |
| Branch protection       | `dev` and `main` reject direct and force pushes; PR base rules match [CONTRIBUTING.md](../CONTRIBUTING.md)                                                                    |
| Docker Compose and Helm | The frontend image runs in the shared Compose setup and the Helm chart, with the API URL configured                                                                           |

## P1 – Backend data and GIS editor

| Item                       | Acceptance criteria                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| Plant catalog from the API | Server-side search, filters, and pagination; full catalog instead of 8 demo species (L2, L16) |
| Location search            | Search by coordinates or address through a backend geocoding adapter (L8)                     |
| Plant images               | Images from the backend Media service with attribution (L17)                                  |

## P2 – Planning and analysis

| Item                   | Acceptance criteria                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------- |
| Field climate and soil | Weather, solar, soil, and hardiness zone per field through backend adapters (L3, L11) |
| Plant templates        | Select plants per field from the catalog and save templates (L12)                     |
| Crop placement         | Drag crops onto the map with spacing rules and inside-field validation (L13)          |
| Optimizer results      | Treelines and placements from the backend optimizer on the map (L14)                  |
| Yield analysis         | Expected yield and calories from real plan data instead of demo values (L4)           |

## Migration completion gate

Legacy migration is complete only when every row of the [parity inventory](legacy-feature-parity.md) is Present or has an accepted Changed decision, has an owning route or component and backend endpoint, and is covered by a passing regression or acceptance test.
