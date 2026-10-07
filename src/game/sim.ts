import {
  GROW_CAP,
  GROWTH,
  LEVEL_UP,
  LINES_PER_LEVEL,
  NEUTRAL,
  PLAYER,
  SEND_INTERVAL,
  TOWER_R,
  TROOP_SPEED,
  WALL_T,
  CANNON_RANGE,
  CANNON_RELOAD,
  KINDS,
  MAGE_DAMAGE,
  MAGE_RANGE,
  MAGE_RELOAD,
  CANNON_RANGE_MIN,
  LINE_RATE,
  MAX_BURST,
  LINE_COST_BASE,
  LINE_COST_PER,
  ROCKET_FLIGHT,
  ROCKET_SPLASH,
  ROCKETS_PER_STRIKE,
  WORLD_H,
  WORLD_W,
} from './config';
import { pointSegDist, segIntersect, segSegDist } from './geom';
import type { GameState, LevelDef, Line, Rocket, Tower, Troop, Wall } from './state';

/* ------------------------------------------------------------------ derived values */

/** Tower level 1–3 from its troop count (Tower War: towers grow and shrink with their troops). */
export function levelOf(t: Tower): 1 | 2 | 3 {
  return t.troops >= LEVEL_UP[1] ? 3 : t.troops >= LEVEL_UP[0] ? 2 : 1;
}
export function radiusOf(t: Tower): number {
  return TOWER_R * (1 + (levelOf(t) - 1) * 0.12);
}
export function lineLimit(t: Tower): number {
  if (t.kind === 'cannon') return 0; // cannon towers only defend
  return (LINES_PER_LEVEL[levelOf(t) - 1] ?? 1) + (KINDS[t.kind].lines ?? 0);
}
/** Most troops a tower can hold (MAX). Player towers can hold more with the "Große Türme" skill. */
export function capOf(s: GameState, t: Tower): number {
  return GROW_CAP + (t.owner === PLAYER ? (s.def.player?.cap ?? 0) : 0);
}
export function isMax(s: GameState, t: Tower): boolean {
  return t.troops >= capOf(s, t);
}
/** Troops per second a tower produces (no lines) or sends down each line. */
export function rateOf(s: GameState, t: Tower): number {
  const bonus =
    t.owner >= 2 ? (s.def.enemyGrowth ?? 1) : t.owner === PLAYER ? (s.def.player?.growth ?? 1) : 1;
  return (GROWTH[levelOf(t) - 1] ?? 1) * KINDS[t.kind].growth * bonus;
}
/** Cannon range grows with the troops in the cannon tower. */
export function cannonRange(t: Tower): number {
  return CANNON_RANGE_MIN + (CANNON_RANGE - CANNON_RANGE_MIN) * Math.min(1, t.troops / GROW_CAP);
}
export function linesFrom(s: GameState, id: number): Line[] {
  return s.lines.filter((l) => l.src === id);
}
export function tower(s: GameState, id: number): Tower {
  const t = s.towers[id];
  if (!t) throw new Error(`no tower ${id}`);
  return t;
}
/** Troops in towers plus troops on the way, per owner. */
export function strength(s: GameState): number[] {
  const out: number[] = [0, 0, 0, 0, 0];
  for (const t of s.towers) out[t.owner] = (out[t.owner] ?? 0) + Math.floor(t.troops);
  for (const u of s.troops) out[u.owner] = (out[u.owner] ?? 0) + 1;
  return out;
}

/* ------------------------------------------------------------------ setup */

export function createGame(def: LevelDef): GameState {
  const towers: Tower[] = def.towers.map((t, id) => ({
    id,
    x: t.x,
    y: t.y,
    owner: t.owner,
    troops: t.troops + (t.owner === PLAYER ? (def.player?.start ?? 0) : 0),
    acc: 0,
    kind: t.kind ?? 'tower',
    cool: t.kind === 'mage' ? MAGE_RELOAD : CANNON_RELOAD,
  }));
  const s: GameState = {
    def,
    towers,
    lines: [],
    troops: [],
    rockets: [],
    walls: def.walls.map((w) => ({ ...w, hp: w.hp ?? wallHp(def.n), max: w.hp ?? wallHp(def.n) })),
    reach: [],
    time: 0,
    nextId: 1,
    events: [],
    result: null,
  };
  s.reach = computeReach(s);
  return s;
}

