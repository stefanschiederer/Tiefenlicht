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
import { generateMapSafe } from './mapgen';
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
  const gen = generateMapSafe(def);
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
    energy: 0,
    aiTimers: {},
    surrenderT: {},
    stats: { captured: 0, sends: 0 },
    over: null,
    events: [],
  };
  const rng = gen.rng;
  const allowed = def.types;
  const wsum = allowed.reduce((s, t) => s + TYPE_WEIGHTS[t], 0);
  for (const n of nodes) {
    if (gen.starts.includes(n.id)) continue;
    let x = rng.next() * wsum;
    for (const t of allowed) {
      x -= TYPE_WEIGHTS[t];
      if (x <= 0) {
        n.type = t;
        break;
      }
    }
    n.units = 2 + Math.floor(rng.next() * stat(n, 'cap') * 0.4);
  }
  gen.starts.forEach((id, k) => {
    const n = nodes[id] as SimNode;
    n.type = allowed.includes('brut') ? 'brut' : 'nest';
    n.owner = k + 1;
    n.units = def.gar;
    if (k > 0 && def.boss) {
      n.level = 2;
      n.units = Math.round(def.gar * 1.3);
    }
    if (k === 0 && !demo) n.units += perks.start;
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
