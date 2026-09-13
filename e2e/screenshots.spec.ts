import { test } from '@playwright/test';
import { startLevel } from './helpers';

// Produces the per-phase screenshots (menu and in-game) for the report.
test('screenshots', async ({ page }, testInfo) => {
  const tag = testInfo.project.name;
  await page.goto('./');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `e2e/screenshots/${tag}-menu.png` });
  await page.getByRole('button', { name: 'Kampagne' }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `e2e/screenshots/${tag}-campaign.png` });
  await page
    .getByRole('button', { name: /8\. |1\. Erstes Leuchten/ })
    .first()
    .click();
  await startLevel(page);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `e2e/screenshots/${tag}-game.png` });
});
