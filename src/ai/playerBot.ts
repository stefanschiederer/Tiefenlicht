/**
 * Heuristic bot that plays the PLAYER faction in a headless simulation (balance harness).
 *
 * It mirrors the enemy heuristic from `aiAct` but uses the player's mechanics: drawing a path
 * sends 50 % immediately and leaves a persistent route behind. Deterministic — only `state.rng`
 * is used for randomness.
 */
import { MAX_ROUTES, PLAYER, TYPES, UNITS } from '@/data';
import { frontier } from '@/ai/bot';
import { ROUTE_SHARE } from '@/data';
import { addRoute, doUpgrade, launch, removeRoute, sendAmount } from '@/sim/actions';
import { bfsPath } from '@/sim/graph';
import type { GameState, SimNode } from '@/sim/state';
import { capOf, defOf, incoming, rateOf, upgradeCost } from '@/sim/stats';

export interface PlayerBotOptions {
  /** Seconds between decisions (default 1.5). */
  interval?: number;
  /** Fraction sent when a new path is drawn (default 0.5, the game's default send amount). */
  sendFrac?: number;
  /** Probability per decision of trying an upgrade (default 0.45, like the enemy AI). */
  upgradeChance?: number;
  /** Reserve fraction applied to frontline nodes (default 0.25). */
  frontReserve?: number;
}

export interface PlayerBot {
  /** Advances the internal timer and acts whenever it elapses. */
  update(state: GameState, dt: number): void;
  /** Resets the timer (e.g. for a new state). */
  reset(): void;
}

const DEFAULTS: Required<PlayerBotOptions> = {
  interval: 1.5,
  sendFrac: 0.5,
  upgradeChance: 0.45,
  frontReserve: 0.25,
};

const node = (s: GameState, id: number): SimNode => s.nodes[id] as SimNode;
const neighbours = (s: GameState, id: number): SimNode[] => (s.adj[id] ?? []).map((j) => node(s, j));
const isEnemy = (n: SimNode): boolean => n.owner > 1;
const hasEnemyNeighbour = (s: GameState, n: SimNode): boolean => neighbours(s, n.id).some(isEnemy);
const hasForeignNeighbour = (s: GameState, n: SimNode): boolean =>
  neighbours(s, n.id).some((m) => m.owner !== PLAYER);

/** Power the source can keep pushing along a route in the near future (units on hand plus ~8 s of production). */
function flowPower(s: GameState, src: SimNode): number {
  const str = UNITS[TYPES[src.type].unit].str;
  return (Math.max(0, src.units - src.reserve * capOf(s, src)) + rateOf(s, src) * 8) * str;
}

/** Whether a route from `src` into the non-own node `t` is still worth keeping (a drip into a strong node just feeds it). */
function attackWinnable(s: GameState, src: SimNode, t: SimNode): boolean {
  if (t.owner === 0) return true;
  const defenders = t.units * defOf(s, t) + incoming(s, t.id, (g) => g.owner === t.owner);
  const ours = incoming(s, t.id, (g) => g.owner === PLAYER) + flowPower(s, src);
  return ours > defenders * 1.15 + 1;
}

/** Drops routes that end deep in own territory or feed a hopeless attack, and enforces MAX_ROUTES. */
function tidyRoutes(s: GameState, mine: SimNode[]): void {
  for (const n of mine) {
    for (let i = n.routes.length - 1; i >= 0; i--) {
      const r = n.routes[i] as number[];
      const tid = r[r.length - 1];
      if (tid === undefined) {
        removeRoute(n, i);
        continue;
      }
      const t = node(s, tid);
      const rear = t.owner === PLAYER && !hasForeignNeighbour(s, t);
      if (rear || (t.owner !== PLAYER && !attackWinnable(s, n, t))) removeRoute(n, i);
    }
    while (n.routes.length > MAX_ROUTES) removeRoute(n, 0);
  }
}

/** Reserve 25 % at the front, nothing in the rear (rear nodes are drained by routes on purpose). */
function setReserves(s: GameState, mine: SimNode[], frontReserve: number): void {
  for (const n of mine) n.reserve = hasEnemyNeighbour(s, n) ? frontReserve : 0;
}

/** Sends the configured share now and keeps the path as a route (the player's draw gesture). */
function draw(s: GameState, src: SimNode, path: readonly number[], frac: number): void {
  const k = sendAmount(s, src, frac);
  if (k >= 1) launch(s, src, path, k);
  const target = path[path.length - 1];
  if (target !== undefined && node(s, target).owner !== PLAYER) {
    // Only one attack route per source: concentrate instead of spreading the drip.
    for (let i = src.routes.length - 1; i >= 0; i--) {
      const r = src.routes[i] as number[];
      const tid = r[r.length - 1] as number;
      if (tid !== target && node(s, tid).owner !== PLAYER) removeRoute(src, i);
    }
  }
  addRoute(src, path);
  s.stats.sends++;
}

