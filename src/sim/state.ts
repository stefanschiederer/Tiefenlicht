import type { Difficulty } from '@/app/save';
import type { AbilityId, LevelDef, NodeType, Perks, UnitType } from '@/data';
import type { Edge } from './graph';
import type { Rng } from './rng';

export interface SimNode {
  id: number;
  /** World coordinates. */
  x: number;
  y: number;
  type: NodeType;
  level: 1 | 2 | 3;
  /** 0 = neutral, 1 = player, 2.. = enemies. */
  owner: number;
  units: number;
  /** Persistent routes: each is a list of node ids after this node. */
  routes: number[][];
  /** Fraction of capacity kept back from routes (0, 0.25, 0.5, 0.75). */
  reserve: number;
  /** Round-robin counter for route shipments. */
  rr: number;
  /** Seconds until next route shipment. */
  flowT: number;
  /** Units accumulated for the next route shipment. */
  flowAcc: number;
  /** Accumulated tower shots. */
  zapAcc: number;
  frozen: number;
  shield: number;
}

export interface Group {
  id: number;
  owner: number;
  n: number;
  unit: UnitType;
  from: number;
  to: number;
  path: number[];
  /** Progress along the current edge, 0..1. */
  t: number;
  x: number;
  y: number;
  speed: number;
}

export interface Rock {
  x: number;
  y: number;
  r: number;
  /** Cluster index. */
  c: number;
}

export interface Barrier {
  a: number;
  b: number;
  /** Position along the edge a→b (0..1) and world coordinates. */
  t: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}
export interface Mine {
  a: number;
  b: number;
  t: number;
  x: number;
  y: number;
  units: number;
}

export type SimEvent =
  | { type: 'launch'; group: Group; byPlayer: boolean; manual: boolean }
  | { type: 'capture'; node: number; by: number; prev: number; x: number; y: number }
  | { type: 'clash'; x: number; y: number; a: number; b: number; k: number }
  | {
      type: 'zap';
      node: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      target: number;
      killed: number;
    }
  | { type: 'upgrade'; node: number; owner: number }
  | { type: 'convert'; node: number; owner: number }
  | { type: 'cut'; sources: number[]; x: number; y: number }
  | { type: 'surrender'; faction: number }
  | { type: 'barrier'; x: number; y: number; hp: number; broken: boolean; owner: number }
  | { type: 'mine'; x: number; y: number; killed: number; owner: number }
  | { type: 'ability'; id: AbilityId; node: number }
  | { type: 'finished'; won: boolean };

export interface GameState {
  def: LevelDef;
  demo: boolean;
  difficulty: Difficulty;
  perks: Perks;
  rng: Rng;
  nodes: SimNode[];
  edges: Edge[];
  /** Connections a rock blocks; purely informational for rendering. */
  blocked: Edge[];
  adj: number[][];
  rocks: Rock[];
  barriers: Barrier[];
  mines: Mine[];
  groups: Group[];
  nextGroupId: number;
  time: number;
  energy: number;
  aiTimers: Record<number, number>;
  /** Seconds each AI faction has been in a surrender-eligible position. */
  surrenderT: Record<number, number>;
  stats: { captured: number; sends: number };
  over: 'won' | 'lost' | null;
  /** Events produced since the last drain. */
  events: SimEvent[];
}
