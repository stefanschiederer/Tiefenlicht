import { expect, test } from '@playwright/test';
import { startLevel } from './helpers';

test('menu loads without errors and a level can be started', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Tiefenlicht' })).toBeVisible();
  await page.getByRole('button', { name: 'Kampagne' }).click();
  await page.getByRole('button', { name: /1\. Erstes Leuchten/ }).click();
  await startLevel(page);
  await expect(page.locator('#hud')).toBeVisible();
  await page.waitForTimeout(500);
  const nodes = await page.evaluate(
    () => (window as unknown as { TL: { nodes: unknown[] } }).TL.nodes.length,
  );
  expect(nodes).toBe(7);
  expect(errors).toEqual([]);
});

test('manifest and service worker are served', async ({ page, request }) => {
  await page.goto('./');
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();
  const res = await request.get(new URL(manifestHref ?? '', page.url()).toString());
  expect(res.ok()).toBe(true);
  const manifest = (await res.json()) as { display: string; orientation: string; icons: unknown[] };
  expect(manifest.display).toBe('fullscreen');
  expect(manifest.orientation).toBe('landscape');
  expect(manifest.icons.length).toBeGreaterThan(5);
  const sw = await request.get(new URL('sw.js', page.url()).toString());
  expect(sw.ok()).toBe(true);
});
