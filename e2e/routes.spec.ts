import { expect, test, type Page } from '@playwright/test';
import { startLevel } from './helpers';

type TL = {
  nodes: { id: number; x: number; y: number; owner: number; units: number; routes: number[][] }[];
  edges: [number, number][];
  groups: { owner: number; n: number }[];
  view: { sx(x: number): number; sy(y: number): number };
};
const tl = (page: Page, meId?: number) =>
  page.evaluate((meId) => {
    const t = (window as unknown as { TL: TL }).TL;
    const me = meId === undefined ? t.nodes.find((n) => n.owner === 1) : t.nodes[meId];
    if (!me) throw new Error('no player node');
    const e = t.edges.find((e) => e[0] === me.id || e[1] === me.id);
    if (!e) throw new Error('no edge');
    const nb = t.nodes[e[0] === me.id ? e[1] : e[0]];
    if (!nb) throw new Error('no neighbour');
    return {
      me: { id: me.id, x: t.view.sx(me.x), y: t.view.sy(me.y), units: me.units, routes: me.routes.length },
      nb: { x: t.view.sx(nb.x), y: t.view.sy(nb.y) },
      groups: t.groups.filter((g) => g.owner === 1).map((g) => g.n),
    };
  }, meId);

test('drawing a line creates a route and units start streaming along it', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'mouse drag only');
  await page.goto('./');
  await page.getByRole('button', { name: 'Kampagne' }).click();
  await page.getByRole('button', { name: /1\. Erstes Leuchten/ }).click();
  await startLevel(page);
  await page.waitForTimeout(300);
  const before = await tl(page);
  await page.mouse.move(before.me.x, before.me.y);
  await page.mouse.down();
  await page.mouse.move(before.nb.x, before.nb.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  const after = await tl(page, before.me.id);
  expect(after.me.routes).toBe(1);
  // No burst: units leave one at a time through the stream.
  await page.waitForTimeout(1500);
  const later = await tl(page, before.me.id);
  expect(later.groups.length).toBeGreaterThanOrEqual(1);
  expect(Math.max(...later.groups)).toBeLessThanOrEqual(1.01);
  // Drawing the same line again keeps a single route.
  await page.mouse.move(before.me.x, before.me.y);
  await page.mouse.down();
  await page.mouse.move(before.nb.x, before.nb.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  expect((await tl(page, before.me.id)).me.routes).toBe(1);
});

test('touch drag works underneath the HUD info block', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'touch only');
  await page.goto('./');
  await page.getByRole('button', { name: 'Kampagne' }).tap();
  await page.getByRole('button', { name: /1\. Erstes Leuchten/ }).tap();
  await startLevel(page);
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
  await startLevel(page);
  await page.waitForTimeout(300);
  const t = await tl(page);
  await page.mouse.move(t.me.x, t.me.y);
  await page.mouse.down();
  await page.mouse.move(t.nb.x, t.nb.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  expect((await tl(page, t.me.id)).me.routes).toBe(1);
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
  expect((await tl(page, t.me.id)).me.routes).toBe(0);
});

test('on a phone in landscape no node is covered by HUD chrome', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'phone layout only');
  await page.goto('./');
  await page.getByRole('button', { name: 'Kampagne' }).tap();
  await page.getByRole('button', { name: /1\. Erstes Leuchten/ }).tap();
  await startLevel(page);
  await page.waitForTimeout(300);
  const covered = await page.evaluate(() => {
    const t = (window as unknown as { TL: TL & { view: { offsetY: number } } }).TL;
    const hits: string[] = [];
    for (const n of t.nodes) {
      const el = document.elementFromPoint(t.view.sx(n.x), t.view.sy(n.y));
      if (el && el.id !== 'c') hits.push(`${n.id}:${el.id || el.className}`);
    }
    return { hits, offsetY: t.view.offsetY };
  });
  expect(covered.hits).toEqual([]);
  expect(covered.offsetY).toBeGreaterThanOrEqual(44);
});
