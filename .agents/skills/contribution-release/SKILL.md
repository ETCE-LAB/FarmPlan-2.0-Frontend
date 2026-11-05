---
name: contribution-release
description: Apply FarmPlan frontend feature-to-dev PR and reviewed main promotion gates, exact-model AI attribution, Conventional Commits, and trusted main-only release policy.
---

# Contribution and release

## Scope and authority

Use when preparing contributions, reviewing attribution and promotion readiness, or planning CI and release automation. Read `CONTRIBUTING.md`, `AGENTS.md`, `docs/development.md`, `docs/ai-contributions.md`, and [ADR 0006](../../../docs/decisions/0006-quality-gates-and-dev-promotion.md). Paths here are repository-root-relative.

The workflow follows `CONTRIBUTING.md`. Treat it as required policy, not evidence that branch protection, CI, or semantic-release are configured. Report discrepancies and do not install automation as part of an unrelated task.

## Permission and branch checklist

- [ ] Obtain explicit permission before any Git write, including branch creation, commits, pushes, merges, history rewrites, or tags, and before release or deployment actions. Policy is not authorization.
- [ ] Inspect the current branch and working tree without discarding user changes. If on `main` or `dev`, request permission to create a feature branch before committing.
- [ ] Target ordinary feature, fix, and documentation PRs **only at `dev`**.
- [ ] Promote **`dev` to `main` only through a reviewed promotion PR** after the exact `dev` revision passes all checks.
- [ ] Never push directly, force-push, or bypass protections on `dev` or `main`.

## Small verified contributions

1. Prefer small coherent commits with related tests, translations, and documentation. Use Conventional Commits for every commit and the final PR or squash title. Preserve `!` and `BREAKING CHANGE:` details; markers do not authorize breaking changes.
2. Use `../frontend-validation/SKILL.md` for validation. Run `npm run check` and `npm run build` before every commit, push for review, and merge, including documentation-only changes.
3. Record exact commands and outcomes. Failing, skipped, or unavailable checks block readiness.

## AI provenance checklist

- [ ] Disclose all materially incorporated AI assistance, including code, tests, translations, prose, design, and review.
- [ ] Each AI-assisted commit body names affected files and validation and includes `AI-Assisted: yes`, an `AI-Model:` trailer with the exact provider and model for each model, and a matching `Co-authored-by:` trailer.
- [ ] Take model identifiers from the tool or session; never guess. Use the provider's documented attribution identity when available, otherwise a non-personal `.invalid` address.
- [ ] Include an AI assistance section in the PR and update `docs/ai-contributions.md`.
- [ ] Preserve every trailer and semantic marker through squash, rebase, cherry-pick, and promotion.

## Release checklist

- [ ] Treat semantic-release as a target until it is implemented and verified. No manual version bump, tag, or publication.
- [ ] Run semantic-release only in trusted CI on the checked, merged `main` revision after a reviewed promotion. Never release from `dev` or feature branches.
- [ ] Derive versions, release notes, and tags from Conventional Commits. No release-bot commits to protected branches. Restrict credentials to trusted release jobs.
- [ ] The container image (`Dockerfile`, nginx) is built from `main` only once a registry target and credentials are decided.
- [ ] Report verified enforcement separately from intended policy.
