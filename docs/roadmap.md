# Roadmap

Priorities with acceptance criteria. The roadmap describes order, not a request to implement everything at once. Mark items done only with evidence: merged code and passing checks.

## Done

- Vite SPA with React 19, React Router 8, TypeScript strict, Tailwind v4.
- Tooling: Prettier, oxlint, TypeScript project references, Vitest with jsdom; `npm run check` and `npm run build` pass.
- Design tokens, light/dark/system theme, token contrast test.
- German and English UI with type-checked keys.
- Overview, plant catalog, farm list, farm creation and details with map editor, GeoJSON import/export, treeline preview, settings with backup and restore. All on demo data in `localStorage`.
- Docker image serving the build with nginx.

## P0 – Foundation and authentication

| Item                    | Acceptance criteria                                                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playwright E2E and a11y | `playwright.config.ts` and `e2e/` exist; drawing, layer switching, mobile navigation, and axe scans in both themes pass offline; the e2e reference is back in `tsconfig.json` |
| CI                      | Every PR into `dev` and `main` runs `npm run check`, `npm run build`, and Playwright; failures block merging                                                                  |
| Branch protection       | `dev` and `main` reject direct and force pushes; PR base rules match [CONTRIBUTING.md](../CONTRIBUTING.md)                                                                    |
| Docker Compose and Helm | The frontend image runs in the shared Compose setup and the Helm chart, with the API URL configured                                                                           |
| API client              | One client module with base URL, timeouts, typed errors, and zod-validated responses ([ADR 0004](decisions/0004-api-contracts-and-error-handling.md))                         |
| Login and session       | Login, logout, session refresh, and protected routes against the backend Identity service; token storage decided in an ADR                                                    |

## P1 – Backend data and GIS editor

| Item                          | Acceptance criteria                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Farms and fields from the API | CRUD through the API replaces `localStorage` for domain data; migration path for existing local data decided (parity L22) |
| Plant catalog from the API    | Server-side search, filters, and pagination; full catalog instead of 8 demo species (L2, L16)                             |
| Farm boundary and perimeter   | Farm border can be drawn and edited; perimeter shown (L6, L7)                                                             |
| Location search               | Search by coordinates or address through a backend geocoding adapter (L8)                                                 |
| Field properties              | Crop type, irrigation, and other legacy field attributes (L10)                                                            |
| Plant images                  | Images from the backend Media service with attribution (L17)                                                              |

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
