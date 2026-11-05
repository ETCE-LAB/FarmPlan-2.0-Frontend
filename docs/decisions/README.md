# Architecture decisions

Architecture Decision Records (ADRs) document significant frontend decisions. Each ADR states its status, context, decision, consequences, and open questions. A decision describes intent; the current state is established by code and [architecture.md](../architecture.md).

| ADR                                              | Title                            | Status                         |
| ------------------------------------------------ | -------------------------------- | ------------------------------ |
| [0001](0001-ui-architecture-and-routing.md)      | UI architecture and routing      | Accepted                       |
| [0002](0002-map-engine-and-gis-performance.md)   | Map engine and GIS performance   | Accepted                       |
| [0003](0003-client-state-and-data-fetching.md)   | Client state and data fetching   | Proposed                       |
| [0004](0004-api-contracts-and-error-handling.md) | API contracts and error handling | Proposed                       |
| [0005](0005-legacy-frontend-parity-and-ux.md)    | Legacy frontend parity and UX    | Accepted                       |
| [0006](0006-quality-gates-and-dev-promotion.md)  | Quality gates and dev promotion  | Accepted (enforcement pending) |

**Accepted** describes what the code does today. **Proposed** describes the intended direction and needs review before implementation. New ADRs use the next number and the same structure; supersede old ADRs instead of rewriting them.
