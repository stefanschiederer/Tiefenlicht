import { expect, test, type Page } from '@playwright/test';

type TL = {
  nodes: { id: number; x: number; y: number; owner: number; units: number; routes: number[][] }[];
  edges: [number, number][];
  groups: { owner: number; n: number }[];
  view: { sx(x: number): number; sy(y: number): number };
};
const tl = (page: Page) =>
  page.evaluate(() => {
    const t = (window as unknown as { TL: TL }).TL;
    const me = t.nodes.find((n) => n.owner === 1);
    if (!me) throw new Error('no player node');
    const e = t.edges.find((e) => e[0] === me.id || e[1] === me.id);
    if (!e) throw new Error('no edge');
    const nb = t.nodes[e[0] === me.id ? e[1] : e[0]];
    if (!nb) throw new Error('no neighbour');
    return {
      me: { x: t.view.sx(me.x), y: t.view.sy(me.y), units: me.units, routes: me.routes.length },
      nb: { x: t.view.sx(nb.x), y: t.view.sy(nb.y) },
      groups: t.groups.filter((g) => g.owner === 1).map((g) => g.n),
    };
  });

test('drawing a path sends the share and keeps a route; drawing again sends again', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'mouse drag only');
  await page.goto('./');
  await page.getByRole('button', { name: 'Kampagne' }).click();
  await page.getByRole('button', { name: /1\. Erstes Leuchten/ }).click();
  await page.getByRole('button', { name: 'Level starten' }).click();
  await page.waitForTimeout(300);
  const before = await tl(page);
  await page.mouse.move(before.me.x, before.me.y);
  await page.mouse.down();
  await page.mouse.move(before.nb.x, before.nb.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  const after = await tl(page);
  expect(after.me.routes).toBe(1);
  expect(after.groups.length).toBeGreaterThanOrEqual(1);
  expect(after.groups[0] ?? 0).toBeGreaterThanOrEqual(Math.floor(before.me.units * 0.5) - 1);
  // Draw the same path again: sends the share of what is left, route count stays 1.
  await page.mouse.move(before.me.x, before.me.y);
  await page.mouse.down();
  await page.mouse.move(before.nb.x, before.nb.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  const again = await tl(page);
  expect(again.me.routes).toBe(1);
  expect(again.groups.length).toBeGreaterThanOrEqual(2);
});

test('touch drag works underneath the HUD info block', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'touch only');
  await page.goto('./');
  await page.getByRole('button', { name: 'Kampagne' }).tap();
  await page.getByRole('button', { name: /1\. Erstes Leuchten/ }).tap();
  await page.getByRole('button', { name: 'Level starten' }).tap();
  await page.waitForTimeout(300);
  // The brand block (title, level, energy) must not intercept pointer events.
  const blocked = await page.evaluate(() => {
    const el = document.elementFromPoint(60, 60);
    return el ? el.closest('#hud .brand') !== null : false;
  });
  expect(blocked).toBe(false);
});

test('swiping across a route cuts it', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'mouse drag only');
  await page.goto('./');
  await page.getByRole('button', { name: 'Kampagne' }).click();
  await page.getByRole('button', { name: /1\. Erstes Leuchten/ }).click();
  await page.getByRole('button', { name: 'Level starten' }).click();
  await page.waitForTimeout(300);
  const t = await tl(page);
  await page.mouse.move(t.me.x, t.me.y);
  await page.mouse.down();
  await page.mouse.move(t.nb.x, t.nb.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  expect((await tl(page)).me.routes).toBe(1);
  // Swipe perpendicular across the middle of the edge, starting on empty space.
  const mx = (t.me.x + t.nb.x) / 2,
    my = (t.me.y + t.nb.y) / 2;
  const ang = Math.atan2(t.nb.y - t.me.y, t.nb.x - t.me.x) + Math.PI / 2;
  const sx = mx + Math.cos(ang) * 60,
    sy = my + Math.sin(ang) * 60,
    ex = mx - Math.cos(ang) * 60,
    ey = my - Math.sin(ang) * 60;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(ex, ey, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  expect((await tl(page)).me.routes).toBe(0);
});