/** Hit points of the walls in level n. */
export function wallHp(n: number): number {
  return 12 + Math.floor(n / 2);
}

/**
 * The first standing wall a line from tower a to tower b runs into, and the distance (from a's
 * centre) at which troops hit it; null if the way is free.
 */
export function wallOnLine(s: GameState, a: number, b: number): { wall: Wall; d: number } | null {
  const A = tower(s, a),
    B = tower(s, b);
  const D = Math.hypot(B.x - A.x, B.y - A.y) || 1;
  let best: { wall: Wall; d: number } | null = null;
  for (const w of s.walls) {
    if ((w.hp ?? 1) <= 0) continue;
    if (segSegDist(A.x, A.y, B.x, B.y, w.x1, w.y1, w.x2, w.y2) >= WALL_T / 2 + 6) continue;
    // where the line meets the wall (closest point along the line), minus half the wall thickness
    const u = segIntersect(w.x1, w.y1, w.x2, w.y2, A.x, A.y, B.x, B.y);
    let along: number;
    if (u !== null) along = u * D;
    else {
      // touches an end of the wall: use the closer wall end projected onto the line
      const proj = (x: number, y: number) => ((x - A.x) * (B.x - A.x) + (y - A.y) * (B.y - A.y)) / D;
      along = Math.min(proj(w.x1, w.y1), proj(w.x2, w.y2));
    }
    const d = Math.max(0, along - WALL_T * 0.8);
    if (!best || d < best.d) best = { wall: w, d };
  }
  return best;
}

/** Which tower pairs can be joined by a straight line (no third tower in between; walls can be broken). */
export function computeReach(s: Pick<GameState, 'towers' | 'walls'>): boolean[][] {
  const n = s.towers.length;
  const reach = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      const A = s.towers[a] as Tower,
        B = s.towers[b] as Tower;
      let ok = true;
      for (const C of s.towers) {
        if (C === A || C === B) continue;
        if (pointSegDist(C.x, C.y, A.x, A.y, B.x, B.y) < TOWER_R * 0.95) {
          ok = false;
          break;
        }
      }
      (reach[a] as boolean[])[b] = ok;
      (reach[b] as boolean[])[a] = ok;
    }
  return reach;
}

/* ------------------------------------------------------------------ actions */

export type LineResult = 'ok' | 'same' | 'blocked' | 'exists' | 'full' | 'poor' | 'not-owner';

/** Troops it costs to draw a line from tower a to tower b. */
export function lineCost(s: GameState, a: number, b: number): number {
  const A = tower(s, a),
    B = tower(s, b);
  return LINE_COST_BASE + Math.floor(Math.hypot(B.x - A.x, B.y - A.y) / LINE_COST_PER);
}

/** Why a line from a to b could not be drawn, or 'ok'. Does not change the state. */
export function checkLine(s: GameState, a: number, b: number, owner: number): LineResult {
  if (a === b) return 'same';
  const A = s.towers[a],
    B = s.towers[b];
  if (!A || !B || A.owner !== owner) return 'not-owner';
  if (!s.reach[a]?.[b]) return 'blocked';
  if (s.lines.some((l) => l.src === a && l.dst === b)) return 'exists';
  if (linesFrom(s, a).length >= lineLimit(A)) return 'full';
  if (A.troops < lineCost(s, a, b) + 1) return 'poor';
  return 'ok';
}

/**
 * Draws a line from tower a to tower b. A line of the same owner in the opposite direction is
 * reversed (Tower War: drawing back over your own line turns it around).
 */
export function addLine(s: GameState, a: number, b: number, owner: number): LineResult {
  const reverse = s.lines.find((l) => l.src === b && l.dst === a && l.owner === owner);
  // check the cost before touching a line that would be reversed
  if (reverse && s.towers[a] && s.towers[a].troops < lineCost(s, a, b) + 1) return 'poor';
  if (reverse) removeLine(s, reverse, 'retract');
  const r = checkLine(s, a, b, owner);
  if (r !== 'ok') return r;
  tower(s, a).troops -= lineCost(s, a, b);
  const line: Line = { id: s.nextId++, src: a, dst: b, owner, timer: SEND_INTERVAL * 0.4, age: 0 };
  s.lines.push(line);
  s.events.push({ type: 'line', line });
  return 'ok';
}

