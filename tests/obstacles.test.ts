import { describe, expect, it } from 'vitest';
import { BARRIER_HP, CAMPAIGN, MINE_UNITS } from '@/data';
import { buildLevel } from '@/sim/level';
import { drainEvents, step } from '@/sim/update';
import { addGroup, makeState, node } from './helpers';

const DT = 1 / 60;
const run = (s: ReturnType<typeof makeState>, ticks: number) => {
  for (let i = 0; i < ticks; i++) step(s, DT);
};

describe('reef barriers', () => {
  it('consumes units of a group that hits it and breaks once the hit points are spent', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 40 },
        { x: 200, y: 0, owner: 2, units: 5 },
      ],
      [[0, 1]],
    );
    s.barriers.push({ a: 0, b: 1, t: 0.5, x: 100, y: 0, hp: 10, maxHp: 10 });
    // 30 sporen (str 1) -> 10 spent on the barrier, 20 continue.
    addGroup(s, { owner: 1, n: 30, from: 0, to: 1, t: 0.45 });
    run(s, 30);
    const ev = drainEvents(s);
    expect(ev.some((e) => e.type === 'barrier' && e.broken)).toBe(true);
    expect(s.barriers).toHaveLength(0);
    const g = s.groups[0];
    expect(g).toBeDefined();
    expect(g?.n).toBeCloseTo(20, 5);
  });

  it('stops a weaker group entirely and keeps the remaining hit points', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 40 },
        { x: 200, y: 0, owner: 2, units: 5 },
      ],
      [[0, 1]],
    );
    s.barriers.push({ a: 0, b: 1, t: 0.5, x: 100, y: 0, hp: BARRIER_HP, maxHp: BARRIER_HP });
    addGroup(s, { owner: 1, n: 6, from: 0, to: 1, t: 0.45 });
    run(s, 30);
    expect(s.groups).toHaveLength(0);
    expect(s.barriers[0]?.hp).toBeCloseTo(BARRIER_HP - 6, 5);
    expect(node(s, 1).owner).toBe(2);
  });

  it('works in both directions along the edge', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 5 },
        { x: 200, y: 0, owner: 2, units: 40 },
      ],
      [[0, 1]],
    );
    s.barriers.push({ a: 0, b: 1, t: 0.3, x: 60, y: 0, hp: 5, maxHp: 5 });
    addGroup(s, { owner: 2, n: 8, from: 1, to: 0, t: 0.6 });
    run(s, 40);
    expect(s.barriers).toHaveLength(0);
    expect(s.groups[0]?.n).toBeCloseTo(3, 5);
  });
});

describe('mines', () => {
  it('destroys up to MINE_UNITS of the first group and is then spent', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 40 },
        { x: 200, y: 0, owner: 2, units: 5 },
      ],
      [[0, 1]],
    );
    s.mines.push({ a: 0, b: 1, t: 0.5, x: 100, y: 0, units: MINE_UNITS });
    addGroup(s, { owner: 1, n: 20, from: 0, to: 1, t: 0.45 });
    run(s, 20);
    expect(s.mines).toHaveLength(0);
    expect(s.groups[0]?.n).toBeCloseTo(20 - MINE_UNITS, 5);
    expect(drainEvents(s).some((e) => e.type === 'mine' && e.killed === MINE_UNITS)).toBe(true);
    // a second group passes untouched
    addGroup(s, { owner: 1, n: 5, from: 0, to: 1, t: 0.45 });
    run(s, 20);
    expect(s.groups.some((g) => Math.abs(g.n - 5) < 1e-6)).toBe(true);
  });
});

describe('generation', () => {
  it('places the configured number of obstacles on edges away from start nodes, deterministically', () => {
    for (const def of CAMPAIGN) {
      const s = buildLevel(def),
        s2 = buildLevel(def);
      expect(s.barriers.length).toBe(Math.min(def.barriers ?? 0, s.barriers.length));
      expect(s.mines.length).toBeLessThanOrEqual(def.mines ?? 0);
      expect(JSON.stringify(s.barriers)).toBe(JSON.stringify(s2.barriers));
      expect(JSON.stringify(s.mines)).toBe(JSON.stringify(s2.mines));
      const starts = new Set(s.nodes.filter((n) => n.owner > 0).map((n) => n.id));
      for (const b of s.barriers) expect(starts.has(b.a) || starts.has(b.b)).toBe(false);
      for (const m of s.mines) expect(starts.has(m.a) || starts.has(m.b)).toBe(false);
      const edges = new Set(s.edges.map(([a, b]) => `${a}-${b}`));
      for (const o of [...s.barriers, ...s.mines]) expect(edges.has(`${o.a}-${o.b}`)).toBe(true);
    }
    const hard = CAMPAIGN[17];
    expect(hard?.barriers).toBeGreaterThan(0);
    expect(buildLevel(hard as (typeof CAMPAIGN)[number]).barriers.length).toBeGreaterThan(0);
  });
});
