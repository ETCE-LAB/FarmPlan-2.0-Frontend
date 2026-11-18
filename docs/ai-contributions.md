# AI contribution provenance

This record complements, and does not replace, the mandatory commit trailers and pull-request disclosures in [CONTRIBUTING.md](../CONTRIBUTING.md). Record exact provider and model identifiers, affected files, assistance type, and validation. Never guess missing historical model identities. Do not store private prompts, credentials, or personal data.

## 2026-10-27 to 2026-11-05 — Initial repository setup and migration to dev

- **Recorded Co-Authorship in Git log:**
  - `fe8e616` (2026-10-29, "add i18n"): `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  - `d8e64c5` (2026-10-29, "chore: ignore build output..."): `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- **Unattributed commits:** All other commits (`58a3eee` through `9bccb78`) carry only human authorship (`lucaspalomodevelop`) without AI trailers. Per policy, historical model identities are not guessed or retroactively assigned.
- **Human review & validation:** All commits were reviewed and committed by the maintainer; all 168 tests passed.

## 2026-11-05 — Agent guidance, skills, ADRs, and contribution policy

- **AI-assisted:** yes.
- **Provider/model:** [Hier genaues Modell eintragen, z. B. Anthropic Claude Opus 5.5 bzw. Google Gemini / Antigravity je nachdem, wer mitgearbeitet hat]
- **Scope:** `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, all eight `.agents/skills/*/SKILL.md` files, `docs/README.md`, `docs/architecture.md`, `docs/development.md`, `docs/roadmap.md`, `docs/legacy-feature-parity.md`, `docs/decisions/*`, and this record.
- **Assistance:** Drafted and validated governance documents, skills, and architectural decision records modeled on FarmPlan 2.0 Backend PR #1 and frontend codebase inspection.
- **Human review:** Pending maintainer review.
- **Validation:** `npm run check` (prettier, oxlint, typecheck, 168 vitest tests) and `npm run build` passed.

## 2026-11-10 — Backend connection for authentication, farms, and fields

- **AI-assisted:** yes.
- **Provider/model:** Anthropic Claude Opus 5.5 (`claude-opus-5-5`) via Claude Code.
- **Scope:** `src/lib/api/*`, `src/lib/redirect.ts`, `src/lib/schemas.ts`, `src/store/farmSync.ts`, `src/store/useSessionStore.ts`, `src/store/useFarmStore.ts`, `src/store/migrations.ts`, `src/store/account.ts`, `src/lib/fields.ts`, `src/pages/LoginPage.tsx`, `src/pages/AccountPage.tsx`, `src/components/shared/RequireAuth.tsx`, farm pages and components, `FieldsMapEditor`, `FormField`, `Sidebar`, navigation config, `TopBar`, `SettingsPage`, `PlantsPage`, `src/lib/plants.ts`, `src/lib/agronomy.ts`, `HardinessZoneLegend`, `FarmZoneMap`, `index.html`, `README.md`, locales, `src/test/fakeGateway.ts`, `src/test/setup.ts`, affected tests, ADR 0007, and the architecture, development, roadmap, parity, and skill documents.
- **Assistance:** Implemented the API client, login and session handling, server sync for farms and fields, the fake gateway for tests, and the documentation, following maintainer decisions on state management, required owner data, and login-only farm access; adapted to the reworked gateway contract (backend `990a964`), which moved token storage from `sessionStorage` to memory plus the refresh cookie; then covered the rest of the gateway: atomic GeoJSON imports, field crop/irrigation/spacing, the account page, farm boundary drawing with server metrics, guest sessions, and module-based navigation; added the hardiness-zone filter from a zone upwards, the zone column and legend dialog with a farm zone map in the plant catalog, and wired the maintainer's logo into the favicon, sidebar, and README.
- **Human review:** Pending maintainer review.
- **Validation:** `npm run check` (prettier, oxlint, typecheck, 309 Vitest tests in 26 files) and `npm run build` passed. Recorded list fixtures and the frontend's farm, boundary, and field request bodies were validated against the gateway's pydantic models from backend commit `990a964`. An earlier version against backend `d8f096a` was run manually by the maintainer against the Compose stack; the current version has not been run against the stack.
