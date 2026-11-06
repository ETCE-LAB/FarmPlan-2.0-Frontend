---
name: frontend-validation
description: Validate FarmPlan frontend changes with Prettier, oxlint, typecheck, Vitest, Playwright, and accessibility checks, and report executed and missing checks honestly.
---

# Validation and review

Read `AGENTS.md`, `CONTRIBUTING.md`, and `docs/development.md`. Inspect the working tree and diff without reverting other people's changes.

## Validation plan

1. Map every behavior change to an acceptance criterion and a test.
2. Run targeted tests while developing, for example `npx vitest run src/lib/geo.test.ts`. Then run the full gate before every commit, push for review, and merge, including documentation-only changes:
   ```sh
   npm run check   # prettier --check, oxlint, tsc -b, vitest run
   npm run build   # tsc -b and vite build
   ```
   For UI or map changes, also run `npm run test:e2e` once Playwright is configured. Until then, report it as not available rather than passed.
3. Logic in `src/lib` needs unit tests next to the module. Store changes need tests for actions, cascades, undo, and migrations.
4. Components and pages: test with Testing Library from the user's perspective. Query by role and accessible name. Use `renderWithRouter` for routed components and check URL state through the `location` test ID.
5. Accessibility: run `expectNoAxeViolations` for new pages and dialogs. jsdom cannot measure color contrast or layout; token contrast is covered by `src/styles/contrast.test.ts`, rendered contrast and map interaction by Playwright.
6. Security: no user input or API data rendered as HTML, no secrets in `VITE_` variables, no tokens in logs.
7. Check light and dark mode and a width of about 390 px for visual changes. Report manual checks as manual.
8. Check documentation links, skill frontmatter, and current-versus-target statements. Prettier also formats Markdown.
9. Check the parity inventory against the legacy UI in [ETCE-LAB/FarmPlan](https://github.com/ETCE-LAB/FarmPlan) when a legacy capability is affected. A demo-data page does not prove parity.
10. Run `git --no-pager diff --check`; make sure `dist/`, `test-results/`, and `.env` are not staged.
11. Verify the feature branch, Conventional Commits, AI trailers with the exact model, and the updated `docs/ai-contributions.md`. Feature PRs target `dev` only.

## Final report

List changed files, verified requirements, exact commands, and results, such as the number of passed tests. Report checks that were not run and why. Do not claim a successful check without executing it. Fix self-introduced errors with focused changes; do not fix unrelated errors in passing.
