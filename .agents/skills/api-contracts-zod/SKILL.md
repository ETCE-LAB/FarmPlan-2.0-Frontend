---
name: api-contracts-zod
description: Connect the FarmPlan frontend to the backend gateway with zod-validated contracts, typed errors, and explicit loading and failure states.
---

# API contracts with zod

## Status

There is no backend integration yet. Data comes from `src/data/mockData.ts` and is persisted in `localStorage`. zod is currently used for backup imports in `src/lib/backup.ts`. The client design is described in [ADR 0003](../../../docs/decisions/0003-client-state-and-data-fetching.md) and [ADR 0004](../../../docs/decisions/0004-api-contracts-and-error-handling.md); treat their open points as open.

## Preparation

Read `AGENTS.md`, both ADRs, and the backend's gateway contracts in [ETCE-LAB/FarmPlan-2.0-Backend](https://github.com/ETCE-LAB/FarmPlan-2.0-Backend). Agree endpoint shapes with the backend before writing schemas. Do not invent endpoints.

## Rules

- All requests go through one client module with the base URL from `import.meta.env.VITE_API_BASE_URL ?? '/api'`. No `fetch` calls scattered across components.
- Parse every response with a zod schema before use. Derive TypeScript types from schemas with `z.infer`, or keep schemas aligned with `src/types` and test the alignment.
- Return expected failures as values: `{ ok: true, data } | { ok: false, error: '<code>' }`. Error codes double as i18n keys, as in `geojson.errors.<code>` and `backup.errors.<code>`.
- Distinguish network failures, timeouts, `401`/`403`, `404`, validation errors (`422`), and server errors. Show an understandable message and a retry where useful.
- Use an `AbortSignal` with a timeout for every request; cancel requests when the component unmounts or the input changes.
- Never trust client-side checks for authorization. Hide UI for missing permissions, but rely on the backend's response.
- Do not log full payloads or tokens.
- Coordinates in requests and responses are GeoJSON `[lng, lat]`.

## Workflow

1. Write the schema and a fixture from the agreed contract; test parsing of valid, invalid, and partial payloads.
2. Implement the client function with typed errors and tests that mock `fetch`.
3. Replace mock data per use case, keeping components unchanged where possible. Update the parity inventory and README status.
4. Validate with `../frontend-validation/SKILL.md`.

## Done when

Every response is validated, all error states are visible and translated, no component calls `fetch` directly, and tests cover success, invalid payloads, and failures.
