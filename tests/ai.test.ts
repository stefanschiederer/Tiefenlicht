import { describe, expect, it } from 'vitest';
import { CAMPAIGN, type LevelDef } from '@/data';
import { aiAct, frontier } from '@/ai/bot';
import { buildLevel } from '@/sim/level';
import { Rng } from '@/sim/rng';
import type { GameState } from '@/sim/state';
import { drainEvents, step } from '@/sim/update';
import { addGroup, cloneState, makeState, node } from './helpers';

const F = 2;

describe('frontier', () => {
  it('lists non-own nodes reachable through own territory with their paths', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: F, units: 10 },
        { x: 100, y: 0, owner: F, units: 10 },
        { x: 200, y: 0, owner: 0, units: 10 },
        { x: 300, y: 0, owner: 1, units: 10 },
        { x: 0, y: 100, owner: 1, units: 10 },
      ],
      [
        [0, 1],
        [1, 2],
        [2, 3],
        [0, 4],
      ],
    );
    const f = frontier(s, node(s, 0), F);
    expect([...f.entries()].sort((a, b) => a[0] - b[0])).toEqual([
      [2, [1, 2]],
      [4, [4]],
    ]);
  });
});

describe('aiAct', () => {
  it('reinforces a threatened node with a line from its strongest own neighbour', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: F, units: 5 },
        { x: 100, y: 0, owner: F, units: 20 },
        { x: 0, y: 100, owner: F, units: 10 },
        { x: -100, y: 0, owner: 1, units: 40 },
      ],
      [
        [0, 1],
        [0, 2],
        [0, 3],
      ],
      { def: { aiUpgrades: false } },
    );
    addGroup(s, { owner: 1, n: 10, from: 3, to: 0, t: 0.2 });
    aiAct(s, F);
    // Tower-War bots reinforce by drawing a line from the strongest neighbour.
    expect(s.groups).toHaveLength(1);
    expect(node(s, 1).routes).toEqual([[0]]);
    expect(node(s, 2).routes).toEqual([]);
    expect(node(s, 1).units).toBe(20);
  });

  it('does not reinforce against a negligible threat', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: F, units: 30 },
        { x: 100, y: 0, owner: F, units: 20 },
        { x: -100, y: 0, owner: 1, units: 100 },
      ],
      [
        [0, 1],
        [0, 2],
      ],
      { def: { aiUpgrades: false } },
    );
    addGroup(s, { owner: 1, n: 10, from: 2, to: 0, t: 0.2 });
    aiAct(s, F);
    // Threat 10 < 30 * 0.9: no reinforcement; the player node with 100 units cannot be attacked either.
    expect(s.groups).toHaveLength(1);
  });

  it('attacks a reachable weak target by drawing a line from the strongest source', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: F, units: 30 },
        { x: 100, y: 0, owner: 0, units: 2 },
      ],
      [[0, 1]],
      { def: { aiUpgrades: false } },
    );
    aiAct(s, F);
    expect(s.groups).toHaveLength(0);
    expect(node(s, 0).routes).toEqual([[1]]);
    expect(node(s, 0).units).toBe(30);
  });

  it('attacks through own territory along the frontier path', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: F, units: 30 },
        { x: 100, y: 0, owner: F, units: 5 },
        { x: 200, y: 0, owner: 0, units: 2 },
      ],
      [
        [0, 1],
        [1, 2],
      ],
      { def: { aiUpgrades: false } },
    );
    aiAct(s, F);
    expect(node(s, 0).routes).toEqual([[1, 2]]);
  });

  it('does nothing when every target is too strong and no node is rich', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: F, units: 30 },
        { x: 100, y: 0, owner: 0, units: 40 },
      ],
      [[0, 1]],
      { def: { aiUpgrades: false } },
    );
    aiAct(s, F);
    expect(s.groups).toHaveLength(0);
    expect(node(s, 0).units).toBe(30);
    expect(drainEvents(s)).toEqual([]);
  });

  it('draws a supply line from a full rear node to the weakest frontline node', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: F, units: 40 },
        { x: 100, y: 0, owner: F, units: 12 },
        { x: 100, y: 100, owner: F, units: 5 },
        { x: 200, y: 0, owner: 0, units: 100 },
        { x: 200, y: 100, owner: 0, units: 100 },
      ],
      [
        [0, 1],
        [0, 2],
        [1, 3],
        [2, 4],
      ],
      { def: { aiUpgrades: false } },
    );
    aiAct(s, F);
    expect(s.groups).toHaveLength(0);
    expect(node(s, 0).routes).toEqual([[2]]);
    expect(node(s, 0).units).toBe(40);
  });

  it('never upgrades or converts with aiUpgrades false', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const s = makeState([{ x: 0, y: 0, owner: F, units: 60 }], [], {
        def: { aiUpgrades: false },
        rng: Rng.fromSeed(seed),
      });
      aiAct(s, F);
      expect(node(s, 0).level).toBe(1);
      expect(node(s, 0).units).toBe(60);
      expect(drainEvents(s)).toEqual([]);
    }
  });

  it('upgrades a rich node sometimes with aiUpgrades true', () => {
    let upgrades = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = makeState([{ x: 0, y: 0, owner: F, units: 60 }], [], {
        def: { aiUpgrades: true },
        rng: Rng.fromSeed(seed),
      });
      aiAct(s, F);
      const n = node(s, 0);
      const ev = drainEvents(s);
      if (n.level === 2) {
        upgrades++;
        expect(n.units).toBe(40);
        expect(ev).toEqual([{ type: 'upgrade', node: 0, owner: F }]);
      } else {
        expect(n.level).toBe(1);
        expect(n.units).toBe(60);
      }
    }
    expect(upgrades).toBeGreaterThan(5);
    expect(upgrades).toBeLessThan(35);
  });

  it('upgrades in the demo regardless of the level flag', () => {
    let upgrades = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = makeState([{ x: 0, y: 0, owner: F, units: 60 }], [], {
        def: { aiUpgrades: false },
        demo: true,
        rng: Rng.fromSeed(seed),
      });
      aiAct(s, F);
      if (node(s, 0).level === 2) upgrades++;
    }
    expect(upgrades).toBeGreaterThan(5);
  });

  it('does not upgrade a node that is not rich enough', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = makeState([{ x: 0, y: 0, owner: F, units: 25 }], [], { rng: Rng.fromSeed(seed) });
      aiAct(s, F);
      expect(node(s, 0).level).toBe(1);
    }
  });

  it('does nothing for a faction without nodes', () => {
    const s = makeState([{ x: 0, y: 0, owner: 1, units: 25 }], []);
    const before = s.rng.state;
    aiAct(s, F);
    expect(s.groups).toHaveLength(0);
    expect(s.rng.state).toBe(before);
  });
});

