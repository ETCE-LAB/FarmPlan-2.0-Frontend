# Instructions for AI agents

## Getting started and sources

- Read `docs/README.md` first, then [CONTRIBUTING.md](CONTRIBUTING.md) and the documents relevant to the task.
- `docs/architecture.md` describes the current state and target architecture; `docs/roadmap.md` describes implementation steps; `docs/development.md` covers commands and checks.
- Architecture decisions are under `docs/decisions/`. Distinguish accepted decisions, proposals, and open questions.
- Code and configuration establish the current state. Document discrepancies instead of treating planned capabilities as implemented. A page that renders demo data is not a backend integration.
- This file is the shared source of rules. `CLAUDE.md` is the Claude entry point.
- All maintained documentation, agent instructions, and skills, including new documentation, must be written in clear English. Preserve technical identifiers, paths, skill names, and valid frontmatter. Visible UI text is the exception: it lives in the locale files in German and English.

## Mandatory legacy functional parity

- Full functional parity with the legacy FarmPlan UI ([ETCE-LAB/FarmPlan](https://github.com/ETCE-LAB/FarmPlan), `src/`) is mandatory. No legacy user-facing capability may be silently dropped.
- Consult [the legacy feature parity inventory](docs/legacy-feature-parity.md). It is a source-inspected baseline, not proof of implemented or tested parity; keep gaps and verification status explicit.
- Map every legacy capability to a route or component, the backend capability it depends on, and regression/acceptance tests. Track missing implementations and coverage explicitly.
- Do not blindly copy insecure or fragile behavior, such as calling third-party APIs directly from the browser without timeouts, or rendering user input as HTML. Document the correction, preserve the legitimate capability, and test it.
- Do not declare migration complete before the inventory is verified, backend dependencies are explicit, and parity tests pass for every capability. Follow the gates in `docs/roadmap.md`.

## Architecture boundaries

- The frontend is a single-page application: React 19, React Router 8 in declarative mode, Vite 8, TypeScript in strict mode. It has no server-side rendering and no server runtime; production serves static files from nginx.
- All backend communication goes through the FarmPlan API gateway under `/api` (`VITE_API_BASE_URL`). Do not call internal services, databases, or backend-owned third-party providers directly from the browser.
- Domain rules, permissions, and authoritative data belong to the backend. The frontend validates input for user feedback only and never treats client-side checks as authorization.
- Validate every external input at the boundary with zod or an explicit guard: API responses, imported files, `localStorage`, and URL parameters.
- Pages in `src/pages` orchestrate; reusable building blocks live in `src/components`; pure logic lives in `src/lib` and has unit tests.
- State has three kinds: persisted domain and device data (`useFarmStore`), shareable state in the URL (`useSearchParam`), and transient UI state (`useState`, `useUiStore`). Do not duplicate one in another.
- Leaflet and Geoman stay in lazily loaded map pages. Coordinates are stored as GeoJSON `[lng, lat]`; Leaflet uses `[lat, lng]`. Convert only through `src/lib/geo.ts`.
- Colors only through the design tokens in `src/index.css`; visible text only through `t('…')`.

## Change workflow

1. Inspect the working tree, affected code, tests, and documentation. Preserve existing user changes.
2. Select the appropriate skill from `.agents/skills/` and read its `SKILL.md`. Skills are work instructions, not executable implementations.
3. Implement a small vertical increment with clear acceptance criteria. Do not implement the entire roadmap without a request.
4. Update affected types, schemas, translations, tests, and documentation together. Change generated files only through their generator.
5. Start with targeted checks, then run `npm run check` and `npm run build`; for UI or map changes also `npm run test:e2e` once it exists. All checks must pass before every commit, push for review, and merge, including documentation changes. Missing dependencies, skipped required checks, or failures block readiness; report exact commands, results, and gaps. Do not claim success without execution.
6. Keep the current-state documentation and completed roadmap items up to date. Record significant boundary changes as an ADR.

## Contribution, attribution, and release rules

- Follow [CONTRIBUTING.md](CONTRIBUTING.md): feature branches merge only through reviewed PRs into `dev`. Never push directly to `dev` or `main`, including bot or force pushes. Promote only through a separate reviewed `dev` → `main` PR after the current `dev` revision passes all checks. No direct feature-to-main PRs and no releases from `dev`.
- Prefer small, coherent intermediate commits that pass all checks. Use Conventional Commits and preserve semantic-release markers, including breaking-change details.
- Mark every AI-assisted contribution in commit bodies, PR disclosures, and [the provenance record](docs/ai-contributions.md). Require `AI-Assisted: yes`, the exact provider and model in `AI-Model:`, and a model-specific `Co-authored-by:` trailer for every contributing model. Never guess the model identity; preserve trailers when squashing.
- semantic-release is the target release mechanism, not currently installed automation. Do not manually bump versions, tag, publish, or add a release bot that pushes commits to `main`.
- These policies do not authorize Git operations. Obtain an explicit request before creating branches, committing, pushing, tagging, releasing, or deploying. If on `main` or `dev`, report it and obtain permission to create a feature branch before committing.

## Security and quality

- Never render user input or API data as HTML. Use React text rendering; for Leaflet popups use `popupElement()` or `textContent`.
- No secrets, tokens, or personal data in the bundle, logs, or examples. Everything prefixed `VITE_` is public after the build; do not commit `.env`.
- Store authentication tokens only as decided in an ADR. Do not put tokens in `localStorage` without an explicit decision.
- Network calls need timeouts or abort signals, understandable error states, and no unbounded retries.
- Target WCAG 2.1 AA: one `h1` per page, labelled inputs, `aria-label` on icon buttons, keyboard-operable dialogs. Token contrast is tested automatically.
- For geodata, handle CRS, units, and coordinate order explicitly. No implicit conversions.
- No new dependencies, external services, or incompatible store schemas without a concrete need. Store schema changes require a migration and a test.
- No commits, branches, deployments, or paid API calls without a request.

## Skill directory

| Skill                                            | Purpose                                                              |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| `.agents/skills/frontend-feature/SKILL.md`       | New routes, pages, and UI components as vertical increments          |
| `.agents/skills/frontend-validation/SKILL.md`    | oxlint, typecheck, Vitest, Playwright, accessibility, honest reports |
| `.agents/skills/map-geospatial-ui/SKILL.md`      | Leaflet, Geoman, map layers, coordinates, proj4, Turf                |
| `.agents/skills/api-contracts-zod/SKILL.md`      | Type-safe backend communication and error handling with zod          |
| `.agents/skills/state-management/SKILL.md`       | Zustand stores, persistence, migrations, URL state, undo             |
| `.agents/skills/i18n-localization/SKILL.md`      | German and English texts with react-i18next                          |
| `.agents/skills/design-system-tailwind/SKILL.md` | Tailwind v4 tokens, building blocks, accessibility, responsive UI    |
| `.agents/skills/contribution-release/SKILL.md`   | AI attribution, feature-to-dev PRs, main promotion, semantic-release |

Create new skills only under `.agents/skills/<name>/SKILL.md`.
