import {
  GROW_CAP,
  GROWTH,
  LEVEL_UP,
  LINES_PER_LEVEL,
  MAX_TROOPS,
  NEUTRAL,
  PLAYER,
  SEND_INTERVAL,
  TOWER_R,
  TROOP_SPEED,
  WALL_T,
  CANNON_RANGE,
  CANNON_RELOAD,
  KINDS,
} from './config';
import { pointSegDist, segIntersect, segSegDist } from './geom';
import type { GameState, LevelDef, Line, Tower, Troop } from './state';

/* ------------------------------------------------------------------ derived values */

/** Tower level 1–3 from its troop count (Tower War: towers grow and shrink with their troops). */
export function levelOf(t: Tower): 1 | 2 | 3 {
  return t.troops >= LEVEL_UP[1] ? 3 : t.troops >= LEVEL_UP[0] ? 2 : 1;
}
export function radiusOf(t: Tower): number {
  return TOWER_R * (1 + (levelOf(t) - 1) * 0.12);
}
export function lineLimit(t: Tower): number {
  return LINES_PER_LEVEL[levelOf(t) - 1] ?? 1;
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
    troops: t.troops,
    acc: 0,
    kind: t.kind ?? 'tower',
    cool: CANNON_RELOAD,
  }));
  const s: GameState = {
    def,
    towers,
    lines: [],
    troops: [],
    walls: def.walls.map((w) => ({ ...w })),
    reach: [],
    time: 0,
    nextId: 1,
    events: [],
    result: null,
  };
  s.reach = computeReach(s);
  return s;
}

/** Which tower pairs can be joined by a straight line (no wall, no third tower in between). */
export function computeReach(s: Pick<GameState, 'towers' | 'walls'>): boolean[][] {
  const n = s.towers.length;
  const reach = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      const A = s.towers[a] as Tower,
        B = s.towers[b] as Tower;
      let ok = true;
      for (const w of s.walls)
        if (segSegDist(A.x, A.y, B.x, B.y, w.x1, w.y1, w.x2, w.y2) < WALL_T / 2 + 6) {
          ok = false;
          break;
        }
      if (ok)
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

export type LineResult = 'ok' | 'same' | 'blocked' | 'exists' | 'full' | 'not-owner';

/** Why a line from a to b could not be drawn, or 'ok'. Does not change the state. */
export function checkLine(s: GameState, a: number, b: number, owner: number): LineResult {
  if (a === b) return 'same';
  const A = s.towers[a],
    B = s.towers[b];
  if (!A || !B || A.owner !== owner) return 'not-owner';
  if (!s.reach[a]?.[b]) return 'blocked';
  if (s.lines.some((l) => l.src === a && l.dst === b)) return 'exists';
  if (linesFrom(s, a).length >= lineLimit(A)) return 'full';
  return 'ok';
}

/**
 * Draws a line from tower a to tower b. A line of the same owner in the opposite direction is
 * reversed (Tower War: drawing back over your own line turns it around).
 */
export function addLine(s: GameState, a: number, b: number, owner: number): LineResult {
  const reverse = s.lines.find((l) => l.src === b && l.dst === a && l.owner === owner);
  if (reverse) removeLine(s, reverse, 'retract');
  const r = checkLine(s, a, b, owner);
  if (r !== 'ok') return r;
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
function spawnTroop(s: GameState, line: Line): void {
  const A = tower(s, line.src),
    B = tower(s, line.dst);
  const D = Math.hypot(B.x - A.x, B.y - A.y);
  const start = radiusOf(A) * 0.5;
  s.troops.push({
    id: s.nextId++,
    owner: line.owner,
    x0: A.x,
    y0: A.y,
    dst: B.id,
    d: start,
    len: Math.max(start + 1, D - radiusOf(B) * 0.5),
    line: line.id,
  });
}

function arrive(s: GameState, t: Troop): void {
  const B = tower(s, t.dst);
  if (B.owner === t.owner) {
    B.troops = Math.min(MAX_TROOPS, B.troops + 1);
    return;
  }
  B.troops -= KINDS[B.kind].damage;
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
      bestD = CANNON_RANGE;
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

/* ------------------------------------------------------------------ step */

export function step(s: GameState, dt: number): void {
  if (s.result) return;
  s.time += dt;
  // production
  for (const t of s.towers) {
    if (t.owner === NEUTRAL) continue;
    if (t.troops >= GROW_CAP) {
      t.acc = 0;
      continue;
    }
    t.acc += (GROWTH[levelOf(t) - 1] ?? 1) * KINDS[t.kind].growth * dt;
    while (t.acc >= 1 && t.troops < GROW_CAP) {
      t.troops++;
      t.acc--;
    }
  }
  // a tower that shrank below its level loses its newest lines
  for (const t of s.towers) {
    const own = linesFrom(s, t.id);
    for (let k = own.length - 1; k >= lineLimit(t); k--) removeLine(s, own[k] as Line, 'retract');
  }
  // sending
  for (const l of s.lines) {
    l.age += dt;
    const A = tower(s, l.src);
    l.timer -= dt;
    while (l.timer <= 0) {
      if (A.troops < 1) {
        l.timer = 0;
        break;
      }
      A.troops -= 1;
      spawnTroop(s, l);
      l.timer += SEND_INTERVAL;
    }
  }
  // walking
  const arrived: Troop[] = [];
  for (const t of s.troops) {
    t.d += TROOP_SPEED * dt;
    if (t.d >= t.len) arrived.push(t);
  }
  if (arrived.length) {
    const gone = new Set(arrived.map((t) => t.id));
    s.troops = s.troops.filter((t) => !gone.has(t.id));
    for (const t of arrived) arrive(s, t);
  }
  clashes(s);
  cannons(s, dt);
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
