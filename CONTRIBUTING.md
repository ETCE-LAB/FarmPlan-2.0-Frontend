# Contributing to the FarmPlan frontend

These rules apply to every contribution, including code, tests, documentation, configuration, and AI-assisted work. Read [AGENTS.md](AGENTS.md), the [documentation index](docs/README.md), and the [development guide](docs/development.md) before making changes. All maintained documentation, agent instructions, and skills must be in clear English.

## 1. Feature branches and pull requests

- **Never push directly to `dev` or `main`.** This includes force pushes, bot pushes, and administrative bypasses. Feature branches open reviewed pull requests **only into `dev`**, not directly into `main`.
- Promote changes to `main` only through a separate reviewed **`dev` → `main` pull request**, after the exact current `dev` revision passes all checks. A feature PR's checks alone do not prove the merged integration branch is healthy; changes to `dev` invalidate stale promotion results.
- The flow is `feature branch → dev → main`. `dev` is not a release branch.
- Work on a feature branch, including for fixes and documentation. Use descriptive names such as `feat/plant-images`, `fix/treeline-spacing`, or `docs/contribution-rules`.
- Check the current branch and working tree before starting. If already on `main` or `dev`, move the work to a feature branch before committing. Preserve existing changes; never reset or discard them to change branches.
- AI agents must obtain explicit permission before creating branches, committing, pushing, tagging, deploying, or invoking paid services. A workflow policy is not permission.
- Do not force-push shared branches. Any history rewrite of a personal feature branch requires coordination and must preserve AI attribution.

## 2. Small, verified commits

Prefer small, coherent commits over one large final commit. Each commit should represent a reviewable change, include its tests, translations, and documentation, and leave the branch building and passing. Do not create deliberately broken checkpoint commits.

Before **every commit**, run:

```sh
npm run check   # Prettier, oxlint, typecheck, Vitest
npm run build   # typecheck and production build
```

For UI or map changes, also run `npm run test:e2e` once Playwright is set up (see the [roadmap](docs/roadmap.md)). **All checks must pass** before committing, pushing for review, or merging. This also applies to documentation-only changes, because Prettier checks Markdown.

- No ignored failures, disabled tests, `.skip`/`.only`, or new lint suppressions just to make a contribution pass. Report existing skips or unavailable checks; they are not evidence of coverage.
- Missing dependencies, interrupted runs, or failing checks mean **the gate is not satisfied**. Report the blocker; do not claim readiness.
- Run `git --no-pager diff --check` and inspect the diff for secrets, build output (`dist/`), and unintended changes.
- Record exact commands and outcomes in the pull request.

## 3. Mandatory AI disclosure and co-authorship

**Everything created or materially changed with AI assistance must be marked as AI-assisted and co-authored with the exact model used.** This includes code, tests, translations, documentation, configuration, and substantive AI review or design. Human authors remain responsible for accuracy, security, licensing, and validation.

### Commit requirements

Every commit containing AI-assisted work must include:

1. An `AI-Assisted: yes` trailer.
2. An `AI-Model:` trailer naming the exact provider and model/version reported by the tool. List each contributing model separately. Never guess a model identity.
3. A `Co-authored-by:` trailer for each contributing model. Use the provider's documented attribution identity when available; otherwise use a clearly non-personal `.invalid` address. Do not impersonate a person.
4. A body describing which files or parts were AI-assisted and how they were verified.

Example (use this model only when it was actually used):

```text
docs(agents): define frontend skills and contribution rules

AI-assisted scope: AGENTS.md, CLAUDE.md, CONTRIBUTING.md, docs/, .agents/skills/.
Validation: npm run check passed (Prettier, oxlint, typecheck, 168 tests); npm run build passed.

AI-Assisted: yes
AI-Model: Anthropic Claude Opus 5.5 (claude-opus-5-5)
Co-authored-by: Claude Opus 5.5 <noreply@anthropic.com>
```

Do not replace these trailers with a vague reference to "AI" or a product name without the model. Do not claim checks passed unless they ran successfully.

### Pull requests and provenance

- Include an **AI assistance** section listing each model, affected files, the type of assistance, and human review. State `AI assistance: none` only when true.
- Track file-level provenance in [docs/ai-contributions.md](docs/ai-contributions.md) and update it for AI-assisted changes.
- Preserve attribution when rebasing, cherry-picking, or squashing. The final squash commit must retain all model trailers and co-authors.
- Never include private prompts, credentials, or personal data in disclosure records.

## 4. Conventional Commits and semantic-release

Use **Conventional Commits** for every commit and the final pull-request or squash title:

```text
<type>(<optional-scope>): <short description>
```

Examples:

```text
feat(map): add address search to the field editor
fix(treelines): respect edge buffer on rotated fields
docs(agents): clarify state ownership
test(e2e): cover field drawing on mobile
ci: run npm run check on pull requests
```

| Change                                                                      | Commit marker                                               | Version effect |
| --------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------- |
| Backward-compatible feature                                                 | `feat`                                                      | Minor          |
| Bug fix                                                                     | `fix` or `perf`                                             | Patch          |
| Breaking change, for example an incompatible store schema without migration | `!` and a `BREAKING CHANGE:` footer explaining migration    | Major          |
| Documentation, tests, refactoring, build, CI, formatting, maintenance       | `docs`, `test`, `refactor`, `build`, `ci`, `style`, `chore` | No release     |

A marker does not grant permission for a breaking change. Do not manually bump versions, create tags, or publish releases.

### Automation status and target

**CI, branch protection, and semantic-release are not configured yet.** On November 5, 2026, neither `dev` nor `main` was protected on GitHub. This document establishes policy, not a claim that the platform enforces it.

The intended setup must:

- Run `npm run check`, `npm run build`, and the Playwright suite on feature PRs into `dev`, on merged `dev`, on `dev` → `main` promotion PRs, and on merged `main`.
- Protect `dev` and `main` against direct pushes, force pushes, and deletion; allow feature PRs only into `dev` and promotion into `main` only from `dev`.
- Validate Conventional Commit titles and the required AI trailers.
- Run semantic-release only from trusted CI after a successful merge to `main`, without a release bot pushing commits to protected branches.

## 5. Pull-request checklist

- [ ] Feature PR targets `dev`; no direct push to `dev` or `main`.
- [ ] Small, coherent commits using Conventional Commits.
- [ ] `npm run check` and `npm run build` passed for the final revision; for UI/map changes also Playwright; exact results recorded.
- [ ] New texts in `de.ts` and `en.ts`; only design tokens used; checked in light and dark mode and at about 390 px width.
- [ ] Store schema changes include a migration and a test.
- [ ] No user input rendered as HTML; no secrets or `dist/` committed.
- [ ] AI assistance declared, exact models identified, trailers present, provenance record updated.
- [ ] Legacy parity inventory and documentation updated where affected.
