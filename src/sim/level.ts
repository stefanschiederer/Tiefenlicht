import type { Difficulty } from '@/app/save';
import { TYPE_WEIGHTS, TYPES, emptyPerks, type LevelDef, type NodeType, type Perks } from '@/data';
import { buildAdjacency } from './graph';
import { generateMapSafe } from './mapgen';
import type { GameState, SimNode } from './state';
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
  return state;
}

export const typeName = (t: NodeType): string => TYPES[t].name;
