import { test } from '@playwright/test';
import { drag, snap, startAt } from './helpers';

// Screenshots for the report and the README (e2e/screenshots, copied to docs/).
test('screenshots', async ({ page }, info) => {
  const tag = info.project.name;
  await startAt(page, 1, false);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `e2e/screenshots/${tag}-start.png` });
  await page.getByRole('button', { name: 'Spielen' }).click();
  await page.waitForTimeout(1500);
  const s = await snap(page);
  const me = s.towers.find((t) => t.owner === 1)!;
  await drag(page, me.x, me.y - 10, s.towers[1]!.x, s.towers[1]!.y - 10);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `e2e/screenshots/${tag}-march.png` });

  for (const lv of [4, 6, 8]) {
    await startAt(page, lv, false);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `e2e/screenshots/${tag}-new${lv}.png` });
  }
  await startAt(page, 14);
  await page.waitForTimeout(12000);
  await page.screenshot({ path: `e2e/screenshots/${tag}-level14.png` });
});
