# FarmPlan Frontend – Documentation

This documentation distinguishes the **current state**, verified against the code, from the **target**. A page that renders demo data does not prove a backend integration.

## Getting started

- [Contribution rules: branches, checks, AI attribution, and releases](../CONTRIBUTING.md)
- [AI contribution provenance](ai-contributions.md)
- [Architecture: current state and target](architecture.md)
- [Roadmap with priorities and acceptance criteria](roadmap.md)
- [Development and verified commands](development.md)
- [Legacy feature parity](legacy-feature-parity.md) — source-inspected baseline; implementation and verified parity remain outstanding.
- [Architecture decisions](decisions/README.md)

## Task-specific agent skills

Read [AGENTS.md](../AGENTS.md) first, then load only the instructions relevant to the task:

| Skill                                                                       | Purpose                                                       |
| --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [Frontend feature](../.agents/skills/frontend-feature/SKILL.md)             | Routes, pages, and components as vertical increments          |
| [Frontend validation](../.agents/skills/frontend-validation/SKILL.md)       | Checks, tests, accessibility, and honest validation reports   |
| [Map and geospatial UI](../.agents/skills/map-geospatial-ui/SKILL.md)       | Leaflet, Geoman, coordinates, proj4, Turf                     |
| [API contracts with zod](../.agents/skills/api-contracts-zod/SKILL.md)      | Backend communication, validation, error handling             |
| [State management](../.agents/skills/state-management/SKILL.md)             | Zustand, persistence, migrations, URL state, undo             |
| [Internationalization](../.agents/skills/i18n-localization/SKILL.md)        | German and English texts, plurals, number formatting          |
| [Design system](../.agents/skills/design-system-tailwind/SKILL.md)          | Tokens, building blocks, dark mode, accessibility, responsive |
| [Contribution and release](../.agents/skills/contribution-release/SKILL.md) | Feature-to-dev PRs, promotion, AI attribution, releases       |

## Language

All maintained documentation, agent instructions, and skills must be written in clear English. Visible UI text is maintained in German and English in `src/i18n/locales`.

## Related repositories

- Backend: [ETCE-LAB/FarmPlan-2.0-Backend](https://github.com/ETCE-LAB/FarmPlan-2.0-Backend), which uses the same contribution model with `develop` as its integration branch.
- Legacy UI: [ETCE-LAB/FarmPlan](https://github.com/ETCE-LAB/FarmPlan), the parity reference.

Review date: November 5, 2026. This documentation change contains no application code changes.
