import { describe, expect, it } from 'vitest';
import { KINDS, NEUTRAL, PLAYER } from '@/game/config';
import { levelDef } from '@/game/levels';
import { addLine, createGame, drainEvents, lineLimit, step } from '@/game/sim';
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

describe('rocket swarm', () => {
  it('destroys troops in an enemy tower after the flight, never below 0, with splash', async () => {
    const { fireRockets } = await import('@/game/sim');
    const s = createGame(
      def([
        { x: 360, y: 1150, owner: PLAYER, troops: 10 },
        { x: 360, y: 300, owner: 2, troops: 30 },
        { x: 460, y: 330, owner: 2, troops: 30 },
        { x: 100, y: 600, owner: NEUTRAL, troops: 10 },
      ]),
    );
    expect(fireRockets(s, 3, 15, 0)).toBe(false); // neutral towers cannot be targeted
    expect(fireRockets(s, 1, 15, 0.4)).toBe(true);
    s.towers[1]!.acc = -1000;
    s.towers[2]!.acc = -1000;
    run(s, 0.3);
    expect(s.towers[1]!.troops).toBe(30);
    run(s, 1.5);
    expect(s.towers[1]!.troops).toBeCloseTo(15, 5);
    expect(s.towers[2]!.troops).toBeCloseTo(30 - 15 * 0.4, 5);
    expect(fireRockets(s, 1, 100, 0)).toBe(true);
    run(s, 2);
    expect(s.towers[1]!.troops).toBe(0);
    expect(s.towers[1]!.owner).toBe(2);
  });
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
    for (let i = 0; i < 25 * 60; i++) {
      step(s, DT);
      events.push(...drainEvents(s));
    }
    // 4 troops at half damage: 8 hits bring it to 0, the 9th takes it
    const until = events.findIndex((e) => e.type === 'capture');
    expect(until).toBeGreaterThan(0);
    expect(events.slice(0, until).filter((e) => e.type === 'hit')).toHaveLength(9);
    expect(s.towers[1]!.owner).toBe(PLAYER);
  });

  it('cannon range grows with its troops', async () => {
    const { cannonRange } = await import('@/game/sim');
    const s = createGame(def([{ x: 100, y: 100, owner: NEUTRAL, troops: 0, kind: 'cannon' }]));
    const c = s.towers[0]!;
    const small = cannonRange(c);
    c.troops = 50;
    expect(cannonRange(c)).toBeGreaterThan(small * 2);
  });

  it('cannons shoot foreign soldiers in range, not their own', () => {
    const s = createGame(
      def([
        { x: 360, y: 1150, owner: PLAYER, troops: 30 },
        { x: 360, y: 300, owner: 2, troops: 10 },
        { x: 520, y: 720, owner: NEUTRAL, troops: 40, kind: 'cannon' },
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
        { x: 520, y: 720, owner: PLAYER, troops: 40, kind: 'cannon' },
      ]),
    );
    addLine(t, 0, 1, PLAYER);
    run(t, 10);
    expect(drainEvents(t).filter((e) => e.type === 'shot')).toHaveLength(0);
  });

  it('riders from a stable arrive almost twice as fast', () => {
    const mk = (kind: 'tower' | 'stable') =>
      createGame(
        def([
          { x: 360, y: 1150, owner: PLAYER, troops: 20, kind },
          { x: 360, y: 150, owner: NEUTRAL, troops: 50 },
          { x: 60, y: 640, owner: 2, troops: 1 },
        ]),
      );
    const firstHit = (s: ReturnType<typeof createGame>) => {
      addLine(s, 0, 1, PLAYER);
      for (let i = 0; i < 60 * 20; i++) {
        step(s, DT);
        if (drainEvents(s).some((e) => e.type === 'hit')) return i * DT;
      }
      return Infinity;
    };
    const slow = firstHit(mk('tower')),
      fast = firstHit(mk('stable'));
    expect(fast).toBeLessThan(slow * 0.65);
  });

  it('a castle holds one line more', () => {
    const s = createGame(
      def([
        { x: 100, y: 1100, owner: PLAYER, troops: 5 },
        { x: 600, y: 1100, owner: PLAYER, troops: 5, kind: 'castle' },
        { x: 360, y: 100, owner: 2, troops: 5 },
      ]),
    );
    expect(lineLimit(s.towers[0]!)).toBe(1);
    expect(lineLimit(s.towers[1]!)).toBe(2);
  });

  it('a mage tower strikes the strongest enemy tower in range', () => {
    const s = createGame(
      def([
        { x: 360, y: 900, owner: PLAYER, troops: 5, kind: 'mage' },
        { x: 200, y: 700, owner: 2, troops: 10 },
        { x: 520, y: 700, owner: 2, troops: 30 },
        { x: 360, y: 100, owner: 2, troops: 40 },
      ]),
    );
    run(s, 7.1);
    const zaps = drainEvents(s).filter((e) => e.type === 'zap');
    expect(zaps).toHaveLength(1);
    // tower 3 is stronger but out of range
    expect(zaps[0]?.type === 'zap' && zaps[0].target.id).toBe(2);
  });

  it.each(['barracks', 'fortress', 'cannon', 'stable', 'castle', 'mage'] as const)(
    '%s is introduced in its campaign level',
    (kind) => {
      const n = KINDS[kind].from;
      expect(levelDef(n).towers.some((t) => t.kind === kind)).toBe(true);
      expect(levelDef(n - 1).towers.some((t) => t.kind === kind)).toBe(false);
    },
  );
});
