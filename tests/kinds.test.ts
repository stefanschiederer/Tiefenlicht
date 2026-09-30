import { describe, expect, it } from 'vitest';
import { KINDS, NEUTRAL, PLAYER } from '@/game/config';
import { levelDef } from '@/game/levels';
import { addLine, createGame, drainEvents, step } from '@/game/sim';
import type { LevelDef } from '@/game/state';

const DT = 1 / 60;
const run = (s: ReturnType<typeof createGame>, sec: number) => {
  for (let i = 0; i < Math.round(sec / DT); i++) step(s, DT);
};
const def = (towers: LevelDef['towers']): LevelDef => ({
  n: 99,
  towers,
  walls: [],
  aiInterval: 2,
  aiDelay: 0,
});

describe('tower kinds', () => {
  it('barracks produce twice as fast', () => {
    const s = createGame(
      def([
        { x: 100, y: 1100, owner: PLAYER, troops: 0 },
        { x: 600, y: 1100, owner: PLAYER, troops: 0, kind: 'barracks' },
        { x: 360, y: 100, owner: 2, troops: 5 },
      ]),
    );
    run(s, 4);
    expect(s.towers[0]!.troops).toBeGreaterThanOrEqual(3);
    expect(s.towers[1]!.troops).toBeGreaterThanOrEqual(2 * s.towers[0]!.troops - 1);
  });

  it('fortresses take half damage per attacker', () => {
    const s = createGame(
      def([
        { x: 360, y: 1150, owner: PLAYER, troops: 10 },
        { x: 360, y: 400, owner: NEUTRAL, troops: 4, kind: 'fortress' },
        { x: 60, y: 60, owner: 2, troops: 1 },
      ]),
    );
    s.towers[0]!.acc = -1000;
    addLine(s, 0, 1, PLAYER);
    const events = [];
    for (let i = 0; i < 12 * 60; i++) {
      step(s, DT);
      events.push(...drainEvents(s));
    }
    // 4 troops at half damage: 8 hits bring it to 0, the 9th takes it
    const until = events.findIndex((e) => e.type === 'capture');
    expect(until).toBeGreaterThan(0);
    expect(events.slice(0, until).filter((e) => e.type === 'hit')).toHaveLength(9);
    expect(s.towers[1]!.owner).toBe(PLAYER);
  });

  it('cannons shoot foreign soldiers in range, not their own', () => {
    const s = createGame(
      def([
        { x: 360, y: 1150, owner: PLAYER, troops: 30 },
        { x: 360, y: 300, owner: 2, troops: 10 },
        { x: 520, y: 720, owner: NEUTRAL, troops: 5, kind: 'cannon' },
      ]),
    );
    addLine(s, 0, 1, PLAYER);
    run(s, 10);
    const shots = drainEvents(s).filter((e) => e.type === 'shot');
    expect(shots.length).toBeGreaterThan(3);
    // an own cannon ignores own troops
    const t = createGame(
      def([
        { x: 360, y: 1150, owner: PLAYER, troops: 30 },
        { x: 360, y: 300, owner: 2, troops: 10 },
        { x: 520, y: 720, owner: PLAYER, troops: 5, kind: 'cannon' },
      ]),
    );
    addLine(t, 0, 1, PLAYER);
    run(t, 10);
    expect(drainEvents(t).filter((e) => e.type === 'shot')).toHaveLength(0);
  });

  it.each(['barracks', 'fortress', 'cannon'] as const)('%s is introduced in its campaign level', (kind) => {
    const n = KINDS[kind].from;
    expect(levelDef(n).towers.some((t) => t.kind === kind)).toBe(true);
    expect(levelDef(n - 1).towers.some((t) => t.kind === kind)).toBe(false);
  });
});
