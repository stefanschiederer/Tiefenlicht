import { describe, expect, it } from 'vitest';
import { ENERGY_MAX, TYPES, UNITS } from '@/data';
import { defOf, rateOf } from '@/sim/stats';
import { drainEvents, step } from '@/sim/update';
import { DT, addGroup, makeState, node, run } from './helpers';

/** Two nodes 100 units apart; node 1 is the defender. */
function duel(defender: Parameters<typeof makeState>[0][number], attackerOwner = 1, demo = false) {
  const s = makeState([{ x: 0, y: 0, owner: attackerOwner, units: 40 }, defender], [[0, 1]], { demo });
  return s;
}

describe('arrival combat', () => {
  it('captures the node when attack power exceeds units * def, keeping (pw - effDef) / str', () => {
    // Defender at capacity so no production interferes with the numbers.
    const s = duel({ x: 100, y: 0, owner: 2, units: 40 });
    addGroup(s, { owner: 1, n: 50, from: 0, to: 1, t: 1 });
    step(s, DT);
    const h = node(s, 1);
    expect(h.owner).toBe(1);
    expect(h.units).toBeCloseTo((50 - 40 * 1) / 1);
    expect(s.groups).toHaveLength(0);
    expect(h.routes).toEqual([]);
    expect(h.reserve).toBe(0);
    // Energy: lost defenders + lost attackers, halved.
    expect(s.energy).toBeCloseTo((40 + (50 - 10)) * 0.5);
  });

  it('reduces the defenders by pw / def when the attack is too weak', () => {
    const s = duel({ x: 100, y: 0, owner: 2, units: 60, level: 2 });
    addGroup(s, { owner: 1, n: 12, from: 0, to: 1, t: 1 });
    step(s, DT);
    const h = node(s, 1);
    expect(h.owner).toBe(2);
    expect(h.units).toBeCloseTo(60 - 12 / 1.2);
    expect(s.groups).toHaveLength(0);
    expect(s.energy).toBeCloseTo((12 / 1.2 + 12) * 0.5);
    const ev = drainEvents(s);
    expect(ev.some((e) => e.type === 'clash' && e.a === 1 && e.b === 2 && e.k === 12)).toBe(true);
    expect(ev.some((e) => e.type === 'capture')).toBe(false);
  });

  it('an exactly matching attack does not capture', () => {
    const s = duel({ x: 100, y: 0, owner: 2, units: 40 });
    addGroup(s, { owner: 1, n: 40, from: 0, to: 1, t: 1 });
    step(s, DT);
    const h = node(s, 1);
    expect(h.owner).toBe(2);
    expect(h.units).toBeCloseTo(0);
  });

  it('a bastion defends with double strength', () => {
    expect(TYPES.bastion.def[0]).toBe(2 * TYPES.nest.def[0]);
    const s = duel({ x: 100, y: 0, owner: 2, units: 50, type: 'bastion' });
    expect(defOf(s, node(s, 1))).toBe(2);
    addGroup(s, { owner: 1, n: 60, from: 0, to: 1, t: 1 });
    step(s, DT);
    const h = node(s, 1);
    expect(h.owner).toBe(2);
    expect(h.units).toBeCloseTo(50 - 60 / 2);
  });

  it('a shield triples the defence', () => {
    const s = duel({ x: 100, y: 0, owner: 2, units: 40, shield: 5 });
    expect(defOf(s, node(s, 1))).toBe(3);
    addGroup(s, { owner: 1, n: 50, from: 0, to: 1, t: 1 });
    step(s, DT);
    const h = node(s, 1);
    expect(h.owner).toBe(2);
    expect(h.units).toBeCloseTo(40 - 50 / 3);
    expect(h.shield).toBeCloseTo(5 - DT);
  });

  it('attack units with higher strength count more', () => {
    const s = duel({ x: 100, y: 0, owner: 2, units: 40 });
    addGroup(s, { owner: 1, n: 30, from: 0, to: 1, t: 1, unit: 'panzer' });
    step(s, DT);
    const h = node(s, 1);
    expect(h.owner).toBe(1);
    expect(h.units).toBeCloseTo((30 * UNITS.panzer.str - 40) / UNITS.panzer.str);
  });
});

