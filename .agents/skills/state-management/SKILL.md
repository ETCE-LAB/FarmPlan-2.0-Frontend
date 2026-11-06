---
name: state-management
description: Change FarmPlan client state with Zustand stores, versioned persistence and migrations, URL state, undo, and confirm dialogs.
---

# State management

## Preparation

Read `AGENTS.md` and [ADR 0003](../../../docs/decisions/0003-client-state-and-data-fetching.md). Inspect `src/store`, `src/lib/useSearchParam.ts`, `src/lib/backup.ts`, and their tests.

## Where state belongs

| Kind                                      | Location                                   | Examples                                         |
| ----------------------------------------- | ------------------------------------------ | ------------------------------------------------ |
| Persisted domain data and device settings | `useFarmStore` (`localStorage`, versioned) | farms, fields, plans, language, theme, map       |
| Shareable state                           | URL through `useSearchParam`               | selected field, plant filters, sorting, search   |
| Transient UI state                        | `useState` or `useUiStore`                 | form drafts, toasts, confirm dialog, mobile menu |

Do not copy state from one kind into another. Derive values such as area sums or filtered lists with `useMemo` instead of storing them.

## Rules

- Read with a selector: `useFarmStore((s) => s.fields)`. Never call a store hook without a selector.
- Keep domain data normalized (`farms`, `fields`, `plans` linked by `farmId` and `fieldId`), matching the API shape.
- Cascades live in store actions: deleting a farm removes its fields and plans.
- Destructive actions: `await confirmAction({ … })`, then `mutateWithUndo(() => …, message, undoLabel)` from `src/store/undo.ts`.
- To change several URL parameters at once, use `useUpdateSearchParams`; separate setters overwrite each other.
- Persistence key `farmplan-storage`, version `STORE_VERSION` in `src/store/migrations.ts`. **Any incompatible schema change** needs a version bump, a migration, and a test in `migrations.test.ts`. Purely additive fields with defaults need no migration.
- Backups share the store version and are validated with zod on import; update the schema in `src/lib/backup.ts` together with the types.
- Server data will move to a dedicated data-fetching layer when the backend is connected (ADR 0003). Do not add new long-lived server data to `useFarmStore` without checking that decision.
- `src/test/setup.ts` resets both stores to demo data and German before each test; keep that reset complete when adding state.

## Workflow

1. Change types in `src/types`, then the store, the migration, the backup schema, and demo data together.
2. Test actions, cascades, undo, persistence, migration from the previous version, and the backup round trip.
3. Validate with `../frontend-validation/SKILL.md`.

## Done when

Old persisted data loads without loss, backups round-trip, components read through selectors, and tests cover the change.