/** One decision for the player faction. Returns true if something was done. */
export function playerBotAct(s: GameState, opts: PlayerBotOptions = {}): boolean {
  const o = { ...DEFAULTS, ...opts };
  const rng = s.rng;
  const F = PLAYER;
  const mine = s.nodes.filter((n) => n.owner === F);
  if (!mine.length || s.over) return false;

  tidyRoutes(s, mine);
  setReserves(s, mine, o.frontReserve);

  // (a) Reinforce threatened nodes, like the enemy AI.
  for (const n of mine) {
    const threat = incoming(s, n.id, (g) => g.owner !== F);
    if (threat > 3 && threat > n.units * defOf(s, n) * 0.9) {
      const helper = neighbours(s, n.id)
        .filter((m) => m.owner === F && m.units >= 6)
        .sort((a, b) => b.units - a.units)[0];
      if (helper) {
        launch(s, helper, [n.id], Math.floor(helper.units * 0.6));
        return true;
      }
    }
  }

  // (b) Upgrade a rich node, preferably a safe one, occasionally.
  if (rng.next() < o.upgradeChance) {
    const rich = mine.filter(
      (n) => n.level < 3 && n.units >= upgradeCost(s, n) + 8 && n.units >= capOf(s, n) * 0.65,
    );
    const cand =
      rich
        .filter((n) => !hasEnemyNeighbour(s, n))
        .sort((a, b) => TYPES[b.type].value - TYPES[a.type].value)[0] ??
      rich
        .filter((n) => n.units >= capOf(s, n) * 0.9)
        .sort((a, b) => TYPES[b.type].value - TYPES[a.type].value)[0];
    if (cand && doUpgrade(s, cand)) return true;
  }

  // (c) Attack the most rewarding reachable target: send half now, keep the route.
  let best: { src: SimNode; path: number[] } | null = null,
    bs = -Infinity;
  const sources = mine
    .filter((n) => n.units >= 8)
    .sort((a, b) => b.units - a.units)
    .slice(0, 4);
  for (const src of sources) {
    // The draw sends `sendFrac` at once; afterwards the route streams ROUTE_SHARE of the production.
    // Count the burst plus roughly four seconds of stream for the feasibility check.
    const u = UNITS[TYPES[src.type].unit],
      avail = sendAmount(s, src, o.sendFrac) + rateOf(s, src) * ROUTE_SHARE * 4,
      availPow = avail * u.str;
    if (sendAmount(s, src, o.sendFrac) < 1) continue;
    for (const [tid, path] of frontier(s, src, F)) {
      const t = node(s, tid),
        hops = path.length,
        def = defOf(s, t);
      const grow = t.owner > 0 ? (rateOf(s, t) * hops * 1.6) / u.speed : 0;
      const defenders =
        (t.units + grow) * def +
        incoming(s, tid, (g) => g.owner === t.owner) -
        incoming(s, tid, (g) => g.owner === F);
      if (availPow <= defenders * 1.15 + 1) continue;
      const hostileTower = t.type === 'waechter' && t.owner > 0 ? 8 : 0;
      const alreadyRouted = src.routes.some((r) => r[r.length - 1] === tid) ? 4 : 0;
      const score =
        TYPES[t.type].value +
        t.level * 6 +
        (isEnemy(t) ? 10 : 0) +
        (t.owner === 0 ? 5 : 0) -
        defenders * 0.7 -
        hops * 7 -
        hostileTower -
        alreadyRouted +
        rng.next() * 6;
      if (score > bs) {
        bs = score;
        best = { src, path };
      }
    }
  }
  if (best) {
    draw(s, best.src, best.path, o.sendFrac);
    return true;
  }

  // (d) Otherwise build a supply line from a full rear node to the weakest frontline node.
  const rich = mine
    .filter((n) => n.units >= capOf(s, n) * 0.6 && n.routes.length < MAX_ROUTES)
    .sort((a, b) => b.units - a.units)[0];
  if (!rich) return false;
  const front = mine
    .filter((n) => n !== rich && hasForeignNeighbour(s, n))
    .sort((a, b) => a.units - b.units)[0];
  if (!front) return false;
  const p = bfsPath(s.adj, rich.id, front.id, (id) => node(s, id).owner === F);
  if (p && p.length > 1) {
    draw(s, rich, p.slice(1), o.sendFrac);
    return true;
  }
  return false;
}

/** Creates a bot with its own timer. */
export function createPlayerBot(opts: PlayerBotOptions = {}): PlayerBot {
  const interval = opts.interval ?? DEFAULTS.interval;
  let timer = interval;
  return {
    update(state, dt) {
      if (state.over) return;
      timer -= dt;
      if (timer > 0) return;
      timer = interval;
      playerBotAct(state, opts);
    },
    reset() {
      timer = interval;
    },
  };
}

const timers = new WeakMap<GameState, number>();

/** Convenience: like `createPlayerBot(opts).update(state, dt)`, with the timer stored per state. */
export function playerBotStep(state: GameState, dt: number, opts: PlayerBotOptions = {}): void {
  const interval = opts.interval ?? DEFAULTS.interval;
  const t = (timers.get(state) ?? interval) - dt;
  if (t > 0) {
    timers.set(state, t);
    return;
  }
  timers.set(state, interval);
  playerBotAct(state, opts);
}
