import {
  ALL_TYPES,
  BASE_SPEED,
  SIM_SCALE,
  UNITS,
  emptyPerks,
  type LevelDef,
  type NodeType,
  type UnitType,
} from '@/data';
import { buildAdjacency, type Edge } from '@/sim/graph';
import { Rng } from '@/sim/rng';
import type { GameState, Group, SimNode } from '@/sim/state';
import { step } from '@/sim/update';

export const DT = 1 / 60;

export interface NodeSpec {
  x: number;
  y: number;
  owner?: number;
  units?: number;
  type?: NodeType;
  level?: 1 | 2 | 3;
  routes?: number[][];
  reserve?: number;
  frozen?: number;
  shield?: number;
  zapAcc?: number;
  flowAcc?: number;
}

export function makeNode(id: number, spec: NodeSpec): SimNode {
  return {
    id,
    x: spec.x,
    y: spec.y,
    type: spec.type ?? 'nest',
    level: spec.level ?? 1,
    owner: spec.owner ?? 0,
    units: spec.units ?? 0,
    routes: spec.routes ?? [],
    reserve: spec.reserve ?? 0,
    rr: 0,
    flowT: 0,
    flowAcc: spec.flowAcc ?? 0,
    zapAcc: spec.zapAcc ?? 0,
    frozen: spec.frozen ?? 0,
    shield: spec.shield ?? 0,
  };
}

export function makeDef(over: Partial<LevelDef> = {}): LevelDef {
  return {
    ch: 0,
    name: 'test',
    nodes: 4,
    enemies: 1,
    types: ALL_TYPES,
    ai: 100,
    obst: 0,
    seed: 1,
    gar: 10,
    prod: 1,
    par: 60,
    text: '',
    ...over,
  };
}

export type StateOverrides = Partial<Omit<GameState, 'def'>> & { def?: Partial<LevelDef> };

/** A small hand-built, valid GameState. AI timers are empty by default so the bot never acts on its own. */
export function makeState(nodes: NodeSpec[], edges: Edge[], overrides: StateOverrides = {}): GameState {
  const { def: defOver, ...rest } = overrides;
  const simNodes = nodes.map((n, i) => makeNode(i, n));
  return {
    def: makeDef({ nodes: nodes.length, ...defOver }),
    demo: false,
    difficulty: 'normal',
    perks: emptyPerks(),
    rng: Rng.fromSeed(1),
    nodes: simNodes,
    edges: edges.slice(),
    blocked: [],
    adj: buildAdjacency(simNodes.length, edges),
    rocks: [],
    groups: [],
    nextGroupId: 1,
    time: 0,
    energy: 0,
    aiTimers: {},
    surrenderT: {},
    stats: { captured: 0, sends: 0 },
    over: null,
    events: [],
    ...rest,
  };
}

export interface GroupSpec {
  owner: number;
  n: number;
  from: number;
  to: number;
  t?: number;
  unit?: UnitType;
  path?: number[];
}

/** Places a group on the edge from→to at progress t (default 0) without touching node garrisons. */
export function addGroup(s: GameState, spec: GroupSpec): Group {
  const a = node(s, spec.from),
    b = node(s, spec.to),
    t = spec.t ?? 0,
    unit = spec.unit ?? 'sporen';
  const g: Group = {
    id: s.nextGroupId++,
    owner: spec.owner,
    n: spec.n,
    unit,
    from: spec.from,
    to: spec.to,
    path: spec.path ?? [],
    t,
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    speed: BASE_SPEED * SIM_SCALE * UNITS[unit].speed,
  };
  s.groups.push(g);
  return g;
}

export function node(s: GameState, id: number): SimNode {
  const n = s.nodes[id];
  if (!n) throw new Error(`no node ${id}`);
  return n;
}

/** Steps the simulation `steps` times with the fixed 1/60 s tick. */
export function run(s: GameState, steps: number): void {
  for (let i = 0; i < steps; i++) step(s, DT);
}

/** Deep copy of a state with a fresh Rng at the same internal state. */
export function cloneState(s: GameState): GameState {
  const { rng, ...rest } = s;
  return { ...structuredClone(rest), rng: new Rng(rng.state) };
}