describe('aiAct determinism', () => {
  function snapshot(s: GameState) {
    return JSON.stringify({ nodes: s.nodes, groups: s.groups, events: s.events, rng: s.rng.state });
  }

  it('produces identical results on identical states', () => {
    const base = buildLevel(CAMPAIGN[7] as LevelDef);
    // Let the game develop a bit so the AI has real choices.
    for (let i = 0; i < 900; i++) step(base, 1 / 60);
    base.events = [];
    expect(base.over).toBeNull();
    const a = cloneState(base),
      b = cloneState(base);
    expect(a).not.toBe(base);
    expect(a.rng).not.toBe(base.rng);
    expect(snapshot(a)).toBe(snapshot(b));
    let launches = 0;
    for (let round = 0; round < 30; round++) {
      for (const f of [2, 3]) {
        aiAct(a, f);
        aiAct(b, f);
        expect(snapshot(a)).toBe(snapshot(b));
      }
      launches += a.events.filter((e) => e.type === 'launch').length;
      a.events = [];
      b.events = [];
      // Let production and the AI timers run between direct decisions.
      for (let i = 0; i < 30; i++) {
        step(a, 1 / 60);
        step(b, 1 / 60);
      }
      expect(snapshot(a)).toBe(snapshot(b));
    }
    expect(launches).toBeGreaterThan(0);
  });
});
