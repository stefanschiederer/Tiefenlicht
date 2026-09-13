import { describe, expect, it } from 'vitest';
import {
  BASE_SPEED,
  FLOW_INTERVAL,
  FLOW_INTERVAL_FAST,
  MAX_ROUTES,
  ROUTE_SHARE,
  ROUTE_SHARE_FAST,
  TYPES,
} from '@/data';
import { addRoute, clearRoutes, launch, removeRoute, sendAmount } from '@/sim/actions';
import type { GameState, Group, SimEvent } from '@/sim/state';
import { capOf, rateOf } from '@/sim/stats';
import { drainEvents, step } from '@/sim/update';
import { DT, makeNode, makeState, node, run, type NodeSpec } from './helpers';

describe('addRoute', () => {
  it('adds new routes and replaces routes by target', () => {
    const n = makeNode(0, { x: 0, y: 0, owner: 1 });
    n.flowT = 0.3;
    expect(addRoute(n, [1, 2])).toBe(true);
    expect(n.flowT).toBe(0);
    expect(addRoute(n, [3])).toBe(true);
    expect(n.routes).toEqual([[1, 2], [3]]);
    // Same target, new path: replaced in place, not appended.
    expect(addRoute(n, [4, 2])).toBe(false);
    expect(n.routes).toEqual([[4, 2], [3]]);
  });

  it('keeps at most MAX_ROUTES and drops the oldest', () => {
    const n = makeNode(0, { x: 0, y: 0, owner: 1 });
    expect(MAX_ROUTES).toBe(3);
    addRoute(n, [1]);
    addRoute(n, [2]);
    addRoute(n, [3]);
    expect(addRoute(n, [4])).toBe(true);
    expect(n.routes).toEqual([[2], [3], [4]]);
    removeRoute(n, 1);
    expect(n.routes).toEqual([[2], [4]]);
  });

  it('copies the route array', () => {
    const n = makeNode(0, { x: 0, y: 0, owner: 1 });
    const r = [1, 2];
    addRoute(n, r);
    r.push(9);
    expect(n.routes).toEqual([[1, 2]]);
  });
});

describe('sendAmount', () => {
  it('respects the reserve and sends at least one unit when anything is available', () => {
    const s = makeState([{ x: 0, y: 0, owner: 1, units: 40, reserve: 0.5 }], []);
    const n = node(s, 0);
    expect(sendAmount(s, n, 0.5)).toBe(10);
    expect(sendAmount(s, n, 1)).toBe(20);
    expect(sendAmount(s, n, 0.01)).toBe(1);
    n.reserve = 0;
    expect(sendAmount(s, n, 0.5)).toBe(20);
    n.units = 20.5;
    n.reserve = 0.5;
    expect(sendAmount(s, n, 1)).toBe(0);
    n.units = 21;
    expect(sendAmount(s, n, 0.2)).toBe(1);
  });

  it('uses the perk-boosted capacity for the reserve', () => {
    const s = makeState([{ x: 0, y: 0, owner: 1, units: 40, reserve: 0.5 }], []);
    s.perks.cap = 0.5;
    // cap = 60, reserve 30, avail 10
    expect(sendAmount(s, node(s, 0), 1)).toBe(10);
  });
});

/** An unconnected enemy node keeping the game alive. */
const ENEMY: NodeSpec = { x: 900, y: 700, owner: 2, units: 40 };

/**
 * Four player nodes 100 units apart; node 0 (a plain nest: cap 40, rate 0.8) ships along routes.
 * Node 4 is an unconnected enemy node so the game does not end immediately.
 */
function routeState(routes: number[][], src: Partial<NodeSpec> = {}) {
  return makeState(
    [
      { x: 0, y: 0, owner: 1, units: 10, routes, ...src },
      { x: 100, y: 0, owner: 1, units: 40 },
      { x: 0, y: 100, owner: 1, units: 40 },
      { x: 100, y: 100, owner: 1, units: 40 },
      ENEMY,
    ],
    [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 3],
    ],
  );
}

const launches = (ev: SimEvent[]) =>
  ev.filter((e): e is Extract<SimEvent, { type: 'launch' }> => e.type === 'launch');

interface Shipment {
  t: number;
  to: number;
  n: number;
}

const target = (g: Group) => (g.path.length ? (g.path[g.path.length - 1] as number) : g.to);

/** Steps `steps` ticks and records every shipment leaving node 0 as [time, final target, units]. */
function shipments(s: GameState, steps: number, before?: () => void): Shipment[] {
  const out: Shipment[] = [];
  for (let i = 0; i < steps; i++) {
    before?.();
    step(s, DT);
    for (const e of launches(drainEvents(s))) out.push({ t: s.time, to: target(e.group), n: e.group.n });
  }
  return out;
}

