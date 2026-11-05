# ADR 0004: API contracts and error handling

- **Status:** Proposed
- **Date:** November 5, 2026

## Context

The legacy UI called its Flask backend through `utils/dashboardApi.js` without response validation, and called third-party services (BGR, Nominatim, Bright Sky, Open-Meteo) directly from the browser without timeouts. The new backend exposes a public HTTP API through its gateway ([ETCE-LAB/FarmPlan-2.0-Backend](https://github.com/ETCE-LAB/FarmPlan-2.0-Backend)). The frontend already validates imported files with zod and returns errors as values whose codes are i18n keys.

## Proposed decision

- **Single API client** in `src/lib/api` (exact location to be decided in the implementing PR). Base URL from `VITE_API_BASE_URL`, default `/api`. Components never call `fetch` directly.
- **Validate every response with zod** before use. Types are inferred from schemas or tested against `src/types`. Schemas follow the backend contract; where the backend publishes OpenAPI, generate or check schemas from it rather than writing them by hand.
- **Errors as values:** `{ ok: true, data } | { ok: false, error: code }`, with codes for network failure, timeout, unauthenticated, forbidden, not found, validation, and server error. Codes map to i18n keys.
- **Timeouts and cancellation:** every request has an `AbortSignal` with a timeout and is cancelled when no longer needed. No unbounded retries.
- **Third-party providers** go through backend adapters, not the browser, so the backend controls caching, quotas, privacy, and usage policies.
- **Authorization** is enforced by the backend. The frontend only hides UI it knows is not allowed.

## Consequences

- Changing the backend contract fails loudly in schema tests instead of silently corrupting the UI.
- `VITE_API_BASE_URL` is fixed at build time. Legacy documentation described a runtime `config.js` (parity L23); if operators must change the URL without rebuilding, add a runtime configuration file served by nginx and validated at startup.

## Open questions

- Token transport and storage (cookie versus header, refresh flow), to be decided with the backend Identity service.
- OpenAPI availability and whether to generate types or schemas from it.
- Runtime versus build-time API URL for Docker Compose and Helm.
