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
}

/** A straight wall segment; lines may not cross it. */
export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type GameEvent =
  | { type: 'line'; line: Line }
  | { type: 'retract'; line: Line }
  | { type: 'cut'; line: Line; x: number; y: number }
  | { type: 'capture'; tower: Tower; from: number }
  | { type: 'hit'; tower: Tower; owner: number }
  | { type: 'shot'; tower: Tower; x: number; y: number }
  | { type: 'clash'; x: number; y: number; a: number; b: number }
  | { type: 'end'; result: 'win' | 'lose' };

export interface LevelDef {
  /** 1-based level number. */
  n: number;
  towers: { x: number; y: number; owner: number; troops: number; kind?: TowerKind }[];
  walls: Wall[];
  /** Seconds between enemy decisions. */
  aiInterval: number;
  /** Enemy waits this long before its first move. */
  aiDelay: number;
}

export interface GameState {
  def: LevelDef;
  towers: Tower[];
  lines: Line[];
  troops: Troop[];
  walls: Wall[];
  /** reach[a][b]: a straight line from tower a to b crosses no wall and no other tower. */
  reach: boolean[][];
  time: number;
  nextId: number;
  events: GameEvent[];
  result: 'win' | 'lose' | null;
}
