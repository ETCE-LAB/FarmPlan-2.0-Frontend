---
name: frontend-feature
description: Implement bounded FarmPlan frontend capabilities as routes, pages, and components with tests, translations, and accessibility.
---

# Frontend feature

## Preparation

Read `AGENTS.md`, `docs/architecture.md`, and the relevant section of `docs/roadmap.md`. Inspect the affected routes in `src/App.tsx`, pages, components, store actions, and existing tests. Distinguish demo-data UI from backend-backed behavior.

Check [the legacy feature parity inventory](../../../docs/legacy-feature-parity.md) for the capability. If it replaces legacy behavior, keep every legitimate legacy use case and record the mapping.

## Workflow

1. Define the use case and acceptance criteria, including empty, loading, error, and narrow-screen states.
2. Place code by responsibility: a route in `src/pages` (default export), reusable UI in `src/components/<area>` (named exports), pure logic in `src/lib` with tests.
3. Register the route in `src/App.tsx`. Load pages with heavy dependencies such as Leaflet through `lazy()`. Add sidebar entries in `src/config/navigation.ts` with texts under `nav.<id>`.
4. Start each page with `PageHeader` so it has exactly one `h1` and sets the document title.
5. Reuse building blocks (`Card`, `Button`, `buttonClass`, `FormField`, `Badge`) before writing new markup. See `../design-system-tailwind/SKILL.md`.
6. Put shareable state such as filters, selection, and sorting in the URL with `useSearchParam`. Keep form drafts local and reset them with a `key`. See `../state-management/SKILL.md`.
7. Add all visible texts to `de.ts` and `en.ts`. See `../i18n-localization/SKILL.md`.
8. Use `confirmAction` and `mutateWithUndo` for destructive actions instead of `window.confirm`.
9. Test behavior from the user's perspective with Testing Library and `renderWithRouter`; query by role and label, not by class names. Add `expectNoAxeViolations` for new pages.
10. Finish with `../frontend-validation/SKILL.md` and update the README status, roadmap, and parity inventory only to the extent supported by evidence.

## Done when

The route works with keyboard and screen reader, in light and dark mode, and at about 390 px width; texts exist in both languages; tests cover the behavior; and executed checks are documented. Explicitly identify incomplete work and demo-data placeholders.
