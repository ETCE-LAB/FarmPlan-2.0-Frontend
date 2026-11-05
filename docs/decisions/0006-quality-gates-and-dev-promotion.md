# ADR 0006: Quality gates and dev promotion

- **Status:** Accepted as policy; enforcement pending
- **Date:** November 5, 2026

## Context

The frontend repository has two long-lived branches, `dev` and `main`, both unprotected on GitHub as of November 5, 2026. There is no CI. During the migration, commits reached `dev` with a syntax error and with a failing build, which a gate would have caught. The backend repository uses the same flow with `develop` instead of `dev`.

## Decision

- **Branch flow:** `feature branch → dev → main`. Feature PRs target `dev` only. `main` receives changes only through a reviewed `dev` → `main` promotion PR after the exact `dev` revision passes all checks. No direct or force pushes to `dev` or `main`.
- **Gate for every commit, PR, and merge:** `npm run check` (Prettier, oxlint, `tsc -b`, Vitest) and `npm run build`. UI and map changes additionally run Playwright once it exists. Documentation-only changes are not exempt.
- **Commits:** small, coherent, Conventional Commits, with AI attribution as described in [CONTRIBUTING.md](../../CONTRIBUTING.md).
- **Releases:** semantic-release from trusted CI on merged `main` only; no releases from `dev`; no release-bot commits to protected branches.

## Enforcement plan

1. GitHub Actions workflow running the gate on pull requests and pushes to `dev` and `main`.
2. Playwright job with browsers cached and external tile servers blocked.
3. Branch protection for `dev` and `main`: required checks, required review, no force pushes, PR base restrictions.
4. Commit-title and AI-trailer validation.
5. semantic-release on `main`, and the container image built from `main` once a registry is decided.

## Consequences

- Until enforcement exists, the gate relies on contributors and reviewers. PR descriptions must record executed commands and results.
- The policy aligns with the backend so promotion and release work the same way across repositories.
