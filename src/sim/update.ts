import {
  DIFF,
  FLOW_INTERVAL,
  FLOW_INTERVAL_FAST,
  PLAYER,
  ROUTE_BATCH,
  ROUTE_SHARE,
  ROUTE_SHARE_FAST,
  SIM_SCALE,
  SURRENDER_NODES,
  SURRENDER_SECONDS,
  SURRENDER_SHARE,
} from '@/data';
import { aiAct } from '@/ai/bot';
import { gainEnergy, launch } from './actions';
import type { GameState, Group, SimNode } from './state';
import { capOf, defOf, nodeDist, power, rangeOf, rateOf, speedFrom, stat, strOf } from './stats';

function arrive(s: GameState, g: Group): void {
  const h = s.nodes[g.to] as SimNode;
  if (h.owner === g.owner) {
    if (g.path.length) {
      g.from = g.to;
      g.to = g.path.shift() as number;
      g.t = 0;
      g.speed = speedFrom(s, h, g.owner, g.unit);
    } else {
      h.units += g.n;
      g.n = 0;
    }
    return;
  }
  const pw = power(s, g),
    def = defOf(s, h),
    effDef = h.units * def;
  if (pw > effDef) {
    const remaining = (pw - effDef) / strOf(s, g);
    gainEnergy(s, h.units + (g.n - remaining));
    const prev = h.owner;
    h.owner = g.owner;
    h.units = remaining;
    h.routes = [];
    h.flowAcc = 0;
    h.reserve = 0;
    h.frozen = 0;
    h.shield = 0;
    if (g.owner === PLAYER && !s.demo) s.stats.captured++;
    s.events.push({ type: 'capture', node: h.id, by: g.owner, prev, x: h.x, y: h.y });
  } else {
    const killed = pw / def;
    h.units -= killed;
    gainEnergy(s, killed + g.n);
    s.events.push({ type: 'clash', x: g.x, y: g.y, a: g.owner, b: h.owner, k: g.n });
  }
  g.n = 0;
}

