import { describe, expect, it } from 'vitest';
import { enemiesFor } from '@/game/ai';
import { KINDS, NEUTRAL, PLAYER, TOWER_R, WORLD_H, WORLD_W } from '@/game/config';
import { isPlayable, levelDef } from '@/game/levels';
import { addLine, checkLine, createGame, dropLine, step } from '@/game/sim';
import type { GameState } from '@/game/state';

const LEVELS = Array.from({ length: 60 }, (_, i) => i + 1);

describe('levels', () => {
  it.each(LEVELS)('level %i is valid and playable', (n) => {
    const d = levelDef(n);
    expect(d.n).toBe(n);
    expect(d.towers.filter((t) => t.owner === PLAYER)).toHaveLength(1);
    expect(d.towers.some((t) => t.owner >= 2)).toBe(true);
    for (const t of d.towers) {
      expect(t.x).toBeGreaterThanOrEqual(TOWER_R);
      expect(t.x).toBeLessThanOrEqual(WORLD_W - TOWER_R);
      expect(t.y).toBeGreaterThanOrEqual(TOWER_R);
      expect(t.y).toBeLessThanOrEqual(WORLD_H - TOWER_R);
    }
    for (let a = 0; a < d.towers.length; a++)
      for (let b = a + 1; b < d.towers.length; b++) {
        const A = d.towers[a]!,
          B = d.towers[b]!;
        expect(Math.hypot(A.x - B.x, A.y - B.y)).toBeGreaterThan(TOWER_R * 2.5);
      }
    expect(isPlayable(d)).toBe(true);
  });

  it('is deterministic', () => {
    expect(levelDef(17)).toEqual(levelDef(17));
  });

  it('gets harder: more towers and walls later on', () => {
    expect(levelDef(30).towers.length).toBeGreaterThan(levelDef(4).towers.length);
    expect(levelDef(30).walls.length).toBeGreaterThan(0);
    expect(levelDef(30).aiInterval).toBeLessThan(levelDef(4).aiInterval);
  });
});

/** Simple player bot: attack the weakest reachable non-own tower from the strongest own tower. */
const botSeen = new Map<number, number>();
function cutLine(s: GameState, id: number): void {
  const l = s.lines.find((x) => x.id === id);
  if (l) dropLine(s, l);
}
function playerBot(s: GameState): void {
  // cut attacks that stall, like a player would
  for (const l of s.lines.filter((l) => l.owner === PLAYER)) {
    const d = s.towers[l.dst]!;
    const last = botSeen.get(l.id);
    botSeen.set(l.id, d.troops);
    if (d.owner !== PLAYER && last !== undefined && d.troops >= last - 0.5) cutLine(s, l.id);
    if (d.owner === PLAYER && d.troops > 20) cutLine(s, l.id);
  }
  const mine = s.towers.filter((t) => t.owner === PLAYER).sort((a, b) => b.troops - a.troops);
  for (const t of mine) {
    const targets = s.towers
      .filter(
        (d) =>
          d.owner !== PLAYER &&
          checkLine(s, t.id, d.id, PLAYER) === 'ok' &&
          d.troops / KINDS[d.kind].damage < t.troops,
      )
      .sort((a, b) => a.troops - b.troops);
    const d = targets[0];
    if (d && t.troops >= 6) addLine(s, t.id, d.id, PLAYER);
  }
}

describe('enemy AI', () => {
  it('expands into neutral towers when left alone', () => {
    const s = createGame(levelDef(5));
    const ai = enemiesFor(s);
    const start = s.towers.filter((t) => t.owner >= 2).length;
    for (let i = 0; i < 60 * 40; i++) {
      for (const e of ai) e.update(s, 1 / 60);
      step(s, 1 / 60);
    }
    expect(s.towers.filter((t) => t.owner >= 2).length).toBeGreaterThan(start);
    expect(s.towers.some((t) => t.owner === NEUTRAL && t.troops < 0)).toBe(false);
  });

  it.each([1, 2, 3, 4, 6, 8, 10])('a simple bot can finish level %i against the AI', (n) => {
    const s = createGame(levelDef(n));
    const ai = enemiesFor(s);
    for (let i = 0; i < 60 * 300 && !s.result; i++) {
      if (i % 60 === 0) playerBot(s);
      for (const e of ai) e.update(s, 1 / 60);
      step(s, 1 / 60);
    }
    expect(s.result).not.toBeNull();
  });
});
