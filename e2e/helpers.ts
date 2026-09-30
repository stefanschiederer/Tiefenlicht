import type { Page } from '@playwright/test';

export interface Snap {
  mode: string;
  level: number;
  towers: { id: number; owner: number; troops: number; x: number; y: number }[];
  lines: { src: number; dst: number; owner: number }[];
  troops: number;
}

/** Reads the running game through the window.TW test hook (tower positions in screen px). */
export function snap(page: Page): Promise<Snap> {
  return page.evaluate(() => {
    type T = { id: number; owner: number; troops: number; x: number; y: number };
    const app = (
      window as unknown as {
        TW: {
          mode: string;
          state: { def: { n: number }; towers: T[]; lines: Snap['lines']; troops: unknown[] };
          renderer: { view: { sx(x: number, y: number): number; sy(x: number, y: number): number } };
        };
      }
    ).TW;
    const v = app.renderer.view;
    return {
      mode: app.mode,
      level: app.state.def.n,
      towers: app.state.towers.map((t) => ({
        id: t.id,
        owner: t.owner,
        troops: t.troops,
        x: v.sx(t.x, t.y),
        y: v.sy(t.x, t.y),
      })),
      lines: app.state.lines.map((l) => ({ src: l.src, dst: l.dst, owner: l.owner })),
      troops: app.state.troops.length,
    };
  });
}

/** Opens the game at a given level (fresh save) and presses "Spielen". */
export async function startAt(page: Page, level = 1, play = true): Promise<void> {
  await page.addInitScript((lv) => {
    localStorage.setItem('tiefenlicht-towerwar-v1', JSON.stringify({ level: lv, sound: false }));
  }, level);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  // the app opens on the campaign map; the big button opens the current level
  await page.locator('#playCur').click();
  await page.getByRole('button', { name: 'Spielen' }).waitFor();
  if (play) await page.getByRole('button', { name: 'Spielen' }).click();
}

/** Drags with the mouse (desktop) from one screen point to another. */
export async function drag(page: Page, x1: number, y1: number, x2: number, y2: number): Promise<void> {
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  await page.mouse.move(x2, y2, { steps: 14 });
  await page.mouse.up();
}
