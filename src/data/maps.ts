import type { NodeType } from './types';

/** Hand-made map (from the editor). Coordinates in world units (1600×800). */
export interface HandMap {
  nodes: { x: number; y: number; type?: NodeType; owner?: number; units?: number; level?: 1 | 2 | 3 }[];
  edges: [number, number][];
  rocks?: { x: number; y: number; r: number; c: number }[];
  barriers?: { edge: [number, number]; t?: number; hp?: number }[];
  mines?: { edge: [number, number]; t?: number; units?: number }[];
}

/** Special objective besides eliminating all enemies. */
export type Objective = { type: 'hold'; node: number; seconds: number; label: string };

/** Level 1 – a gentle first map: the player on the left, one enemy on the right, a soft chokepoint. */
export const MAP_ERSTES_LEUCHTEN: HandMap = {
  nodes: [
    { x: 220, y: 400, owner: 1, units: 14 },
    { x: 470, y: 250, units: 3 },
    { x: 470, y: 560, units: 3 },
    { x: 760, y: 400, units: 6 },
    { x: 1050, y: 240, units: 5 },
    { x: 1050, y: 570, units: 5 },
    { x: 1360, y: 400, owner: 2, units: 9 },
  ],
  edges: [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 3],
    [3, 4],
    [3, 5],
    [4, 6],
    [5, 6],
  ],
  rocks: [
    { x: 760, y: 150, r: 46, c: 0 },
    { x: 815, y: 190, r: 34, c: 0 },
    { x: 760, y: 660, r: 44, c: 1 },
    { x: 705, y: 620, r: 30, c: 1 },
  ],
};

/** Level 7 – Wachtposten: two lanes guarded by neutral watchtowers; the enemy sits behind a barrier. */
export const MAP_WACHTPOSTEN: HandMap = {
  nodes: [
    { x: 180, y: 400, owner: 1, type: 'brut', units: 20 },
    { x: 400, y: 220, units: 6 },
    { x: 400, y: 580, units: 6 },
    { x: 640, y: 150, type: 'waechter', units: 8 },
    { x: 640, y: 650, type: 'waechter', units: 8 },
    { x: 700, y: 400, type: 'bastion', units: 10 },
    { x: 940, y: 230, type: 'strom', units: 4 },
    { x: 940, y: 570, type: 'strom', units: 4 },
    { x: 1180, y: 400, type: 'nest', units: 9 },
    { x: 1400, y: 200, owner: 2, type: 'brut', units: 20 },
    { x: 1400, y: 600, owner: 3, type: 'brut', units: 20 },
    { x: 1180, y: 120, units: 3 },
    { x: 1180, y: 680, units: 3 },
  ],
  edges: [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [1, 5],
    [2, 5],
    [3, 6],
    [4, 7],
    [5, 6],
    [5, 7],
    [6, 8],
    [7, 8],
    [6, 11],
    [7, 12],
    [11, 9],
    [12, 10],
    [8, 9],
    [8, 10],
  ],
  rocks: [
    { x: 520, y: 400, r: 50, c: 0 },
    { x: 560, y: 350, r: 30, c: 0 },
    { x: 1060, y: 400, r: 42, c: 1 },
  ],
  barriers: [{ edge: [8, 9] }, { edge: [8, 10] }],
};
