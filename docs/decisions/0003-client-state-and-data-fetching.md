# ADR 0003: Client state and data fetching

- **Status:** Proposed (current state accepted; backend data fetching proposed)
- **Date:** November 5, 2026

## Context

The legacy UI kept farms in component state and fetched data with ad-hoc `fetch` calls. The current frontend has no backend and keeps all data in a persisted Zustand store. Once the backend exists, server data needs caching, invalidation, loading and error states, and must not drift from the backend.

## Current state (accepted)

- **Zustand** stores: `useFarmStore` for domain data (farms, fields, plans) and device settings (language, theme, base layer), persisted to `localStorage` under `farmplan-storage` with `STORE_VERSION` and migrations; `useUiStore` for toasts, the confirm dialog, and the mobile menu.
- **URL state** through `useSearchParam` for anything shareable.
- Components read with selectors only; derived values are computed, not stored.
- Destructive actions use `confirmAction` and `mutateWithUndo`.

## Proposed decision for backend data

- Move **server data** (farms, fields, plans, catalog) to a dedicated data-fetching layer with caching and invalidation. The recommended candidate is TanStack Query; the final choice needs review.
- Keep **device and UI state** in Zustand. Remove domain data from `localStorage` once the API is authoritative, with a one-time migration or export path for existing local data.
- Keep component APIs stable where possible: pages switch from store selectors to query hooks.
- Mutations go through the API client from [ADR 0004](0004-api-contracts-and-error-handling.md); undo becomes an API operation or is limited to unsaved drafts.

## Consequences

- One source of truth per kind of data; no copies of server data in Zustand.
- Offline use is not supported unless decided separately.

## Open questions

- Query library choice and whether to use React Router loaders instead.
- How existing `localStorage` data is migrated to the backend.
- Whether undo for server-side deletes is supported by the backend (soft delete) or removed.
