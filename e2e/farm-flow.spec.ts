import { clickMap, expect, test } from './fixtures';

test('creates a farm by drawing a field, then adds an exclusion zone', async ({ page }) => {
  await page.goto('/farms/new');
  await page.getByLabel('Betriebsname').fill('E2E-Hof');

  await page.getByRole('button', { name: 'Schlag zeichnen' }).click();
  await clickMap(page, [
    [0.3, 0.3],
    [0.7, 0.3],
    [0.7, 0.7],
    [0.3, 0.7],
    [0.3, 0.3], // clicking the first vertex closes the polygon
  ]);
  await expect(page.getByRole('textbox', { name: /Name des Schlags/ })).toHaveValue('Schlag 1');

  await page.getByRole('button', { name: 'Farm anlegen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'E2E-Hof' })).toBeVisible();
  await expect(page.getByText('Farm „E2E-Hof“ wurde angelegt.')).toBeVisible();

  // Select the field and cut an exclusion zone out of it.
  const fieldButton = page.getByRole('button', { name: /Schlag 1/ });
  const grossArea = await fieldButton.locator('span').last().textContent();
  await fieldButton.click();
  await page.getByRole('button', { name: 'Ausschlussfläche zeichnen' }).click();
  await clickMap(page, [
    [0.45, 0.45],
    [0.55, 0.45],
    [0.55, 0.55],
    [0.45, 0.45],
  ]);
  await expect(page.getByText('Ausschlussfläche 1 ·')).toBeVisible();
  await expect(fieldButton.locator('span').last()).not.toHaveText(grossArea!);

  // Everything survives a reload (localStorage).
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'E2E-Hof' })).toBeVisible();
  await expect(page.getByText('Ausschlussfläche 1 ·')).toBeVisible();
});

test('remembers the base layer chosen in the layer switcher', async ({ page }) => {
  await page.goto('/farms/farm-1');
  await page.locator('.leaflet-control-layers').hover();
  await page.getByLabel('Luftbild (Esri)').check();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('farmplan-storage')!).state.baseLayer);
  expect(stored).toBe('satellite');
});

test('shows a treeline preview for the selected field', async ({ page }) => {
  await page.goto('/farms/farm-1?field=f-101');
  await expect(page.locator('.leaflet-overlay-pane path[stroke="#7c3aed"]').first()).toBeAttached();
});

test('navigates with the mobile menu @mobile', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto('/');
  await page.getByRole('button', { name: 'Menü öffnen' }).click();
  await page.getByRole('link', { name: 'Pflanzen-Inventar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Pflanzen-Datenbank (Syntropie)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menü öffnen' })).toHaveAttribute('aria-expanded', 'false');
});

test('centers the map on a field selected in the list', async ({ page }) => {
  await page.goto('/farms/farm-2');
  await page.getByRole('button', { name: /Kiefernkämpe/ }).click();

  // The selected (orange) outline sits in the middle of the map.
  const map = (await page.getByRole('region', { name: 'Karte der Schläge' }).boundingBox())!;
  const selected = page.locator('.leaflet-overlay-pane path[stroke="#f59e0b"]');
  await expect(async () => {
    const box = (await selected.boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - (map.x + map.width / 2))).toBeLessThan(5);
    expect(Math.abs(box.y + box.height / 2 - (map.y + map.height / 2))).toBeLessThan(5);
  }).toPass();
});
