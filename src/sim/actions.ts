import { ABILITIES, ENERGY_MAX, MAX_ROUTES, PLAYER, TYPES, type AbilityId, type NodeType } from '@/data';
import type { GameState, Group, SimNode } from './state';
import { capOf, convertCost, speedFrom, upgradeCost } from './stats';

export interface LaunchOptions {
  /** Player-initiated drag (sound + tips). */
  manual?: boolean;
}

/** Sends `k` units from `n` along `path` (node ids after n). Returns the group or null. */
export function launch(
  s: GameState,
  n: SimNode,
  path: readonly number[],
  k: number,
  opts: LaunchOptions = {},
): Group | null {
  k = Math.min(Math.floor(n.units), Math.floor(k));
  if (k < 1 || !path.length) return null;
  n.units -= k;
  const unit = TYPES[n.type].unit;
  const g: Group = {
    id: s.nextGroupId++,
    owner: n.owner,
    n: k,
    unit,
    from: n.id,
    to: path[0] as number,
    path: path.slice(1),
    t: 0,
    x: n.x,
    y: n.y,
    speed: speedFrom(s, n, n.owner, unit),
  };
  s.groups.push(g);
  s.events.push({ type: 'launch', group: g, byPlayer: n.owner === PLAYER && !s.demo, manual: !!opts.manual });
  return g;
}

export function gainEnergy(s: GameState, lost: number): void {
  if (s.demo) return;
  s.energy = Math.min(ENERGY_MAX, s.energy + lost * 0.5 * (1 + s.perks.energy));
}

export function doUpgrade(s: GameState, n: SimNode, free = false): boolean {
  if (n.level >= 3) return false;
  const cost = free ? 0 : upgradeCost(s, n);
  if (n.units < cost) return false;
  n.units -= cost;
  n.level = (n.level + 1) as 2 | 3;
  s.events.push({ type: 'upgrade', node: n.id, owner: n.owner });
  return true;
}

export function doConvert(s: GameState, n: SimNode, type: NodeType): boolean {
  if (type === n.type || !s.def.types.includes(type)) return false;
  const cost = convertCost(s, n);
  if (n.units < cost) return false;
  n.units -= cost;
  n.type = type;
  n.level = 1;
  n.zapAcc = 0;
  s.events.push({ type: 'convert', node: n.id, owner: n.owner });
  return true;
}

export function canUseAbility(s: GameState, id: AbilityId): boolean {
  return s.perks.abilities.includes(id) && s.energy >= Math.ceil(ABILITIES[id].cost * (1 - s.perks.abcost));
}

export function useAbility(s: GameState, id: AbilityId, n: SimNode): boolean {
  const A = ABILITIES[id];
  const cost = Math.ceil(A.cost * (1 - s.perks.abcost));
  if (s.energy < cost || !s.perks.abilities.includes(id)) return false;
  if (A.target === 'own' && n.owner !== PLAYER) return false;
  if (A.target === 'enemy' && n.owner === PLAYER) return false;
  s.energy -= cost;
  if (id === 'stoss') n.units += 12 + s.perks.stossUnits;
  if (id === 'frost') {
    n.frozen = 10 + s.perks.frostDur;
    n.units *= 0.7;
  }
  if (id === 'schild') n.shield = 8 + s.perks.schildDur;
  s.events.push({ type: 'ability', id, node: n.id });
  return true;
}

/** Units a manual drag would send at the given fraction, respecting the reserve. */
export function sendAmount(s: GameState, n: SimNode, frac: number): number {
  const avail = Math.max(0, n.units - n.reserve * capOf(s, n));
  return Math.max(avail >= 1 ? 1 : 0, Math.floor(avail * frac));
}

/** Adds (or replaces, by target) a persistent route; the oldest is dropped beyond `max`. Returns true if new. */
export function addRoute(src: SimNode, route: readonly number[], max: number = MAX_ROUTES): boolean {
  const target = route[route.length - 1];
  const i = src.routes.findIndex((r) => r[r.length - 1] === target);
  const isNew = i < 0;
  if (i >= 0) src.routes[i] = [...route];
  else {
    while (src.routes.length >= Math.max(1, max)) src.routes.shift();
    src.routes.push([...route]);
  }
  src.flowT = 0;
  return isNew;
}

export function removeRoute(src: SimNode, index: number): void {
  src.routes.splice(index, 1);
}

export function clearRoutes(src: SimNode): void {
  src.routes = [];
}

export function cycleReserve(src: SimNode): number {
  src.reserve = (src.reserve + 0.25) % 1;
  return src.reserve;
}

/** True if segments AB and CD intersect (proper or touching). */
export function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): boolean {
  const o = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) =>
    (qy - py) * (rx - qx) - (qx - px) * (ry - qy);
  const on = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) =>
    Math.min(px, rx) <= qx && qx <= Math.max(px, rx) && Math.min(py, ry) <= qy && qy <= Math.max(py, ry);
  const o1 = o(ax, ay, bx, by, cx, cy),
    o2 = o(ax, ay, bx, by, dx, dy),
    o3 = o(cx, cy, dx, dy, ax, ay),
    o4 = o(cx, cy, dx, dy, bx, by);
  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  if (o1 === 0 && on(ax, ay, cx, cy, bx, by)) return true;
  if (o2 === 0 && on(ax, ay, dx, dy, bx, by)) return true;
  if (o3 === 0 && on(cx, cy, ax, ay, dx, dy)) return true;
  if (o4 === 0 && on(cx, cy, bx, by, dx, dy)) return true;
  return false;
}

/** Shortest distance between segments AB and CD (0 if they intersect). */
export function segmentDistance(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): number {
  if (segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) return 0;
  const pointSeg = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const vx = x2 - x1,
      vy = y2 - y1,
      l2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / l2));
    return Math.hypot(x1 + vx * t - px, y1 + vy * t - py);
  };
  return Math.min(
    pointSeg(ax, ay, cx, cy, dx, dy),
    pointSeg(bx, by, cx, cy, dx, dy),
    pointSeg(cx, cy, ax, ay, bx, by),
    pointSeg(dx, dy, ax, ay, bx, by),
  );
}

/**
 * Removes every player route that has a leg within `tol` world units of the segment AB (the "cut"
 * gesture; tol = 0 means the swipe must cross the leg). Returns the ids of the affected source nodes.
 */
export function cutRoutes(s: GameState, ax: number, ay: number, bx: number, by: number, tol = 0): number[] {
  const cut: number[] = [];
  for (const n of s.nodes) {
    if (n.owner !== PLAYER || !n.routes.length) continue;
    const before = n.routes.length;
    n.routes = n.routes.filter((route) => {
      let prev = n;
      for (const id of route) {
        const next = s.nodes[id] as SimNode;
        if (segmentDistance(ax, ay, bx, by, prev.x, prev.y, next.x, next.y) <= tol) return false;
        prev = next;
      }
      return true;
    });
    if (n.routes.length < before) cut.push(n.id);
  }
  return cut;
}