const shipped = (out: Shipment[]) => out.reduce((a, o) => a + o.n, 0);

describe('route flow accumulation', () => {
  it('forwards ROUTE_SHARE of the production while the node keeps growing', () => {
    const s = routeState([[1]]);
    const n = node(s, 0);
    const rate = rateOf(s, n);
    expect(rate).toBeCloseTo(0.8);
    expect(ROUTE_SHARE).toBe(0.4);
    const ticks = 20 * 60;
    const out = shipments(s, ticks);
    const T = s.time;
    // Production is untouched by the routes: everything produced is either still here or was shipped.
    expect(n.units - 10 + shipped(out)).toBeCloseTo(rate * T, 6);
    // Shipments plus what is still accumulated equal the production share.
    expect(shipped(out) + n.flowAcc).toBeCloseTo(rate * ROUTE_SHARE * T, 6);
    expect(Math.abs(shipped(out) - rate * ROUTE_SHARE * T)).toBeLessThan(1);
    expect(shipped(out)).toBeGreaterThanOrEqual(5);
    // Net growth at rate * (1 - share) within one unit.
    expect(Math.abs(n.units - 10 - rate * (1 - ROUTE_SHARE) * T)).toBeLessThan(1);
    expect(n.units).toBeGreaterThan(10);
    for (const o of out) {
      expect(o.to).toBe(1);
      expect(Number.isInteger(o.n)).toBe(true);
      expect(o.n).toBeGreaterThanOrEqual(1);
    }
  });

  it('forwards ROUTE_SHARE_FAST with the flow perk', () => {
    const s = routeState([[1]]);
    s.perks.flow = 1;
    const n = node(s, 0);
    expect(ROUTE_SHARE_FAST).toBe(0.6);
    const out = shipments(s, 20 * 60);
    const T = s.time;
    expect(shipped(out) + n.flowAcc).toBeCloseTo(0.8 * ROUTE_SHARE_FAST * T, 6);
    expect(Math.abs(shipped(out) - 0.8 * ROUTE_SHARE_FAST * T)).toBeLessThan(1);
    expect(n.units - 10 + shipped(out)).toBeCloseTo(0.8 * T, 6);
  });

  it('a full node forwards all of its production', () => {
    const s = routeState([[1]], { units: 40 });
    const n = node(s, 0);
    expect(capOf(s, n)).toBe(40);
    // 1 s: 0.8 units accumulated, none shipped yet (every interval boundary so far saw < 1).
    let out = shipments(s, 60);
    expect(out).toEqual([]);
    expect(n.units).toBe(40);
    expect(n.flowAcc).toBeCloseTo(0.8 * s.time, 6);
    // The boundary at ~1.27 s ships exactly one unit.
    out = shipments(s, 30);
    expect(out.map((o) => o.n)).toEqual([1]);
    expect(n.units).toBeGreaterThanOrEqual(39);
    expect(n.units).toBeLessThan(40);
  });

  it('a node just below capacity still counts as full', () => {
    const s = routeState([[1]], { units: 39.6 });
    step(s, DT);
    expect(node(s, 0).flowAcc).toBeCloseTo(0.8 * DT, 9);
    const s2 = routeState([[1]], { units: 39.4 });
    step(s2, DT);
    expect(node(s2, 0).flowAcc).toBeCloseTo(0.8 * ROUTE_SHARE * DT, 9);
  });

  it('a frozen node accumulates nothing', () => {
    const s = routeState([[1]], { units: 40, frozen: 5 });
    run(s, 60);
    expect(node(s, 0).flowAcc).toBe(0);
    expect(s.groups).toHaveLength(0);
  });

  it('resets the accumulator when the routes are gone or the owner changes', () => {
    const s = routeState([[1]], { units: 20, flowAcc: 5.5 });
    clearRoutes(node(s, 0));
    step(s, DT);
    expect(node(s, 0).flowAcc).toBe(0);
    const s2 = routeState([[1], [2]], { units: 20, flowAcc: 5.5 });
    node(s2, 0).owner = 2;
    step(s2, DT);
    expect(node(s2, 0).routes).toEqual([]);
    expect(node(s2, 0).flowAcc).toBe(0);
    expect(s2.groups).toHaveLength(0);
  });

  it('caps the accumulator at the capacity when nothing can leave', () => {
    const s = routeState([[1]], { units: 20, reserve: 0.75, flowAcc: 1000 });
    step(s, DT);
    expect(s.groups).toHaveLength(0);
    expect(node(s, 0).flowAcc).toBe(40);
  });
});

