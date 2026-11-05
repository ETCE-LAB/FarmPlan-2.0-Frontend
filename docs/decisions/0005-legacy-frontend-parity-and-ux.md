# ADR 0005: Legacy frontend parity and UX

- **Status:** Accepted
- **Date:** November 5, 2026

## Context

FarmPlan 2.0 replaces the legacy UI in [ETCE-LAB/FarmPlan](https://github.com/ETCE-LAB/FarmPlan). Users rely on its capabilities: farm and field mapping, soil and climate lookups, plant inventory, templates, and crop placement. Some legacy behavior is insecure or inaccessible, for example third-party calls from the browser without timeouts, tab state without URLs, and freely chosen theme colors without contrast checks.

## Decision

- **Full functional parity is mandatory.** Every legacy capability is listed in the [parity inventory](../legacy-feature-parity.md) with its legacy source, current status, and backend dependency. No capability may be dropped silently.
- **Parity means use case, not implementation.** A capability may be rebuilt differently if the legitimate use case is preserved and the change is recorded with status Changed and a reason.
- **Do not copy insecure or inaccessible behavior.** Replacements must be secure, accessible (WCAG 2.1 AA), and tested.
- **UX baseline** for all new and migrated views: URL-addressable state, keyboard and screen-reader support, light and dark mode, German and English, usable at about 390 px width, visible loading, empty, and error states, confirmation and undo for destructive actions.
- New capabilities beyond the legacy UI (GeoJSON import and export, exclusion zones, backups, undo) are kept and must not regress.

## Consequences

- Migration is complete only when every inventory row is Present or has an accepted Changed decision, with a passing regression or acceptance test.
- Several rows depend on backend capabilities and cannot be closed by the frontend alone.

## Open questions

The decisions listed in the inventory: owner and contact data (L5), Google imagery (L9), custom theme colors (L19), runtime API configuration (L23).
