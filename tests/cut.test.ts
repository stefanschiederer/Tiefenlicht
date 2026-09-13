import { describe, expect, it } from 'vitest';
import { cutRoutes, segmentsIntersect } from '@/sim/actions';
import { makeState, node } from './helpers';

describe('segmentsIntersect', () => {
  it('detects a proper crossing', () => {
    expect(segmentsIntersect(0, 0, 10, 10, 0, 10, 10, 0)).toBe(true);
    // Vertical cut through a horizontal leg.
    expect(segmentsIntersect(50, -10, 50, 10, 0, 0, 100, 0)).toBe(true);
  });

  it('is symmetric in the two segments and their orientation', () => {
    expect(segmentsIntersect(0, 10, 10, 0, 0, 0, 10, 10)).toBe(true);
    expect(segmentsIntersect(10, 10, 0, 0, 10, 0, 0, 10)).toBe(true);
    expect(segmentsIntersect(0, 5, 10, 5, 0, 0, 10, 0)).toBe(false);
    expect(segmentsIntersect(10, 5, 0, 5, 10, 0, 0, 0)).toBe(false);
  });

  it('rejects parallel segments', () => {
    expect(segmentsIntersect(0, 0, 10, 0, 0, 5, 10, 5)).toBe(false);
    expect(segmentsIntersect(0, 0, 10, 10, 5, 0, 15, 10)).toBe(false);
  });

  it('counts touching an endpoint as an intersection', () => {
    // T-junction: D lands on the interior of AB.
    expect(segmentsIntersect(0, 0, 10, 0, 5, 10, 5, 0)).toBe(true);
    // Shared endpoint.
    expect(segmentsIntersect(0, 0, 10, 0, 10, 0, 20, 5)).toBe(true);
    // A lands on the interior of CD.
    expect(segmentsIntersect(5, 0, 5, 10, 0, 0, 10, 0)).toBe(true);
  });

  it('counts collinear overlap but not collinear gaps', () => {
    expect(segmentsIntersect(0, 0, 10, 0, 5, 0, 15, 0)).toBe(true);
    expect(segmentsIntersect(0, 0, 10, 0, 2, 0, 8, 0)).toBe(true);
    expect(segmentsIntersect(0, 0, 10, 0, 11, 0, 20, 0)).toBe(false);
    expect(segmentsIntersect(0, 0, 0, 10, 0, 20, 0, 30)).toBe(false);
  });

  it('rejects segments that are far apart or whose lines cross outside them', () => {
    expect(segmentsIntersect(0, 0, 1, 1, 5, 5, 6, 7)).toBe(false);
    expect(segmentsIntersect(0, 0, 10, 0, 5, 1, 5, 10)).toBe(false);
    expect(segmentsIntersect(0, 0, 10, 0, 11, -1, 20, 1)).toBe(false);
  });
});

/**
 * A 100-unit square of player nodes plus an enemy pair off to the right:
 *   0 (0,0) -> routes to 1 and via 2 to 3;   1 (100,0) -> route to 3;   2 (0,100);   3 (100,100)
 *   4 (300,0, enemy) -> route to 5 (400,0, enemy);   6 (200,200) a player node without routes
 */
function cutState() {
  return makeState(
    [
      { x: 0, y: 0, owner: 1, units: 20, routes: [[1], [2, 3]] },
      { x: 100, y: 0, owner: 1, units: 20, routes: [[3]] },
      { x: 0, y: 100, owner: 1, units: 20 },
      { x: 100, y: 100, owner: 1, units: 20 },
      { x: 300, y: 0, owner: 2, units: 20, routes: [[5]] },
      { x: 400, y: 0, owner: 2, units: 20 },
      { x: 200, y: 200, owner: 1, units: 20 },
    ],
    [
      [0, 1],
      [0, 2],
      [2, 3],
      [1, 3],
      [4, 5],
      [3, 6],
    ],
  );
}

describe('cutRoutes', () => {
  it('removes only the routes whose leg is crossed', () => {
    const s = cutState();
    // Vertical cut through the 0 -> 1 leg at x = 50.
    expect(cutRoutes(s, 50, -10, 50, 10)).toEqual([0]);
    expect(node(s, 0).routes).toEqual([[2, 3]]);
    expect(node(s, 1).routes).toEqual([[3]]);
    expect(node(s, 4).routes).toEqual([[5]]);
  });

  it('cuts a multi-hop route on its second leg', () => {
    const s = cutState();
    // Vertical cut through the 2 -> 3 leg (y = 100) at x = 50.
    expect(cutRoutes(s, 50, 90, 50, 110)).toEqual([0]);
    expect(node(s, 0).routes).toEqual([[1]]);
    expect(node(s, 1).routes).toEqual([[3]]);
  });

  it('cuts a multi-hop route on its first leg', () => {
    const s = cutState();
    // Horizontal cut through the 0 -> 2 leg (x = 0) at y = 50, stopping before x = 100.
    expect(cutRoutes(s, -10, 50, 50, 50)).toEqual([0]);
    expect(node(s, 0).routes).toEqual([[1]]);
    expect(node(s, 1).routes).toEqual([[3]]);
  });

  it('returns every source node whose routes were cut, in node order', () => {
    const s = cutState();
    // Horizontal cut at y = 50 across the whole square: crosses 0 -> 2 and 1 -> 3.
    expect(cutRoutes(s, -10, 50, 110, 50)).toEqual([0, 1]);
    expect(node(s, 0).routes).toEqual([[1]]);
    expect(node(s, 1).routes).toEqual([]);
  });

  it('reports a source once even if several of its routes are cut', () => {
    const s = cutState();
    // Diagonal from below-left of 0 to the centre: crosses 0 -> 1 and 0 -> 2 at once.
    expect(cutRoutes(s, 10, -10, -10, 10)).toEqual([0]);
    expect(node(s, 0).routes).toEqual([]);
    expect(node(s, 1).routes).toEqual([[3]]);
  });

  it('ignores enemy routes', () => {
    const s = cutState();
    expect(cutRoutes(s, 350, -10, 350, 10)).toEqual([]);
    expect(node(s, 4).routes).toEqual([[5]]);
    // A player node that is no longer the player's keeps its routes under the cut too.
    node(s, 1).owner = 2;
    expect(cutRoutes(s, 90, 50, 110, 50)).toEqual([]);
    expect(node(s, 1).routes).toEqual([[3]]);
  });

  it('ignores nodes without routes', () => {
    const s = cutState();
    // Passes right through node 6, which owns no routes and is no leg of another node's route.
    expect(cutRoutes(s, 190, 190, 210, 210)).toEqual([]);
    expect(node(s, 6).routes).toEqual([]);
    for (const id of [0, 1, 4]) expect(node(s, id).routes.length).toBeGreaterThan(0);
  });

  it('returns [] and leaves everything in place when no route is crossed', () => {
    const s = cutState();
    const before = s.nodes.map((n) => structuredClone(n.routes));
    expect(cutRoutes(s, 200, 200, 300, 300)).toEqual([]);
    expect(cutRoutes(s, 50, 10, 50, 90)).toEqual([]);
    expect(s.nodes.map((n) => n.routes)).toEqual(before);
    expect(s.groups).toHaveLength(0);
  });
});