describe('route shipments', () => {
  it('ships min(floor(flowAcc), floor(units - reserve * cap)) every FLOW_INTERVAL', () => {
    const s = routeState([[1]], { reserve: 0.25 });
    const n = node(s, 0);
    // Accumulator is the bound: 3 of the 30 available units.
    const out = shipments(s, 80, () => {
      n.units = 40.7;
      n.flowAcc = 3;
    });
    expect(out.length).toBeGreaterThanOrEqual(3);
    for (const o of out) {
      expect(o.n).toBe(3);
      expect(o.to).toBe(1);
    }
    expect(out[0]?.t).toBeCloseTo(DT);
    for (let i = 1; i < out.length; i++) {
      const gap = (out[i] as Shipment).t - (out[i - 1] as Shipment).t;
      expect(Math.abs(gap - FLOW_INTERVAL)).toBeLessThanOrEqual(DT + 1e-9);
    }
    expect(FLOW_INTERVAL).toBe(0.4);
  });

  it('never breaches the reserve', () => {
    const s = routeState([[1]], { units: 25, reserve: 0.5, flowAcc: 100 });
    const n = node(s, 0);
    let minUnits = Infinity;
    const out: Shipment[] = [];
    for (let i = 0; i < 600; i++) {
      step(s, DT);
      minUnits = Math.min(minUnits, n.units);
      for (const e of launches(drainEvents(s))) out.push({ t: s.time, to: target(e.group), n: e.group.n });
    }
    // First interval: floor(25 - 20) = 5 units, not the 100 in the accumulator.
    expect(out[0]?.n).toBe(5);
    expect(minUnits).toBeGreaterThanOrEqual(20 - 1e-9);
    // Later shipments are single units of the production surplus above the reserve.
    for (const o of out.slice(1)) expect(o.n).toBe(1);
    expect(out.length).toBeGreaterThan(3);
  });

  it('ships twice as often with the flow perk', () => {
    const s = routeState([[1]], { reserve: 0.5 });
    s.perks.flow = 1;
    const n = node(s, 0);
    const out = shipments(s, 80, () => {
      n.units = 40;
      n.flowAcc = 50;
    });
    expect(out.length).toBeGreaterThanOrEqual(6);
    for (const o of out) expect(o.n).toBe(20);
    for (let i = 1; i < out.length; i++) {
      const gap = (out[i] as Shipment).t - (out[i - 1] as Shipment).t;
      expect(Math.abs(gap - FLOW_INTERVAL_FAST)).toBeLessThanOrEqual(DT + 1e-9);
    }
    expect(FLOW_INTERVAL_FAST).toBeCloseTo(FLOW_INTERVAL / 2);
  });

  it('ships nothing below one available or one accumulated unit', () => {
    const s = routeState([[1]], { units: 20.9, reserve: 0.5, flowAcc: 5 });
    step(s, DT);
    expect(s.groups).toHaveLength(0);
    const s2 = routeState([[1]], { units: 40, flowAcc: 0.5 });
    step(s2, DT);
    expect(s2.groups).toHaveLength(0);
    expect(node(s2, 0).units).toBe(40);
  });

  it('splits 7 units over two routes as 4/3 with the extra unit rotating', () => {
    const s = routeState([[1], [2]]);
    const n = node(s, 0);
    // 80 ticks = 1.33 s: shipments at t ≈ 0, 0.4, 0.8, 1.2 -> 4 intervals, 2 launches each.
    const out = shipments(s, 80, () => {
      n.units = 7;
      n.flowAcc = 7;
    });
    expect(out).toHaveLength(8);
    const byInterval = [0, 1, 2, 3].map((k) => out.slice(2 * k, 2 * k + 2).map((o) => [o.to, o.n]));
    expect(byInterval).toEqual([
      [
        [1, 4],
        [2, 3],
      ],
      [
        [2, 4],
        [1, 3],
      ],
      [
        [1, 4],
        [2, 3],
      ],
      [
        [2, 4],
        [1, 3],
      ],
    ]);
  });

  it('splits 8 units over three routes as 3/3/2 round-robin', () => {
    const s = routeState([[1], [2], [3]]);
    const n = node(s, 0);
    const out = shipments(s, 80, () => {
      n.units = 8;
      n.flowAcc = 8;
    });
    expect(out).toHaveLength(12);
    const byInterval = [0, 1, 2, 3].map((k) => out.slice(3 * k, 3 * k + 3).map((o) => [o.to, o.n]));
    expect(byInterval).toEqual([
      [
        [1, 3],
        [2, 3],
        [3, 2],
      ],
      [
        [2, 3],
        [3, 3],
        [1, 2],
      ],
      [
        [3, 3],
        [1, 3],
        [2, 2],
      ],
      [
        [1, 3],
        [2, 3],
        [3, 2],
      ],
    ]);
    // Every route received the same total over three full rotations.
    const totals = [1, 2, 3].map((to) =>
      out
        .slice(0, 9)
        .filter((o) => o.to === to)
        .reduce((a, o) => a + o.n, 0),
    );
    expect(totals).toEqual([8, 8, 8]);
  });

  it('sends everything to a single rotating route when fewer units than routes are available', () => {
    const s = routeState([[1], [2], [3]]);
    const n = node(s, 0);
    const out = shipments(s, 80, () => {
      n.units = 2;
      n.flowAcc = 2;
    });
    expect(out.map((o) => [o.to, o.n])).toEqual([
      [1, 2],
      [2, 2],
      [3, 2],
      [1, 2],
    ]);
  });

  it('follows the full route path when launching', () => {
    const s = routeState([[1, 3]], { units: 10, flowAcc: 10 });
    step(s, DT);
    const g = s.groups[0] as Group;
    expect(g.to).toBe(1);
    expect(g.path).toEqual([3]);
    expect(g.n).toBe(10);
    expect(node(s, 0).units).toBeCloseTo(0.8 * DT, 9);
    expect(node(s, 0).flowAcc).toBeCloseTo(0.8 * ROUTE_SHARE * DT, 9);
    expect(s.stats.sends).toBe(0);
  });
});