/** Advances the simulation by dt seconds. Deterministic for a given state. */
export function step(s: GameState, dt: number): void {
  if (s.over) return;
  s.time += dt;
  const flowInterval = s.perks.flow ? FLOW_INTERVAL_FAST : FLOW_INTERVAL;
  const routeShare = s.perks.flow ? ROUTE_SHARE_FAST : ROUTE_SHARE;
  for (const n of s.nodes) {
    n.frozen = Math.max(0, n.frozen - dt);
    n.shield = Math.max(0, n.shield - dt);
    if (n.owner === 0) continue;
    const cap = capOf(s, n),
      r = rateOf(s, n);
    if (r > 0 && n.units < cap) n.units = Math.min(cap, n.units + r * dt);
    // Routes forward a share of production as a slow stream in packets of ROUTE_BATCH units; a full node
    // forwards everything it makes. Nothing below the reserve ever leaves through a route.
    if (n.routes.length) {
      n.flowAcc += r * (n.units >= cap - 0.5 ? 1 : routeShare) * dt;
      n.flowT -= dt;
      if (n.flowT <= 0) {
        n.flowT = flowInterval;
        const avail = Math.min(Math.floor(n.flowAcc), Math.floor(n.units - n.reserve * cap)),
          k = n.routes.length;
        if (avail >= ROUTE_BATCH) {
          n.flowAcc -= avail;
          if (avail < k) launch(s, n, n.routes[n.rr % k] as number[], avail);
          else {
            const each = Math.floor(avail / k);
            let extra = avail - each * k;
            for (let i = 0; i < k; i++)
              launch(s, n, n.routes[(n.rr + i) % k] as number[], each + (extra-- > 0 ? 1 : 0));
          }
          n.rr++;
        } else if (n.flowAcc > cap) n.flowAcc = cap;
      }
    } else n.flowAcc = 0;
  }
  for (const g of s.groups) {
    const a = s.nodes[g.from] as SimNode,
      b = s.nodes[g.to] as SimNode,
      d = Math.max(1, nodeDist(a, b));
    g.t = Math.min(1, g.t + (g.speed * dt) / d);
    g.x = a.x + (b.x - a.x) * g.t;
    g.y = a.y + (b.y - a.y) * g.t;
  }
  // Groups meeting head-on on the same edge fight.
  for (let i = 0; i < s.groups.length; i++) {
    for (let j = i + 1; j < s.groups.length; j++) {
      const a = s.groups[i] as Group,
        b = s.groups[j] as Group;
      if (a.owner === b.owner || a.n <= 0 || b.n <= 0 || !(a.from === b.to && a.to === b.from)) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) < 14 * SIM_SCALE) {
        const pa = power(s, a),
          pb = power(s, b);
        gainEnergy(s, Math.min(a.n, b.n) * 2 * 0.6);
        s.events.push({
          type: 'clash',
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
          a: a.owner,
          b: b.owner,
          k: Math.min(a.n, b.n),
        });
        if (pa > pb) {
          a.n = (pa - pb) / strOf(s, a);
          b.n = 0;
        } else if (pb > pa) {
          b.n = (pb - pa) / strOf(s, b);
          a.n = 0;
        } else a.n = b.n = 0;
      }
    }
  }
  // Towers
  for (const n of s.nodes) {
    if (n.type !== 'waechter' || n.frozen > 0) continue;
    n.zapAcc = Math.min(3, n.zapAcc + stat(n, 'zapRate') * dt);
    if (n.zapAcc < 1) continue;
    let best: Group | null = null,
      bd = rangeOf(s, n);
    for (const g of s.groups) {
      if (g.owner === n.owner || g.n <= 0) continue;
      const dd = Math.hypot(g.x - n.x, g.y - n.y);
      if (dd < bd) {
        bd = dd;
        best = g;
      }
    }
    if (!best) continue;
    const dmg = Math.min(power(s, best), Math.floor(n.zapAcc)),
      killed = dmg / strOf(s, best);
    best.n -= killed;
    n.zapAcc -= dmg;
    gainEnergy(s, killed);
    s.events.push({
      type: 'zap',
      node: n.id,
      x1: n.x,
      y1: n.y,
      x2: best.x,
      y2: best.y,
      target: best.owner,
      killed,
    });
  }
  for (const g of s.groups) if (g.n > 0.05 && g.t >= 1) arrive(s, g);
  s.groups = s.groups.filter((g) => g.n > 0.05);

  for (const f of Object.keys(s.aiTimers)) {
    const F = +f;
    if (!s.nodes.some((n) => n.owner === F)) continue;
    const t = (s.aiTimers[F] ?? 0) - dt;
    s.aiTimers[F] = t;
    if (t <= 0) {
      s.aiTimers[F] = s.def.ai * DIFF[s.difficulty].ai * (0.7 + s.rng.next() * 0.6);
      aiAct(s, F);
    }
  }

  if (s.demo) return;
  // Mop-up: a beaten AI gives up instead of forcing the player to hunt its last node.
  const playerNodes = s.nodes.filter((n) => n.owner === PLAYER).length;
  for (const f of Object.keys(s.aiTimers)) {
    const F = +f;
    const owned = s.nodes.filter((n) => n.owner === F).length;
    if (owned > 0 && owned <= SURRENDER_NODES && playerNodes >= s.nodes.length * SURRENDER_SHARE) {
      const t = (s.surrenderT[F] ?? 0) + dt;
      s.surrenderT[F] = t;
      if (t >= SURRENDER_SECONDS) {
        for (const n of s.nodes) if (n.owner === F) n.owner = 0;
        s.groups = s.groups.filter((g) => g.owner !== F);
        s.events.push({ type: 'surrender', faction: F });
      }
    } else s.surrenderT[F] = 0;
  }
  const pAlive = s.nodes.some((n) => n.owner === PLAYER) || s.groups.some((g) => g.owner === PLAYER);
  const eAlive = s.nodes.some((n) => n.owner > 1) || s.groups.some((g) => g.owner > 1);
  if (!eAlive) finish(s, true);
  else if (!pAlive) finish(s, false);
}

function finish(s: GameState, won: boolean): void {
  s.over = won ? 'won' : 'lost';
  s.events.push({ type: 'finished', won });
}

/** Number of factions (players or AIs) that still own a node. */
export function aliveFactions(s: GameState): Set<number> {
  return new Set(s.nodes.filter((n) => n.owner > 0).map((n) => n.owner));
}

/** Drains and returns queued events. */
export function drainEvents(s: GameState) {
  const ev = s.events;
  s.events = [];
  return ev;
}
