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
    .getByRole('button', { name: /8\. |1\. Erster Vorstoß/ })
    .first()
    .click();
  await startLevel(page);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `e2e/screenshots/${tag}-game.png` });
  // draw a line from the player's building to a neighbour and let the stream run
  const pts = await page.evaluate(() => {
    const t = (
      window as unknown as {
        TL: {
          nodes: { id: number; x: number; y: number; owner: number }[];
          edges: [number, number][];
          view: { sx(x: number): number; sy(y: number): number };
        };
      }
    ).TL;
    const me = t.nodes.find((n) => n.owner === 1);
    if (!me) return null;
    const e = t.edges.find((e) => e[0] === me.id || e[1] === me.id);
    if (!e) return null;
    const nb = t.nodes[e[0] === me.id ? e[1] : e[0]];
    if (!nb) return null;
    return { ax: t.view.sx(me.x), ay: t.view.sy(me.y), bx: t.view.sx(nb.x), by: t.view.sy(nb.y) };
  });
  if (pts) {
    await page.mouse.move(pts.ax, pts.ay);
    await page.mouse.down();
    await page.mouse.move(pts.bx, pts.by, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `e2e/screenshots/${tag}-stream.png` });
  }
});