describe('route ownership', () => {
  it('clears routes on a node that is no longer the player’s', () => {
    const s = routeState([[1], [2]], { units: 40, flowAcc: 40 });
    node(s, 0).owner = 2;
    step(s, DT);
    expect(node(s, 0).routes).toEqual([]);
    expect(s.groups).toHaveLength(0);
  });

  it('enemy nodes never ship along routes', () => {
    const s = routeState([[1]], { units: 40, flowAcc: 40 });
    node(s, 0).owner = 2;
    node(s, 1).owner = 2;
    run(s, 30);
    expect(s.groups).toHaveLength(0);
  });
});

describe('multi-hop travel', () => {
  it('continues along the path at own nodes and merges at the end', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 40 },
        { x: 100, y: 0, owner: 1, units: 40, type: 'strom' },
        { x: 200, y: 0, owner: 1, units: 40 },
        ENEMY,
      ],
      [
        [0, 1],
        [1, 2],
      ],
    );
    const g = launch(s, node(s, 0), [1, 2], 10);
    expect(g).not.toBeNull();
    if (!g) return;
    expect(node(s, 0).units).toBe(30);
    expect(g.from).toBe(0);
    expect(g.to).toBe(1);
    expect(g.path).toEqual([2]);
    expect(g.speed).toBeCloseTo(BASE_SPEED);
    // First hop: 100 units at 82/s.
    let steps = 0;
    while (g.to === 1 && steps < 200) {
      step(s, DT);
      steps++;
    }
    expect(g.from).toBe(1);
    expect(g.to).toBe(2);
    expect(g.path).toEqual([]);
    expect(g.n).toBe(10);
    expect(steps).toBe(Math.ceil(100 / BASE_SPEED / DT));
    // Node 1 is untouched, and the group now moves at the current node's speed.
    expect(node(s, 1).units).toBe(40);
    const mul = TYPES.strom.speedMul?.[0] ?? 0;
    expect(mul).toBe(2);
    expect(g.speed).toBeCloseTo(BASE_SPEED * mul);
    steps = 0;
    while (s.groups.length && steps < 200) {
      step(s, DT);
      steps++;
    }
    expect(steps).toBe(Math.ceil(100 / (BASE_SPEED * 2) / DT));
    expect(node(s, 2).units).toBe(50);
    expect(s.groups).toHaveLength(0);
  });

  it('fights at an intermediate node that changed owner meanwhile', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 40 },
        { x: 100, y: 0, owner: 1, units: 40 },
        { x: 200, y: 0, owner: 1, units: 40 },
        ENEMY,
      ],
      [
        [0, 1],
        [1, 2],
      ],
    );
    const g = launch(s, node(s, 0), [1, 2], 10);
    if (!g) throw new Error('launch failed');
    node(s, 1).owner = 2;
    run(s, Math.ceil(100 / BASE_SPEED / DT));
    expect(s.groups).toHaveLength(0);
    expect(node(s, 1).owner).toBe(2);
    expect(node(s, 1).units).toBeCloseTo(30);
    expect(node(s, 2).units).toBe(40);
  });
});
