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
