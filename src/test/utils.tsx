import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import axe from 'axe-core';
import { expect } from 'vitest';

/** Exposes the current URL to assertions via `[data-testid=location]`. */
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

/** Renders `ui` inside a router at `route`; pass `path` when the component reads route params. */
export function renderWithRouter(ui: ReactElement, { route = '/', path }: { route?: string; path?: string } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {path ? (
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={null} />
        </Routes>
      ) : (
        ui
      )}
      <LocationProbe />
    </MemoryRouter>,
  );
}

/**
 * Structural accessibility check (labels, roles, names). Color contrast cannot be measured in jsdom;
 * it is covered by the token contrast test and the Playwright axe scans.
 */
export async function expectNoAxeViolations(container: Element) {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
  );
  expect(summary).toEqual([]);
}
