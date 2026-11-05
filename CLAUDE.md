# Claude entry point for the FarmPlan frontend

Read and follow [AGENTS.md](AGENTS.md) first. It contains the shared architecture, security, and workflow rules, which are intentionally not duplicated here.

## Start of every task

1. Read [docs/README.md](docs/README.md) and the task-relevant documents.
2. Read [CONTRIBUTING.md](CONTRIBUTING.md). Run `git --no-optional-locks status --short` and `git --no-pager branch --show-current`; inspect affected code and preserve existing changes. Work on feature branches; PRs target `dev` only. Never push directly to `dev` or `main`. Promote to `main` only through a separate reviewed `dev` PR after the current integration revision passes all checks. Obtain permission before creating branches or performing Git writes.
3. Load the appropriate project-local instructions by reading their `SKILL.md`:
   - [Frontend feature](.agents/skills/frontend-feature/SKILL.md)
   - [Validation and review](.agents/skills/frontend-validation/SKILL.md)
   - [Map and geospatial UI](.agents/skills/map-geospatial-ui/SKILL.md)
   - [API contracts with zod](.agents/skills/api-contracts-zod/SKILL.md)
   - [State management](.agents/skills/state-management/SKILL.md)
   - [Internationalization](.agents/skills/i18n-localization/SKILL.md)
   - [Design system and Tailwind](.agents/skills/design-system-tailwind/SKILL.md)
   - [Contribution and release](.agents/skills/contribution-release/SKILL.md)
4. Define a bounded implementation increment with verifiable acceptance criteria. The roadmap is not a request for complete implementation.

## Orientation

- [Architecture: current state and target](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Development and checks](docs/development.md)
- [Architecture decisions](docs/decisions/README.md)
- [Legacy feature parity](docs/legacy-feature-parity.md) — source-inspected baseline; implementation and parity verification remain required.

The app currently runs on demo data in `localStorage`. A rendered page, a `DemoBadge`, or a passing unit test does not establish a backend integration.

## Language and legacy parity

All maintained documentation, agent instructions, and skills must be in clear English; visible UI text goes through the German and English locale files. Full functional parity with the legacy UI in [ETCE-LAB/FarmPlan](https://github.com/ETCE-LAB/FarmPlan) is mandatory: no legacy capability may be silently dropped. Map each capability to a route or component, its backend dependency, and regression/acceptance tests in the parity inventory. Do not reproduce insecure behavior; document corrections and test the secure replacement.

## Contribution gates

Follow `AGENTS.md` and `CONTRIBUTING.md`: `npm run check` and `npm run build` must pass before each small, coherent commit, push for review, and merge, including documentation-only work. Use Conventional Commits. Mark all AI-assisted work with the exact model, mandatory AI/model/co-author commit trailers, PR disclosure, and an updated [provenance record](docs/ai-contributions.md); preserve attribution in squash commits. Missing or failing checks block readiness. CI and release automation are targets, not yet implemented.

## Completion

Report concisely: changed files and behavior, checks actually executed and their results, and open points. Update affected documentation. No commits, branches, deployments, or paid calls without an explicit request.