describe('production', () => {
  it('a frozen node produces nothing, a normal node produces rate * dt', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 10, frozen: 5 },
        { x: 100, y: 0, owner: 1, units: 10 },
      ],
      [[0, 1]],
    );
    expect(rateOf(s, node(s, 0))).toBe(0);
    expect(rateOf(s, node(s, 1))).toBeCloseTo(0.8);
    step(s, DT);
    expect(node(s, 0).units).toBe(10);
    expect(node(s, 1).units).toBeCloseTo(10 + 0.8 * DT);
    expect(node(s, 0).frozen).toBeCloseTo(5 - DT);
  });

  it('never produces above the capacity', () => {
    const s = makeState([{ x: 0, y: 0, owner: 1, units: 39.999 }], []);
    run(s, 10);
    expect(node(s, 0).units).toBe(40);
  });

  it('neutral nodes do not produce', () => {
    const s = makeState([{ x: 0, y: 0, owner: 0, units: 5 }], []);
    run(s, 60);
    expect(node(s, 0).units).toBe(5);
  });
});

describe('player perks', () => {
  it('apply the defence perk to the player only', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 40 },
        { x: 100, y: 0, owner: 2, units: 40 },
      ],
      [[0, 1]],
    );
    s.perks.def = 0.15;
    expect(defOf(s, node(s, 0))).toBeCloseTo(1.15);
    expect(defOf(s, node(s, 1))).toBe(1);
    // Enemy attacks the player node.
    addGroup(s, { owner: 2, n: 30, from: 1, to: 0, t: 1 });
    step(s, DT);
    expect(node(s, 0).units).toBeCloseTo(40 - 30 / 1.15);
  });

  it('apply the strength perk to player groups only', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 40 },
        { x: 100, y: 0, owner: 2, units: 40 },
        { x: 200, y: 0, owner: 2, units: 40 },
      ],
      [
        [0, 1],
        [1, 2],
      ],
    );
    s.perks.str = 0.1;
    addGroup(s, { owner: 1, n: 10, from: 0, to: 1, t: 1 });
    addGroup(s, { owner: 2, n: 10, from: 2, to: 1, t: 1 });
    // Both groups arrive at node 1 (owner 2): the enemy group merges, the player's fights.
    step(s, DT);
    expect(node(s, 1).units).toBeCloseTo(40 - 11 + 10);
  });

  it('are ignored in the demo', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 40 },
        { x: 100, y: 0, owner: 2, units: 40 },
      ],
      [[0, 1]],
      { demo: true },
    );
    s.perks.def = 0.15;
    s.perks.str = 0.1;
    expect(defOf(s, node(s, 0))).toBe(1);
    addGroup(s, { owner: 2, n: 30, from: 1, to: 0, t: 1 });
    addGroup(s, { owner: 1, n: 10, from: 0, to: 1, t: 1 });
    step(s, DT);
    expect(node(s, 0).units).toBeCloseTo(40 - 30);
    expect(node(s, 1).units).toBeCloseTo(40 - 10);
  });
});

describe('head-on clashes', () => {
  function meeting(na: number, nb: number, demo = false) {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 40 },
        { x: 100, y: 0, owner: 2, units: 40 },
      ],
      [[0, 1]],
      { demo },
    );
    const a = addGroup(s, { owner: 1, n: na, from: 0, to: 1, t: 0.5 });
    const b = addGroup(s, { owner: 2, n: nb, from: 1, to: 0, t: 0.5 });
    return { s, a, b };
  }

  it('the bigger group survives with (pa - pb) / str', () => {
    const { s, a, b } = meeting(10, 4);
    step(s, DT);
    expect(a.n).toBeCloseTo((10 - 4) / 1);
    expect(b.n).toBe(0);
    expect(s.groups).toEqual([a]);
    expect(s.energy).toBeCloseTo(4 * 2 * 0.6 * 0.5);
    const ev = drainEvents(s);
    expect(ev.some((e) => e.type === 'clash' && e.a === 1 && e.b === 2 && e.k === 4)).toBe(true);
  });

  it('equal groups annihilate each other', () => {
    const { s } = meeting(7, 7);
    step(s, DT);
    expect(s.groups).toHaveLength(0);
  });

  it('groups on the same edge in the same direction do not fight', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 40 },
        { x: 100, y: 0, owner: 2, units: 40 },
      ],
      [[0, 1]],
    );
    addGroup(s, { owner: 1, n: 10, from: 0, to: 1, t: 0.5 });
    addGroup(s, { owner: 2, n: 4, from: 0, to: 1, t: 0.5 });
    step(s, DT);
    expect(s.groups.map((g) => g.n)).toEqual([10, 4]);
  });

  it('groups too far apart on the same edge pass each other for now', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 40 },
        { x: 100, y: 0, owner: 2, units: 40 },
      ],
      [[0, 1]],
    );
    addGroup(s, { owner: 1, n: 10, from: 0, to: 1, t: 0.2 });
    addGroup(s, { owner: 2, n: 4, from: 1, to: 0, t: 0.2 });
    step(s, DT);
    expect(s.groups.map((g) => g.n)).toEqual([10, 4]);
  });
});

