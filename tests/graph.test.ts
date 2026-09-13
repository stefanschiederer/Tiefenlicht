import { describe, expect, it } from 'vitest';
import {
  bfsPath,
  buildAdjacency,
  hopDistances,
  isConnected,
  segmentHitsCircle,
  type Edge,
} from '@/sim/graph';

// 0-1-2-3 is a three-hop chain; 0-4-3 is a two-hop shortcut; 5 is isolated.
const EDGES: Edge[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [0, 4],
  [4, 3],
];
const N = 6;
const adj = buildAdjacency(N, EDGES);

describe('buildAdjacency', () => {
  it('is symmetric and ignores nothing', () => {
    expect(adj[0]).toEqual([1, 4]);
    expect(adj[3]).toEqual([2, 4]);
    expect(adj[5]).toEqual([]);
  });
});

describe('bfsPath', () => {
  it('finds the shortest path in hops including both ends', () => {
    expect(bfsPath(adj, 0, 3)).toEqual([0, 4, 3]);
    expect(bfsPath(adj, 3, 0)).toEqual([3, 4, 0]);
  });

  it('returns [from] when from equals to', () => {
    expect(bfsPath(adj, 2, 2)).toEqual([2]);
  });

  it('respects the allow predicate for intermediate nodes', () => {
    expect(bfsPath(adj, 0, 3, (id) => id !== 4)).toEqual([0, 1, 2, 3]);
  });

  it('does not apply the allow predicate to the target', () => {
    // Only the target is disallowed: it is still reachable.
    expect(bfsPath(adj, 0, 3, (id) => id !== 3)).toEqual([0, 4, 3]);
    // Everything except the target is blocked: only direct neighbours remain reachable.
    expect(bfsPath(adj, 0, 1, () => false)).toEqual([0, 1]);
    expect(bfsPath(adj, 0, 3, () => false)).toBeNull();
  });

  it('returns null for unreachable targets', () => {
    expect(bfsPath(adj, 0, 5)).toBeNull();
    expect(bfsPath(adj, 5, 0)).toBeNull();
  });
});

describe('isConnected', () => {
  it('detects connected and disconnected graphs', () => {
    expect(isConnected(5, EDGES)).toBe(true);
    expect(isConnected(N, EDGES)).toBe(false);
    expect(isConnected(1, [])).toBe(true);
    expect(isConnected(0, [])).toBe(true);
    expect(isConnected(2, [])).toBe(false);
  });
});

describe('hopDistances', () => {
  it('computes BFS distances and Infinity for unreachable nodes', () => {
    expect(hopDistances(N, EDGES, 0)).toEqual([0, 1, 2, 2, 1, Infinity]);
    expect(hopDistances(N, EDGES, 2)).toEqual([2, 1, 0, 1, 2, Infinity]);
  });
});

describe('segmentHitsCircle', () => {
  it('detects a circle crossing the middle of a segment', () => {
    expect(segmentHitsCircle(0, 0, 100, 0, 50, 5, 10)).toBe(true);
    expect(segmentHitsCircle(0, 0, 100, 0, 50, 15, 10)).toBe(false);
  });

  it('uses the closest point clamped to the segment ends', () => {
    // Circle beyond the end of the segment, within r of the endpoint.
    expect(segmentHitsCircle(0, 0, 100, 0, 105, 0, 10)).toBe(true);
    // Beyond the endpoint by more than r: the infinite line would hit, the segment does not.
    expect(segmentHitsCircle(0, 0, 100, 0, 120, 0, 10)).toBe(false);
    expect(segmentHitsCircle(0, 0, 100, 0, -20, 0, 10)).toBe(false);
  });

  it('treats the boundary as a miss and handles degenerate segments', () => {
    expect(segmentHitsCircle(0, 0, 100, 0, 50, 10, 10)).toBe(false);
    expect(segmentHitsCircle(0, 0, 100, 0, 50, 9.999, 10)).toBe(true);
    expect(segmentHitsCircle(5, 5, 5, 5, 8, 9, 5.1)).toBe(true);
    expect(segmentHitsCircle(5, 5, 5, 5, 8, 9, 4.9)).toBe(false);
  });
});
