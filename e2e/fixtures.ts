import { test as base, expect, type Page } from '@playwright/test';

/** Map tiles come from third-party servers; tests run offline and do not need them. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(/tile\.openstreetmap\.org|arcgisonline\.com|opentopomap\.org/, (route) => route.abort());
    await use(page);
  },
});

export { expect };

/** Seeds preferences before the app boots (the store merges them with the demo data). */
export async function seedPreferences(page: Page, preferences: Record<string, unknown>) {
  await page.addInitScript((state) => {
    localStorage.setItem('farmplan-storage', JSON.stringify({ state, version: 1 }));
  }, preferences);
}

/** Clicks points on the map given as fractions of its size. */
export async function clickMap(page: Page, points: [number, number][]) {
  const map = page.getByRole('region', { name: 'Karte der Schläge' });
  const box = (await map.boundingBox())!;
  for (const [fx, fy] of points) {
    await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
  }
}