describe('waechter towers', () => {
  function towerState(demo = false) {
    // Tower at the origin; three enemy groups start at 100, 140 and 200 units away and head to node 3.
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 20, type: 'waechter', zapAcc: 2.5 },
        { x: 100, y: 0, owner: 0, units: 5 },
        { x: 140, y: 0, owner: 0, units: 5 },
        { x: 100, y: 300, owner: 0, units: 5 },
        { x: 200, y: 0, owner: 0, units: 5 },
      ],
      [
        [0, 1],
        [1, 3],
        [2, 3],
        [4, 3],
      ],
      { demo },
    );
    const near = addGroup(s, { owner: 2, n: 10, from: 1, to: 3 });
    const mid = addGroup(s, { owner: 2, n: 10, from: 2, to: 3 });
    const far = addGroup(s, { owner: 2, n: 10, from: 4, to: 3 });
    return { s, near, mid, far };
  }

  it('shoots the nearest enemy group in range and emits a zap', () => {
    const { s, near, mid, far } = towerState();
    step(s, DT);
    // zapAcc 2.5 + 2.5/60 -> floor = 2 damage against strength-1 units.
    expect(near.n).toBeCloseTo(8);
    expect(mid.n).toBe(10);
    expect(far.n).toBe(10);
    expect(node(s, 0).zapAcc).toBeCloseTo(2.5 + 2.5 * DT - 2);
    expect(s.energy).toBeCloseTo(2 * 0.5);
    const zaps = drainEvents(s).filter((e) => e.type === 'zap');
    expect(zaps).toHaveLength(1);
    const z = zaps[0];
    expect(z && z.type === 'zap' && z.node === 0 && z.target === 2 && z.killed).toBeCloseTo(2);
  });

  it('ignores own groups and does not fire below one accumulated shot', () => {
    const { s, near } = towerState();
    node(s, 0).zapAcc = 0;
    near.owner = 1;
    run(s, 5);
    expect(s.groups.map((g) => g.n)).toEqual([10, 10, 10]);
    expect(drainEvents(s).some((e) => e.type === 'zap')).toBe(false);
  });

  it('does not fire while frozen', () => {
    const { s, near } = towerState();
    node(s, 0).frozen = 3;
    step(s, DT);
    expect(near.n).toBe(10);
  });

  it('caps the damage at the target power', () => {
    const { s, near } = towerState();
    near.n = 1.5;
    step(s, DT);
    expect(near.n).toBeCloseTo(0);
    expect(node(s, 0).zapAcc).toBeCloseTo(2.5 + 2.5 * DT - 1.5);
  });
});

describe('energy', () => {
  it('is capped at ENERGY_MAX', () => {
    const s = duel({ x: 100, y: 0, owner: 2, units: 40 });
    s.energy = 99;
    addGroup(s, { owner: 1, n: 50, from: 0, to: 1, t: 1 });
    step(s, DT);
    expect(s.energy).toBe(ENERGY_MAX);
  });

  it('is never gained in the demo', () => {
    const s = duel({ x: 100, y: 0, owner: 2, units: 40 }, 1, true);
    addGroup(s, { owner: 1, n: 50, from: 0, to: 1, t: 1 });
    step(s, DT);
    expect(node(s, 1).owner).toBe(1);
    expect(s.energy).toBe(0);
  });

  it('scales with the energy perk', () => {
    const s = duel({ x: 100, y: 0, owner: 2, units: 60, level: 2 });
    s.perks.energy = 0.5;
    addGroup(s, { owner: 1, n: 12, from: 0, to: 1, t: 1 });
    step(s, DT);
    expect(s.energy).toBeCloseTo((12 / 1.2 + 12) * 0.5 * 1.5);
  });
});

