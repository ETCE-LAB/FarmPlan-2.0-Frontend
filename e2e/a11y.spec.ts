import AxeBuilder from '@axe-core/playwright';
import { expect, seedPreferences, test } from './fixtures';

const ROUTES = ['/', '/farms', '/farms/new', '/farms/farm-1?field=f-101', '/plants', '/plants/p-1', '/settings'];

for (const theme of ['light', 'dark'] as const) {
  for (const route of ROUTES) {
    test(`${route} has no accessibility violations (${theme}) @mobile`, async ({ page }) => {
      await seedPreferences(page, { theme, language: 'de' });
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // Leaflet's own controls and tiles are third-party markup.
        .exclude('.leaflet-container')
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual(
        [],
      );
    });
  }
}
