import { expect, test } from '@playwright/test';
import { startLevel } from './helpers';

test('editor: place nodes, connect them, set owners, export JSON, play-test', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'mouse only');
  await page.goto('./');
  await page.getByRole('button', { name: /^Editor$/ }).click();
  await expect(page.locator('.edbar')).toBeVisible();
  const view = await page.evaluate(() => {
    const v = (window as unknown as { TL: { view: { sx(x: number): number; sy(y: number): number } } }).TL
      .view;
    return { a: [v.sx(300), v.sy(400)], b: [v.sx(800), v.sy(400)], c: [v.sx(1300), v.sy(400)] };
  });
  const click = async (p: number[]) => page.mouse.click(p[0] as number, p[1] as number);
  await click(view.a);
  await click(view.b);
  await click(view.c);
  await page.getByRole('button', { name: 'Kante' }).click();
  for (const [from, to] of [
    [view.a, view.b],
    [view.b, view.c],
  ]) {
    await page.mouse.move((from as number[])[0] as number, (from as number[])[1] as number);
    await page.mouse.down();
    await page.mouse.move((to as number[])[0] as number, (to as number[])[1] as number, { steps: 8 });
    await page.mouse.up();
  }
  await page.getByRole('button', { name: 'Besitzer' }).click();
  await click(view.a); // player
  await click(view.c);
  await click(view.c); // enemy 1
  await page.getByRole('button', { name: 'Export' }).click();
  const json = await page.locator('#edText').inputValue();
  const map = JSON.parse(json) as { nodes: { owner?: number }[]; edges: number[][] };
  expect(map.nodes).toHaveLength(3);
  expect(map.edges).toHaveLength(2);
  expect(map.nodes[0]?.owner).toBe(1);
  expect(map.nodes[2]?.owner).toBe(2);
  await page.getByRole('button', { name: 'Schließen' }).click();
  await page.getByRole('button', { name: /Testen/ }).click();
  await startLevel(page);
  await page.waitForTimeout(300);
  const owners = await page.evaluate(() =>
    (window as unknown as { TL: { nodes: { owner: number }[] } }).TL.nodes.map((n) => n.owner),
  );
  expect(owners).toEqual([1, 0, 2]);
});
