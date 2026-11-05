# ADR 0001: UI architecture and routing

- **Status:** Accepted
- **Date:** November 5, 2026

## Context

The legacy UI ([ETCE-LAB/FarmPlan](https://github.com/ETCE-LAB/FarmPlan)) was a JavaScript React app with tab state in `App.jsx`: views were not addressable by URL, the back button did not work, and state, theme, and layout were mixed in one component. The repository started from the React Router framework template with server-side rendering, which needs a Node server at runtime.

## Decision

- Build a **client-side single-page application** with React 19, TypeScript in strict mode, and Vite 8. No server-side rendering and no server runtime; production serves static files from nginx.
- Use **React Router 8 in declarative mode** (`BrowserRouter`, `<Routes>`). Every view has a URL; shareable view state such as filters, selection, and sorting lives in query parameters.
- Layout: one page per route in `src/pages` (default export, so pages can be lazy-loaded), reusable components in `src/components`, pure logic in `src/lib`, domain types in `src/types`.
- The app shell (`Sidebar`, `TopBar`, `ErrorBoundary`, `ConfirmDialogHost`, `Toaster`) lives in `App.tsx`. The `ErrorBoundary` is keyed by path, so a crashed page recovers after navigation.
- Pages with heavy dependencies are loaded with `lazy()` and `Suspense`.

## Consequences

- Deep links require the server to fall back to `index.html`; `nginx.conf` does this.
- Without SSR, the first paint depends on JavaScript. The theme class is set in an inline script in `index.html` to avoid a flash.
- Data loading must be handled in the client (see [ADR 0003](0003-client-state-and-data-fetching.md)). React Router data APIs (loaders, actions) are not used for now.

## Open questions

- Whether to adopt React Router data mode or a query library for loaders once the backend is connected.
- Whether authenticated and public routes need separate layouts.
