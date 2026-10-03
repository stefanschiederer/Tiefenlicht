import { expect, test } from '@playwright/test';
import { drag, snap, startAt } from './helpers';

test('start screen loads without errors and a level starts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await startAt(page, 1, false);
  await expect(page.locator('.level-big')).toHaveText('Level 1');
  await page.getByRole('button', { name: 'Spielen' }).click();
  await expect(page.locator('#hud')).toBeVisible();
  expect((await snap(page)).mode).toBe('play');
  expect(errors).toEqual([]);
});

test('dragging from the blue tower draws a line and troops march', async ({ page }) => {
  await startAt(page, 1);
  const s = await snap(page);
  const me = s.towers.find((t) => t.owner === 1)!;
  const target = s.towers[1]!;
  await drag(page, me.x, me.y - 10, target.x, target.y - 10);
  await page.waitForTimeout(200);
  const after = await snap(page);
  expect(after.lines).toEqual([{ src: me.id, dst: target.id, owner: 1 }]);
  await page.waitForTimeout(1200);
  expect((await snap(page)).troops).toBeGreaterThan(0);
});

test('swiping across a line cuts it', async ({ page }) => {
  await startAt(page, 1);
  const s = await snap(page);
  const me = s.towers.find((t) => t.owner === 1)!;
  const target = s.towers[1]!;
  await drag(page, me.x, me.y - 10, target.x, target.y - 10);
  await page.waitForTimeout(300);
  expect((await snap(page)).lines).toHaveLength(1);
  const mx = (me.x + target.x) / 2,
    my = (me.y + target.y) / 2;
  const dx = target.y - me.y,
    dy = me.x - target.x,
    l = Math.hypot(dx, dy);
  await drag(page, mx - (dx / l) * 60, my - (dy / l) * 60, mx + (dx / l) * 60, my + (dy / l) * 60);
  await page.waitForTimeout(100);
  expect((await snap(page)).lines).toHaveLength(0);
});

test('touch: tapping Spielen works and the pause menu opens', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'touch only');
  await startAt(page, 1, false);
  await page.getByRole('button', { name: 'Spielen' }).tap();
  await page.getByRole('button', { name: 'Pause' }).tap();
  await expect(page.getByRole('button', { name: 'Weiter' })).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).tap();
  expect((await snap(page)).mode).toBe('play');
});

test('campaign map: finished levels can be replayed, locked ones not', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('tiefenlicht-towerwar-v1', JSON.stringify({ level: 5, sound: false }));
  });
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'Level 5', exact: true }).first()).toBeVisible();
  await expect(page.locator('.lvl.done')).toHaveCount(4);
  await expect(page.locator('.lvl.locked').first()).toBeDisabled();
  await page.locator('.lvl.done[data-lv="2"]').click();
  await expect(page.locator('.level-big')).toHaveText('Level 2');
  await page.getByRole('button', { name: 'Karte' }).click();
  await expect(page.locator('.lvl.current')).toHaveText('5');
});

test('the guide explains the rules and every tower', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.getByRole('button', { name: 'Anleitung' }).click();
  await expect(page.getByRole('heading', { name: "So geht's" })).toBeVisible();
  await expect(page.locator('.kind')).toHaveCount(7);
  await page.getByRole('button', { name: 'Zur Karte' }).click();
  await expect(page.locator('#playCur')).toBeVisible();
});

test('manifest and service worker are served', async ({ request }) => {
  expect((await request.get('./manifest.webmanifest')).ok()).toBe(true);
  expect((await request.get('./sw.js')).ok()).toBe(true);
});
