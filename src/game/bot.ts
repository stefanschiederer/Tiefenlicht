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
  // defend: answer an enemy line into one of our towers with a line back to its source (troops clash)
  for (const l of s.lines) {
    if (l.owner === PLAYER) continue;
    const d = s.towers[l.dst];
    const src = s.towers[l.src];
    if (!d || !src || d.owner !== PLAYER) continue;
    if (s.lines.some((x) => x.owner === PLAYER && x.src === d.id && x.dst === src.id)) continue;
    if (checkLine(s, d.id, src.id, PLAYER) === 'ok') addLine(s, d.id, src.id, PLAYER);
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
  if (n % 10 === 0) return 1; // boss levels may be tough, but must be beatable
  return n <= 15 ? 3 : n <= 30 ? 2 : 1;
}