describe('capture bookkeeping', () => {
  it('emits a capture event with the previous owner and counts player captures', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 40 },
        { x: 100, y: 0, owner: 2, units: 40 },
        { x: 200, y: 0, owner: 0, units: 3 },
        { x: 300, y: 0, owner: 2, units: 40 },
      ],
      [
        [0, 1],
        [1, 2],
        [2, 3],
      ],
    );
    addGroup(s, { owner: 1, n: 50, from: 0, to: 1, t: 1 });
    addGroup(s, { owner: 2, n: 10, from: 3, to: 2, t: 1 });
    step(s, DT);
    const captures = drainEvents(s).filter((e) => e.type === 'capture');
    expect(captures).toEqual([
      { type: 'capture', node: 1, by: 1, prev: 2, x: 100, y: 0 },
      { type: 'capture', node: 2, by: 2, prev: 0, x: 200, y: 0 },
    ]);
    // Only the player's capture is counted.
    expect(s.stats.captured).toBe(1);
  });

  it('does not count captures in the demo', () => {
    const s = duel({ x: 100, y: 0, owner: 2, units: 40 }, 1, true);
    addGroup(s, { owner: 1, n: 50, from: 0, to: 1, t: 1 });
    step(s, DT);
    expect(node(s, 1).owner).toBe(1);
    expect(s.stats.captured).toBe(0);
  });

  it('clears routes, flow accumulator, reserve, freeze and shield on capture', () => {
    const s = duel({
      x: 100,
      y: 0,
      owner: 2,
      units: 40,
      routes: [[0]],
      reserve: 0.5,
      frozen: 4,
      shield: 4,
      flowAcc: 5,
    });
    // The shield triples the defence: 40 * 3 = 120 power needed.
    addGroup(s, { owner: 1, n: 200, from: 0, to: 1, t: 1 });
    step(s, DT);
    const h = node(s, 1);
    expect(h.owner).toBe(1);
    expect(h.units).toBeCloseTo(200 - 120);
    expect(h.routes).toEqual([]);
    expect(h.flowAcc).toBe(0);
    expect(h.reserve).toBe(0);
    expect(h.frozen).toBe(0);
    expect(h.shield).toBe(0);
  });
});

describe('win and lose detection', () => {
  it('wins when no enemy node or group is left', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 40 },
        { x: 100, y: 0, owner: 2, units: 40 },
      ],
      [[0, 1]],
    );
    step(s, DT);
    expect(s.over).toBeNull();
    addGroup(s, { owner: 1, n: 60, from: 0, to: 1, t: 1 });
    step(s, DT);
    expect(s.over).toBe('won');
    expect(drainEvents(s).filter((e) => e.type === 'finished')).toEqual([{ type: 'finished', won: true }]);
    // A finished state no longer advances.
    const t = s.time;
    step(s, DT);
    expect(s.time).toBe(t);
  });

  it('an enemy group in flight keeps the game going', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 40 },
        { x: 100, y: 0, owner: 0, units: 3 },
      ],
      [[0, 1]],
    );
    addGroup(s, { owner: 2, n: 5, from: 1, to: 0, t: 0 });
    step(s, DT);
    expect(s.over).toBeNull();
  });

  it('loses when the player has no node and no group', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 5 },
        { x: 100, y: 0, owner: 2, units: 40 },
      ],
      [[0, 1]],
    );
    addGroup(s, { owner: 2, n: 30, from: 1, to: 0, t: 1 });
    step(s, DT);
    expect(node(s, 0).owner).toBe(2);
    expect(s.over).toBe('lost');
    expect(drainEvents(s).filter((e) => e.type === 'finished')).toEqual([{ type: 'finished', won: false }]);
  });

  it('never finishes in the demo', () => {
    const s = makeState([{ x: 0, y: 0, owner: 2, units: 40 }], [], { demo: true });
    run(s, 10);
    expect(s.over).toBeNull();
  });
});
