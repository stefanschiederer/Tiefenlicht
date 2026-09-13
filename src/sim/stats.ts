import {
  ABILITIES,
  BASE_SPEED,
  DIFF,
  PLAYER,
  SIM_SCALE,
  TYPES,
  UNITS,
  type AbilityId,
  type NodeTypeDef,
  type Triple,
  type UnitType,
} from '@/data';
import type { GameState, Group, SimNode } from './state';

/** Whether perks and player-only rules apply to this node (faction 1 outside the demo). */
export const isPlayer = (s: GameState, n: { owner: number }): boolean => n.owner === PLAYER && !s.demo;

export function stat(n: SimNode, key: 'cap' | 'rate' | 'def'): number;
export function stat(n: SimNode, key: 'speedMul' | 'zapRange' | 'zapRate' | 'boost'): number;
export function stat(n: SimNode, key: keyof NodeTypeDef): number {
  const v = TYPES[n.type][key] as Triple | number | undefined;
  if (v === undefined) return 0;
  return Array.isArray(v) ? (v[n.level - 1] as number) : (v as number);
}

export const capOf = (s: GameState, n: SimNode): number =>
  stat(n, 'cap') * (isPlayer(s, n) ? 1 + s.perks.cap : 1);

export function rateOf(s: GameState, n: SimNode): number {
  let r = stat(n, 'rate');
  if (r <= 0 || n.frozen > 0) return 0;
  const q = (s.adj[n.id] ?? []).reduce((acc, j) => {
    const m = s.nodes[j] as SimNode;
    return acc + (m.type === 'quelle' && m.owner === n.owner ? stat(m, 'boost') : 0);
  }, 0);
  r *= 1 + Math.min(1.5, q);
  if (isPlayer(s, n)) r *= 1 + s.perks.prod;
  else if (n.owner > 1 || s.demo) r *= s.def.prod * DIFF[s.difficulty].prod;
  return r;
}

export function defOf(s: GameState, n: SimNode): number {
  let d = stat(n, 'def');
  if (isPlayer(s, n)) d *= 1 + s.perks.def;
  if (n.shield > 0) d *= 3;
  return d;
}

export const upgradeCost = (s: GameState, n: SimNode): number =>
  Math.ceil(20 * n.level * (isPlayer(s, n) ? 1 - s.perks.cheap : 1));
export const convertCost = (s: GameState, n: SimNode): number =>
  Math.ceil(25 * (isPlayer(s, n) ? 1 - s.perks.cheap : 1));
export const rangeOf = (s: GameState, n: SimNode): number =>
  stat(n, 'zapRange') * SIM_SCALE * (isPlayer(s, n) ? 1 + s.perks.range : 1);
export const abilityCost = (s: GameState, id: AbilityId): number =>
  Math.ceil(ABILITIES[id].cost * (1 - s.perks.abcost));

export const strOf = (s: GameState, g: Pick<Group, 'unit' | 'owner'>): number =>
  UNITS[g.unit].str * (g.owner === PLAYER && !s.demo ? 1 + s.perks.str : 1);
export const power = (s: GameState, g: Group): number => g.n * strOf(s, g);

export function incoming(s: GameState, id: number, pred: (g: Group) => boolean): number {
  let sum = 0;
  for (const g of s.groups) if (g.to === id && pred(g)) sum += power(s, g);
  return sum;
}

export function speedFrom(s: GameState, n: SimNode, owner: number, unit: UnitType): number {
  let v = BASE_SPEED * SIM_SCALE * UNITS[unit].speed;
  if (n.type === 'strom' && n.owner === owner) v *= stat(n, 'speedMul');
  if (owner === PLAYER && !s.demo) v *= 1 + s.perks.speed;
  return v;
}

export const nodeDist = (a: SimNode, b: SimNode): number => Math.hypot(a.x - b.x, a.y - b.y);
/** Drawn radius of a node in world units. */
export const nodeRadius = (n: SimNode): number => TYPES[n.type].r * SIM_SCALE * (1 + (n.level - 1) * 0.12);