/** Removes a line without cutting it: troops already on the way keep walking. */
export function dropLine(s: GameState, line: Line): void {
  removeLine(s, line, 'capture');
}

function removeLine(s: GameState, line: Line, why: 'retract' | 'capture'): void {
  s.lines = s.lines.filter((l) => l !== line);
  for (const u of s.troops) if (u.line === line.id) u.line = null;
  if (why === 'retract') s.events.push({ type: 'retract', line });
}

/**
 * Cuts every line of `owner` crossed by the swipe segment (x1,y1)-(x2,y2). Troops between the source
 * and the cut walk back home, troops beyond it keep going. Returns the number of cut lines.
 */
export function cutLines(
  s: GameState,
  owner: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  let cut = 0;
  for (const line of [...s.lines]) {
    if (line.owner !== owner) continue;
    const A = tower(s, line.src),
      B = tower(s, line.dst);
    const u = segIntersect(x1, y1, x2, y2, A.x, A.y, B.x, B.y);
    if (u === null) continue;
    const D = Math.hypot(B.x - A.x, B.y - A.y);
    const cx = A.x + (B.x - A.x) * u,
      cy = A.y + (B.y - A.y) * u;
    s.lines = s.lines.filter((l) => l !== line);
    for (const t of s.troops) {
      if (t.line !== line.id) continue;
      t.line = null;
      if (t.d < u * D) {
        // turn around and walk home
        const p = troopPos(s, t);
        t.x0 = p.x;
        t.y0 = p.y;
        t.dst = A.id;
        t.d = 0;
        t.len = Math.max(1, Math.hypot(A.x - p.x, A.y - p.y) - radiusOf(A) * 0.5);
      }
    }
    s.events.push({ type: 'cut', line, x: cx, y: cy });
    cut++;
  }
  return cut;
}

/* ------------------------------------------------------------------ troops */

export function troopPos(s: GameState, t: Troop): { x: number; y: number } {
  const B = tower(s, t.dst);
  const full = Math.hypot(B.x - t.x0, B.y - t.y0) || 1;
  const k = Math.min(1, t.d / full);
  return { x: t.x0 + (B.x - t.x0) * k, y: t.y0 + (B.y - t.y0) * k };
}
function spawnTroop(s: GameState, line: Line, behind = 0): void {
  const A = tower(s, line.src),
    B = tower(s, line.dst);
  const D = Math.hypot(B.x - A.x, B.y - A.y);
  const start = radiusOf(A) * 0.5 - behind;
  s.troops.push({
    id: s.nextId++,
    owner: line.owner,
    x0: A.x,
    y0: A.y,
    dst: B.id,
    d: start,
    len: Math.max(start + 1, D - radiusOf(B) * 0.5),
    line: line.id,
    speed: (KINDS[A.kind].speed ?? 1) * (line.owner === PLAYER ? (s.def.player?.speed ?? 1) : 1),
  });
}

function arrive(s: GameState, t: Troop): void {
  const B = tower(s, t.dst);
  if (B.owner === t.owner) {
    B.troops = Math.min(capOf(s, B), B.troops + 1);
    return;
  }
  const atk = t.owner === PLAYER ? (s.def.player?.attack ?? 1) : 1;
  const def = B.owner === PLAYER ? (s.def.player?.defense ?? 1) : 1;
  B.troops -= KINDS[B.kind].damage * atk * def;
  s.events.push({ type: 'hit', tower: B, owner: t.owner });
  if (B.troops < 0) {
    const from = B.owner;
    B.owner = t.owner;
    B.troops = 1;
    B.acc = 0;
    for (const l of s.lines.filter((l) => l.src === B.id)) removeLine(s, l, 'capture');
    s.events.push({ type: 'capture', tower: B, from });
  }
}

