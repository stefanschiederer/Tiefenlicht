import { describe, expect, it } from 'vitest';
import { CAMPAIGN, WORLD_H, WORLD_W, endlessDef, type LevelDef } from '@/data';
import { hopDistances, isConnected, segmentHitsCircle } from '@/sim/graph';
import { generateMap, generateMapSafe, type GeneratedMap } from '@/sim/mapgen';

const LEVELS: { name: string; def: LevelDef }[] = [
  ...CAMPAIGN.map((def, i) => ({ name: `campaign ${i} (${def.name})`, def })),
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ name: `endless wave ${n}`, def: endlessDef(n) })),
];

const minDist = (nodes: number) => Math.max(92, Math.min(WORLD_W, WORLD_H) * 0.16) * (nodes > 14 ? 0.85 : 1);
const minHopsFor = (nodes: number) => (nodes < 9 ? 2 : nodes < 13 ? 3 : 4);
const EPS = 1e-6;

function pt(m: GeneratedMap, i: number) {
  const p = m.points[i];
  if (!p) throw new Error(`no point ${i}`);
  return p;
}

describe.each(LEVELS)('generateMapSafe: $name', ({ def }) => {
  const map = generateMapSafe(def);
  const n = map.points.length;

  it('does not need the fallback for shipped levels', () => {
    const direct = generateMap({ nodes: def.nodes, enemies: def.enemies, obst: def.obst, seed: def.seed });
    expect(direct).not.toBeNull();
    expect(n).toBe(def.nodes);
  });

  it('yields a connected graph with valid edges', () => {
    expect(isConnected(n, map.edges)).toBe(true);
    for (const [a, b] of map.edges) {
      expect(a).not.toBe(b);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(n);
      expect(b).toBeLessThan(n);
    }
  });

  it('keeps nodes apart by at least minD', () => {
    const minD = minDist(def.nodes);
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const a = pt(map, i),
          b = pt(map, j);
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(minD - EPS);
      }
  });

  it('places one start per faction, far enough apart in hops, with a well-connected player start', () => {
    expect(map.starts).toHaveLength(def.enemies + 1);
    expect(new Set(map.starts).size).toBe(map.starts.length);
    const player = map.starts[0] as number;
    const hops = hopDistances(n, map.edges, player);
    for (const s of map.starts.slice(1)) expect(hops[s]).toBeGreaterThanOrEqual(minHopsFor(def.nodes));
    const degree = map.edges.filter((e) => e[0] === player || e[1] === player).length;
    expect(degree).toBeGreaterThanOrEqual(2);
  });

  it('keeps nodes and edges clear of rocks', () => {
    for (const r of map.rocks) {
      for (const p of map.points)
        expect(Math.hypot(r.x - p.x, r.y - p.y)).toBeGreaterThanOrEqual(r.r + 42 - EPS);
      for (const [a, b] of map.edges) {
        const pa = pt(map, a),
          pb = pt(map, b);
        expect(segmentHitsCircle(pa.x, pa.y, pb.x, pb.y, r.x, r.y, r.r + 8)).toBe(false);
      }
    }
  });

  it('keeps all coordinates inside the world', () => {
    for (const p of map.points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(WORLD_W);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(WORLD_H);
    }
    for (const r of map.rocks) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x).toBeLessThanOrEqual(WORLD_W);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeLessThanOrEqual(WORLD_H);
      expect(r.r).toBeGreaterThan(0);
    }
  });

  it('is deterministic', () => {
    const again = generateMapSafe(def);
    expect(again.points).toEqual(map.points);
    expect(again.edges).toEqual(map.edges);
    expect(again.rocks).toEqual(map.rocks);
    expect(again.starts).toEqual(map.starts);
    expect(again.rng.state).toBe(map.rng.state);
  });
});

describe('generateMapSafe fallback', () => {
  it('relaxes obstacles and node count for an impossible request', () => {
    // 60 nodes cannot fit with the minimum distance; the fallback shrinks the request.
    const m = generateMapSafe({ nodes: 60, enemies: 1, obst: 7, seed: 3 });
    expect(m.points.length).toBeLessThan(60);
    expect(m.points.length).toBeGreaterThanOrEqual(5);
    expect(isConnected(m.points.length, m.edges)).toBe(true);
    expect(m.starts).toHaveLength(2);
  });
});
