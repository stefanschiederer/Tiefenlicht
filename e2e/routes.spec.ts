import { expect, test, type Page } from '@playwright/test';

type TL = {
  nodes: { id: number; nx: number; ny: number; owner: number; units: number; routes: number[][] }[];
  edges: [number, number][];
  groups: { owner: number; n: number }[];
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
    const W = innerWidth,
      H = innerHeight;
    return {
      me: { x: me.nx * W, y: me.ny * H, units: me.units, routes: me.routes.length },
      nb: { x: nb.nx * W, y: nb.ny * H },
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
  const first = after.groups[0] ?? 0;
  expect(first).toBeGreaterThanOrEqual(Math.floor(before.me.units * 0.5) - 1);
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