/** Troops walking towards each other on opposite lines of different owners meet and fight 1:1. */
function clashes(s: GameState): void {
  const dead = new Set<number>();
  for (const l of s.lines) {
    const opp = s.lines.find((o) => o.src === l.dst && o.dst === l.src && o.owner !== l.owner);
    if (!opp || l.id > opp.id) continue;
    const A = tower(s, l.src),
      B = tower(s, l.dst);
    const D = Math.hypot(B.x - A.x, B.y - A.y);
    const mine = s.troops.filter((t) => t.line === l.id).sort((p, q) => q.d - p.d);
    const theirs = s.troops.filter((t) => t.line === opp.id).sort((p, q) => q.d - p.d);
    let i = 0,
      j = 0;
    while (i < mine.length && j < theirs.length) {
      const a = mine[i] as Troop,
        b = theirs[j] as Troop;
      if (a.d < D - b.d) break;
      dead.add(a.id);
      dead.add(b.id);
      const k = a.d / D;
      s.events.push({
        type: 'clash',
        x: A.x + (B.x - A.x) * k,
        y: A.y + (B.y - A.y) * k,
        a: a.owner,
        b: b.owner,
      });
      i++;
      j++;
    }
  }
  if (dead.size) s.troops = s.troops.filter((t) => !dead.has(t.id));
}

/** Cannon towers shoot the nearest foreign soldier in range (neutral cannons shoot everybody). */
function cannons(s: GameState, dt: number): void {
  for (const c of s.towers) {
    if (c.kind !== 'cannon') continue;
    c.cool -= dt;
    if (c.cool > 0) continue;
    let best: Troop | null = null,
      bestD = cannonRange(c);
    let bx = 0,
      by = 0;
    for (const u of s.troops) {
      if (u.owner === c.owner) continue;
      const p = troopPos(s, u);
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < bestD) {
        best = u;
        bestD = d;
        bx = p.x;
        by = p.y;
      }
    }
    if (!best) {
      c.cool = 0;
      continue;
    }
    c.cool = CANNON_RELOAD;
    const id = best.id;
    s.troops = s.troops.filter((u) => u.id !== id);
    s.events.push({ type: 'shot', tower: c, x: bx, y: by });
  }
}

/** Mage towers strike the strongest foreign (non-neutral) tower in range with lightning. */
function mages(s: GameState, dt: number): void {
  for (const m of s.towers) {
    if (m.kind !== 'mage' || m.owner === NEUTRAL) continue;
    m.cool -= dt;
    if (m.cool > 0) continue;
    let best: Tower | null = null;
    for (const t of s.towers) {
      if (t.owner === m.owner || t.owner === NEUTRAL || t.troops < 1) continue;
      if (Math.hypot(t.x - m.x, t.y - m.y) > MAGE_RANGE) continue;
      if (!best || t.troops > best.troops) best = t;
    }
    if (!best) {
      m.cool = 0.5;
      continue;
    }
    m.cool = MAGE_RELOAD;
    best.troops = Math.max(0, best.troops - MAGE_DAMAGE);
    s.events.push({ type: 'zap', tower: m, target: best });
  }
}

/**
 * Rocket swarm (player special attack, bought with coins): several rockets fly in from behind the
 * player's side and destroy troops in the target tower; with the splash skill nearby enemy towers
 * are hit too. Rockets never capture a tower (it stays at 0 at least).
 */
export function fireRockets(s: GameState, target: number, damage: number, splash: number): boolean {
  const T = s.towers[target];
  if (!T || T.owner === PLAYER || T.owner === NEUTRAL || s.result) return false;
  for (let i = 0; i < ROCKETS_PER_STRIKE; i++) {
    s.rockets.push({
      id: s.nextId++,
      target,
      t: -i * 0.09,
      damage: damage / ROCKETS_PER_STRIKE,
      splash,
      x0: WORLD_W * (0.2 + 0.15 * i),
      y0: WORLD_H + 120,
      bend: (i - 2) * 60,
    });
  }
  return true;
}

function rockets(s: GameState, dt: number): void {
  if (!s.rockets.length) return;
  const keep: Rocket[] = [];
  for (const r of s.rockets) {
    r.t += dt / ROCKET_FLIGHT;
    if (r.t < 1) {
      keep.push(r);
      continue;
    }
    const T = tower(s, r.target);
    T.troops = Math.max(0, T.troops - r.damage);
    s.events.push({ type: 'rocket', target: T, x: T.x, y: T.y });
    if (r.splash > 0)
      for (const o of s.towers)
        if (o !== T && o.owner === T.owner && Math.hypot(o.x - T.x, o.y - T.y) < ROCKET_SPLASH)
          o.troops = Math.max(0, o.troops - r.damage * r.splash);
  }
  s.rockets = keep;
}

