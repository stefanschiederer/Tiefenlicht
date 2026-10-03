import { enemiesFor } from './ai';
import { KINDS, PLAYER } from './config';
import { addLine, checkLine, createGame, dropLine, step } from './sim';
import type { GameState, LevelDef } from './state';

/**
 * A deliberately simple player bot used to check that levels are beatable: it attacks the weakest
 * reachable tower it can beat from its strongest towers and cuts attacks that stall.
 */
export function botMove(s: GameState, seen: Map<number, number>): void {
  for (const l of s.lines.filter((l) => l.owner === PLAYER)) {
    const d = s.towers[l.dst];
    if (!d) continue;
    const last = seen.get(l.id);
    seen.set(l.id, d.troops);
    const stuck = d.owner !== PLAYER && last !== undefined && d.troops >= last - 0.5;
    if (stuck || (d.owner === PLAYER && d.troops > 20)) dropLine(s, l);
  }
  for (const t of s.towers.filter((t) => t.owner === PLAYER).sort((a, b) => b.troops - a.troops)) {
    if (t.troops < 6) continue;
    const target = s.towers
      .filter(
        (x) =>
          x.owner !== PLAYER &&
          checkLine(s, t.id, x.id, PLAYER) === 'ok' &&
          x.troops / KINDS[x.kind].damage < t.troops,
      )
      .sort((a, b) => a.troops - b.troops)[0];
    if (target) addLine(s, t.id, target.id, PLAYER);
  }
}

/** Plays a level with the bot (deciding every `every` ticks) against the AI. Returns the result. */
export function botGame(def: LevelDef, every: number, maxSeconds = 300): { win: boolean; seconds: number } {
  const s = createGame(def);
  const ai = enemiesFor(s);
  const seen = new Map<number, number>();
  let i = 0;
  for (; i < 60 * maxSeconds && !s.result; i++) {
    if (i % every === 0) botMove(s, seen);
    for (const e of ai) e.update(s, 1 / 60);
    step(s, 1 / 60);
  }
  return { win: s.result === 'win', seconds: i / 60 };
}

export const BOT_SPEEDS = [40, 60, 90] as const;
/** Wins the calibration bot needs out of three games: all early on, fewer later. */
export function requiredWins(n: number): number {
  return n <= 15 ? 3 : n <= 30 ? 2 : 1;
}
