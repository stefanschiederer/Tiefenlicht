import type { TowerKind } from './config';

export interface Tower {
  id: number;
  x: number;
  y: number;
  owner: number;
  troops: number;
  /** Production accumulator (fractions of a troop). */
  acc: number;
  kind: TowerKind;
  /** Cannon reload countdown. */
  cool: number;
}

export interface Line {
  id: number;
  src: number;
  dst: number;
  owner: number;
  /** Countdown to the next troop leaving. */
  timer: number;
  /** Seconds since the line was drawn (grow-in animation). */
  age: number;
}

export interface Troop {
  id: number;
  owner: number;
  /** Start point of the walk (world units). */
  x0: number;
  y0: number;
  /** Target tower. */
  dst: number;
  /** Distance walked and total distance to walk. */
  d: number;
  len: number;
  /** Line the troop walks on (null once the line is gone: returning or orphaned troops). */
  line: number | null;
  /** Speed multiplier (riders from a stable are faster). */
  speed: number;
}

/** A straight wall segment; lines may not cross it. */
export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Hit points: troops marching into the wall knock it down; at 0 it crumbles. */
  hp?: number;
  max?: number;
}

export type GameEvent =
  | { type: 'line'; line: Line }
  | { type: 'retract'; line: Line }
  | { type: 'cut'; line: Line; x: number; y: number }
  | { type: 'capture'; tower: Tower; from: number }
  | { type: 'hit'; tower: Tower; owner: number }
  | { type: 'shot'; tower: Tower; x: number; y: number }
  | { type: 'zap'; tower: Tower; target: Tower }
  | { type: 'rocket'; target: Tower; x: number; y: number }
  | { type: 'wallhit'; x: number; y: number }
  | { type: 'wallbreak'; wall: Wall }
  | { type: 'clash'; x: number; y: number; a: number; b: number }
  | { type: 'end'; result: 'win' | 'lose' };

export interface PlayerBonus {
  start: number;
  growth: number;
  speed: number;
  send?: number;
  attack?: number;
  defense?: number;
  cap?: number;
}

export interface Rocket {
  id: number;
  target: number;
  /** Flight progress 0..1 (negative = still waiting to launch). */
  t: number;
  damage: number;
  /** Fraction of the damage dealt to enemy towers near the target. */
  splash: number;
  /** Launch point (world units) and a sideways curve for the flight path. */
  x0: number;
  y0: number;
  bend: number;
}

export interface LevelDef {
  /** 1-based level number. */
  n: number;
  towers: { x: number; y: number; owner: number; troops: number; kind?: TowerKind }[];
  walls: Wall[];
  /** Seconds between enemy decisions. */
  aiInterval: number;
  /** Enemy waits this long before its first move. */
  aiDelay: number;
  /** Production multiplier of enemy towers (below 1 makes the level easier). */
  enemyGrowth?: number;
  /** Permanent player skills: start troops, factors for production, walking speed, line output,
   *  damage dealt and damage taken, and extra tower capacity. */
  player?: PlayerBonus;
}

export interface GameState {
  def: LevelDef;
  towers: Tower[];
  lines: Line[];
  troops: Troop[];
  rockets: Rocket[];
  walls: Wall[];
  /** reach[a][b]: a straight line from tower a to b crosses no wall and no other tower. */
  reach: boolean[][];
  time: number;
  nextId: number;
  events: GameEvent[];
  result: 'win' | 'lose' | null;
}
