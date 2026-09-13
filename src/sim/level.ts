import type { Difficulty } from '@/app/save';
import {
  BARRIER_HP,
  MINE_UNITS,
  TYPE_WEIGHTS,
  TYPES,
  emptyPerks,
  type LevelDef,
  type NodeType,
  type Perks,
} from '@/data';
import { buildAdjacency } from './graph';
import { generateMapSafe, type GeneratedMap } from './mapgen';
import { Rng } from './rng';
import type { Barrier, GameState, Mine, SimNode } from './state';
import { stat } from './stats';

export interface BuildOptions {
  perks?: Perks;
  difficulty?: Difficulty;
  demo?: boolean;
}

/** Builds a fresh, deterministic game state for a level definition. */
export function buildLevel(def: LevelDef, opts: BuildOptions = {}): GameState {
  const demo = opts.demo ?? !!def.demo;
  const gen = def.map ? fromHandMap(def) : generateMapSafe(def);
  const nodes: SimNode[] = gen.points.map((p, id) => ({
    id,
    x: p.x,
    y: p.y,
    type: 'nest',
    level: 1,
    owner: 0,
    units: 0,
    routes: [],
    reserve: 0,
    rr: 0,
    flowT: 0,
    flowAcc: 0,
    zapAcc: 0,
    frozen: 0,
    shield: 0,
  }));
  const perks = opts.perks ?? emptyPerks();
  const state: GameState = {
    def,
    demo,
    difficulty: opts.difficulty ?? 'normal',
    perks,
    rng: gen.rng,
    nodes,
    edges: gen.edges,
    blocked: gen.blocked,
    adj: buildAdjacency(nodes.length, gen.edges),
    rocks: gen.rocks,
    barriers: [],
    mines: [],
    groups: [],
    nextGroupId: 1,
    time: 0,
    energy: demo ? 0 : perks.energyStart,
    aiTimers: {},
    surrenderT: {},
    stats: { captured: 0, sends: 0 },
    over: null,
    objectiveT: 0,
    objectiveNode: def.objective?.node ?? -1,
    events: [],
  };
  const rng = gen.rng;
  const allowed = def.types;
  const wsum = allowed.reduce((s, t) => s + TYPE_WEIGHTS[t], 0);
  const hand = def.map;
  for (const n of nodes) {
    if (gen.starts.includes(n.id)) continue;
    const h = hand?.nodes[n.id];
    if (h?.type) n.type = h.type;
    else {
      let x = rng.next() * wsum;
      for (const t of allowed) {
        x -= TYPE_WEIGHTS[t];
        if (x <= 0) {
          n.type = t;
          break;
        }
      }
    }
    if (h?.level) n.level = h.level;
    n.units = h?.units ?? 2 + Math.floor(rng.next() * stat(n, 'cap') * 0.4);
  }
  gen.starts.forEach((id, k) => {
    const n = nodes[id] as SimNode;
    const h = hand?.nodes[id];
    n.type = h?.type ?? (allowed.includes('brut') ? 'brut' : 'nest');
    n.owner = h?.owner ?? k + 1;
    n.units = h?.units ?? def.gar;
    if (h?.level) n.level = h.level;
    if (k > 0 && def.boss) {
      n.level = 2;
      n.units = Math.round(def.gar * 1.3);
    }
    if (k === 0 && !demo) {
      n.units += perks.start;
      if (perks.startLevel > 0) n.level = Math.min(3, n.level + perks.startLevel) as 1 | 2 | 3;
    }
    if (!hand)
      for (const j of state.adj[id] ?? []) {
        if (!gen.starts.includes(j)) {
          const m = nodes[j] as SimNode;
          m.units = Math.min(m.units, 2 + Math.floor(rng.next() * def.gar * 0.35));
        }
      }
  });
  for (let f = demo ? 1 : 2; f <= def.enemies + 1; f++) state.aiTimers[f] = def.ai * (1.6 + rng.next() * 0.8);
  // Obstacles on edges that do not touch a start node; one obstacle per edge.
  const startSet = new Set(gen.starts);
  const candidates = gen.edges.filter(([a, b]) => !startSet.has(a) && !startSet.has(b));
  const used = new Set<number>();
  const pick = (): [number, number] | null => {
    for (let tries = 0; tries < 30 && used.size < candidates.length; tries++) {
      const i = rng.int(candidates.length);
      if (used.has(i)) continue;
      used.add(i);
      return candidates[i] as [number, number];
    }
    return null;
  };
  const at = (e: [number, number], t: number) => {
    const na = nodes[e[0]] as SimNode,
      nb = nodes[e[1]] as SimNode;
    return { x: na.x + (nb.x - na.x) * t, y: na.y + (nb.y - na.y) * t };
  };
  for (const b of hand?.barriers ?? []) {
    const t = b.t ?? 0.5;
    state.barriers.push({
      a: b.edge[0],
      b: b.edge[1],
      t,
      ...at(b.edge, t),
      hp: b.hp ?? BARRIER_HP,
      maxHp: b.hp ?? BARRIER_HP,
    });
  }
  for (const m of hand?.mines ?? []) {
    const t = m.t ?? 0.5;
    state.mines.push({ a: m.edge[0], b: m.edge[1], t, ...at(m.edge, t), units: m.units ?? MINE_UNITS });
  }
  for (let i = 0; i < (def.barriers ?? 0); i++) {
    const e = pick();
    if (!e) break;
    const t = 0.5;
    const b: Barrier = { a: e[0], b: e[1], t, ...at(e, t), hp: BARRIER_HP, maxHp: BARRIER_HP };
    state.barriers.push(b);
  }
  for (let i = 0; i < (def.mines ?? 0); i++) {
    const e = pick();
    if (!e) break;
    const t = 0.35 + rng.next() * 0.3;
    const m: Mine = { a: e[0], b: e[1], t, ...at(e, t), units: MINE_UNITS };
    state.mines.push(m);
  }
  return state;
}

export const typeName = (t: NodeType): string => TYPES[t].name;

/** Converts a hand-made map into the generator's output shape. Start nodes are those with an owner. */
function fromHandMap(def: LevelDef): GeneratedMap {
  const map = def.map as NonNullable<LevelDef['map']>;
  const starts = map.nodes
    .map((n, i) => (n.owner ? { i, owner: n.owner } : null))
    .filter((x): x is { i: number; owner: number } => !!x);
  starts.sort((a, b) => a.owner - b.owner);
  return {
    points: map.nodes.map((n) => ({ x: n.x, y: n.y })),
    rocks: (map.rocks ?? []).map((r) => ({ ...r })),
    edges: map.edges.map(([a, b]) => [a, b] as [number, number]),
    blocked: [],
    starts: starts.map((s) => s.i),
    rng: Rng.fromSeed(((def.seed * 2654435761) >>> 0) ^ (map.nodes.length * 97)),
  };
}
