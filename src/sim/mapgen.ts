import { SIM_SCALE, WORLD_H, WORLD_W, type LevelDef } from '@/data';
import { hopDistances, isConnected, segmentHitsCircle, type Edge } from './graph';
import { Rng } from './rng';
import type { Rock } from './state';

export interface GeneratedMap {
  points: { x: number; y: number }[];
  rocks: Rock[];
  edges: Edge[];
  /** Node ids of the start positions; index 0 is the player. */
  starts: number[];
  /** RNG continuing after generation (used for node types and garrisons). */
  rng: Rng;
}

export interface MapParams {
  nodes: number;
  enemies: number;
  obst: number;
  seed: number;
}

export function mapRng(p: MapParams): Rng {
  return Rng.fromSeed(((p.seed * 2654435761) >>> 0) ^ (p.nodes * 97));
}

/** Gabriel graph with random thinning, rock obstacles, and start positions with a minimum hop distance. */
export function generateMap(p: MapParams): GeneratedMap | null {
  const W = WORLD_W,
    H = WORLD_H,
    R = Math.min(W, H),
    S = SIM_SCALE;
  const rng = mapRng(p);
  const minHops = p.nodes < 9 ? 2 : p.nodes < 13 ? 3 : 4;
  for (let attempt = 0; attempt < 90; attempt++) {
    const pts: { x: number; y: number }[] = [];
    const rocks: Rock[] = [];
    for (let i = 0; i < p.obst; i++) {
      const cx = 0.14 + rng.next() * 0.72,
        cy = 0.2 + rng.next() * 0.62,
        k = 2 + Math.floor(rng.next() * 3);
      for (let j = 0; j < k; j++) {
        rocks.push({
          x: (cx + (rng.next() - 0.5) * 0.09) * W,
          y: (cy + (rng.next() - 0.5) * 0.12) * H,
          r: (0.028 + rng.next() * 0.03) * R,
          c: i,
        });
      }
    }
    const minD = Math.max(92, Math.min(W, H) * 0.16) * (p.nodes > 14 ? 0.85 : 1);
    let tries = 0;
    while (pts.length < p.nodes && tries < 3000) {
      tries++;
      const x = (0.06 + rng.next() * 0.88) * W,
        y = (0.16 + rng.next() * 0.7) * H;
      if (rocks.some((r) => Math.hypot(r.x - x, r.y - y) < r.r + 42 * S)) continue;
      if (pts.some((q) => Math.hypot(q.x - x, q.y - y) < minD)) continue;
      pts.push({ x, y });
    }
    if (pts.length < p.nodes) continue;
    const all: Edge[] = [];
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i] as { x: number; y: number },
          b = pts[j] as { x: number; y: number };
        const len = Math.hypot(a.x - b.x, a.y - b.y);
        if (len > Math.min(W, H) * 0.48) continue;
        const mx = (a.x + b.x) / 2,
          my = (a.y + b.y) / 2,
          rr = len / 2;
        let ok = true;
        for (let k = 0; k < pts.length && ok; k++) {
          if (k === i || k === j) continue;
          const c = pts[k] as { x: number; y: number };
          if (Math.hypot(c.x - mx, c.y - my) < rr * 0.98) ok = false;
        }
        if (!ok || rocks.some((r) => segmentHitsCircle(a.x, a.y, b.x, b.y, r.x, r.y, r.r + 8 * S))) continue;
        all.push([i, j]);
      }
    }
    let keep = all.slice();
    for (const e of rng.shuffle(all.slice())) {
      if (rng.next() > 0.28) continue;
      const test = keep.filter((k) => k !== e);
      const deg = (i: number) => test.filter((k) => k[0] === i || k[1] === i).length;
      if (deg(e[0]) < 2 || deg(e[1]) < 2) continue;
      if (isConnected(pts.length, test)) keep = test;
    }
    if (!isConnected(pts.length, keep)) continue;
    const order = pts
      .map((_, i) => i)
      .sort((a, b) => (pts[a] as { x: number }).x - (pts[b] as { x: number }).x);
    const starts = [order[0] as number];
    const dpx = (i: number, j: number) =>
      Math.hypot(
        (pts[i] as { x: number }).x - (pts[j] as { x: number }).x,
        (pts[i] as { y: number }).y - (pts[j] as { y: number }).y,
      );
    while (starts.length < p.enemies + 1) {
      let best = -1,
        bd = -1;
      for (let i = 0; i < pts.length; i++) {
        if (starts.includes(i)) continue;
        const dd = Math.min(...starts.map((s) => dpx(s, i)));
        if (dd > bd) {
          bd = dd;
          best = i;
        }
      }
      starts.push(best);
    }
    const hops = hopDistances(pts.length, keep, starts[0] as number);
    if (starts.slice(1).some((s) => (hops[s] as number) < minHops)) continue;
    if (keep.filter((e) => e[0] === starts[0] || e[1] === starts[0]).length < 2) continue;
    return { points: pts, rocks, edges: keep, starts, rng };
  }
  return null;
}

/** Like generateMap, but relaxes obstacles and node count until a map exists. */
export function generateMapSafe(def: Pick<LevelDef, 'nodes' | 'enemies' | 'obst' | 'seed'>): GeneratedMap {
  const cur: MapParams = { nodes: def.nodes, enemies: def.enemies, obst: def.obst, seed: def.seed };
  for (let i = 0; i < 12; i++) {
    const m = generateMap(cur);
    if (m) return m;
    if (cur.obst > 0) cur.obst--;
    else cur.nodes = Math.max(5, cur.nodes - 1);
    cur.seed += 7;
  }
  const last = generateMap({ nodes: 6, enemies: def.enemies, obst: 0, seed: def.seed });
  if (!last) throw new Error('map generation failed');
  return last;
}
