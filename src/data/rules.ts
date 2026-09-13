import type { Difficulty } from '@/app/save';

export interface DifficultyDef {
  label: string;
  /** Multiplier on enemy production. */
  prod: number;
  /** Multiplier on the AI's decision interval (lower = faster AI). */
  ai: number;
}
export const DIFF: Record<Difficulty, DifficultyDef> = {
  leicht: { label: 'Leicht', prod: 0.85, ai: 1.3 },
  normal: { label: 'Normal', prod: 1, ai: 1 },
  schwer: { label: 'Schwer', prod: 1.15, ai: 0.8 },
};

export type AbilityId = 'stoss' | 'frost' | 'schild';
export interface AbilityDef {
  name: string;
  icon: string;
  cost: number;
  target: 'own' | 'enemy';
  desc: string;
}
export const ABILITIES: Record<AbilityId, AbilityDef> = {
  stoss: {
    name: 'Lichtstoß',
    icon: '✦',
    cost: 35,
    target: 'own',
    desc: '12 Einheiten erscheinen sofort an einem eigenen Knoten.',
  },
  frost: {
    name: 'Frostwelle',
    icon: '❄',
    cost: 60,
    target: 'enemy',
    desc: 'Ein fremder Knoten friert 10 Sekunden ein und verliert 30 % seiner Einheiten.',
  },
  schild: {
    name: 'Schild',
    icon: '⬡',
    cost: 45,
    target: 'own',
    desc: 'Ein eigener Knoten verteidigt 8 Sekunden lang dreifach.',
  },
};
export const ABILITY_ORDER: readonly AbilityId[] = ['stoss', 'frost', 'schild'];

/** World size in world units. The simulation is independent of the screen. */
export const WORLD_W = 1600;
export const WORLD_H = 800;
/** Equivalent of the prototype's screen scale factor at the reference resolution. */
export const SIM_SCALE = 1;
export const BASE_SPEED = 82;
/** Max simultaneous routes per node (absolute cap; the allowed number grows with the node level). */
export const MAX_ROUTES = 3;
/** Routes a node may hold per upgrade level (Tower-War style: more lines with a higher tower). */
export const ROUTES_PER_LEVEL: readonly number[] = [1, 2, 3];
/** Seconds between route shipments (halved with the "flow" perk). */
export const FLOW_INTERVAL = 0.4;
export const FLOW_INTERVAL_FAST = 0.2;
/**
 * Tower-War stream: every route carries units out of its node at this constant rate (units per second),
 * one unit at a time, as long as the node has units. Production may outpace it on upgraded nodes.
 */
export const STREAM_RATE = 1.6;
/** Stream rate multiplier with the "flow" perk. */
export const STREAM_RATE_FAST = 1.5;
/** Minimum units per route shipment. 1 = continuous stream of single units (Tower-War style). */
export const ROUTE_BATCH = 1;
export const ENERGY_MAX = 100;
/**
 * Mop-up rule: an AI faction that has held at most SURRENDER_NODES nodes for SURRENDER_SECONDS while the
 * player holds at least SURRENDER_SHARE of all nodes gives up (its nodes turn neutral).
 */
export const SURRENDER_NODES = 1;
export const SURRENDER_SECONDS = 10;
export const SURRENDER_SHARE = 0.6;
/** Reef barrier hit points (attack power needed to break it) by level index bracket. */
export const BARRIER_HP = 24;
/** Units a mine destroys from the first group that passes. */
export const MINE_UNITS = 8;
