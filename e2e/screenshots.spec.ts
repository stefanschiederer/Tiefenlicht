import { test } from '@playwright/test';
import { drag, snap, startAt } from './helpers';

// Screenshots for the report and the README (e2e/screenshots, copied to docs/).
test('screenshots', async ({ page }, info) => {
  const tag = info.project.name;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('shot'))
      localStorage.setItem('tiefenlicht-towerwar-v1', JSON.stringify({ level: 14, sound: false }));
  });
  await page.goto('./');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `e2e/screenshots/${tag}-map.png` });
  await page.evaluate(() => sessionStorage.setItem('shot', '1'));
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

  await page.goto('./');
  await page.getByRole('button', { name: 'Anleitung' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `e2e/screenshots/${tag}-guide.png`, fullPage: true });
  for (const lv of [12, 16, 20]) {
    await startAt(page, lv, false);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `e2e/screenshots/${tag}-new${lv}.png` });
  }
  for (const lv of [22]) {
    await startAt(page, lv);
    await page.waitForTimeout(10000);
    await page.screenshot({ path: `e2e/screenshots/${tag}-level${lv}.png` });
  }
});