/** Position of a rocket in flight (world units), for drawing. */
export function rocketPos(s: GameState, r: Rocket): { x: number; y: number; ang: number } {
  const T = tower(s, r.target);
  const t = Math.max(0, Math.min(1, r.t));
  const mx = (r.x0 + T.x) / 2 + r.bend,
    my = Math.min(r.y0, T.y) - 220;
  const u = 1 - t;
  const x = u * u * r.x0 + 2 * u * t * mx + t * t * T.x,
    y = u * u * r.y0 + 2 * u * t * my + t * t * T.y;
  const dx = 2 * u * (mx - r.x0) + 2 * t * (T.x - mx),
    dy = 2 * u * (my - r.y0) + 2 * t * (T.y - my);
  return { x, y, ang: Math.atan2(dy, dx) };
}

/* ------------------------------------------------------------------ step */

export function step(s: GameState, dt: number): void {
  if (s.result) return;
  s.time += dt;
  // production: only towers without lines grow (Tower War: a tower with lines keeps its number)
  const sending = new Set(s.lines.map((l) => l.src));
  for (const t of s.towers) {
    if (t.owner === NEUTRAL || sending.has(t.id)) continue;
    const cap = capOf(s, t);
    if (t.troops >= cap) {
      t.acc = 0;
      continue;
    }
    t.acc += rateOf(s, t) * dt;
    while (t.acc >= 1 && t.troops < cap) {
      t.troops++;
      t.acc--;
    }
  }
  // a tower that shrank below its level loses its newest lines
  for (const t of s.towers) {
    const own = linesFrom(s, t.id);
    for (let k = own.length - 1; k >= lineLimit(t); k--) removeLine(s, own[k] as Line, 'retract');
  }
  // sending: every line sends at the tower's rate without emptying it; MAX towers send bursts
  for (const l of s.lines) {
    l.age += dt;
    const A = tower(s, l.src);
    l.timer -= dt;
    while (l.timer <= 0) {
      spawnTroop(s, l);
      const send = A.owner === PLAYER ? (s.def.player?.send ?? 1) : 1;
      const burst = isMax(s, A) ? MAX_BURST : 1;
      l.timer += 1 / Math.max(0.2, rateOf(s, A) * LINE_RATE * send * burst);
    }
  }
  // walking; troops on a line stop at a standing wall and knock it down
  const arrived: Troop[] = [];
  const blocked = new Map<number, { wall: Wall; d: number } | null>();
  for (const l of s.lines) blocked.set(l.id, wallOnLine(s, l.src, l.dst));
  const smashed = new Set<number>();
  for (const t of s.troops) {
    t.d += TROOP_SPEED * t.speed * dt;
    const wb = t.line !== null ? blocked.get(t.line) : null;
    if (wb && (wb.wall.hp ?? 0) > 0 && t.d >= wb.d) {
      smashed.add(t.id);
      wb.wall.hp = (wb.wall.hp ?? 1) - 1;
      const p = troopPos(s, t);
      s.events.push({ type: 'wallhit', x: p.x, y: p.y });
      if (wb.wall.hp <= 0) s.events.push({ type: 'wallbreak', wall: wb.wall });
      continue;
    }
    if (t.d >= t.len) arrived.push(t);
  }
  if (smashed.size) s.troops = s.troops.filter((t) => !smashed.has(t.id));
  if (s.walls.some((w) => (w.hp ?? 1) <= 0)) s.walls = s.walls.filter((w) => (w.hp ?? 1) > 0);
  if (arrived.length) {
    const gone = new Set(arrived.map((t) => t.id));
    s.troops = s.troops.filter((t) => !gone.has(t.id));
    for (const t of arrived) arrive(s, t);
  }
  clashes(s);
  cannons(s, dt);
  mages(s, dt);
  rockets(s, dt);
  // end of game
  const alive = (o: number) => s.towers.some((t) => t.owner === o) || s.troops.some((t) => t.owner === o);
  if (!alive(PLAYER)) {
    s.result = 'lose';
    s.events.push({ type: 'end', result: 'lose' });
  } else if (![2, 3, 4].some(alive)) {
    s.result = 'win';
    s.events.push({ type: 'end', result: 'win' });
  }
}

export function drainEvents(s: GameState): GameState['events'] {
  const e = s.events;
  s.events = [];
  return e;
}
