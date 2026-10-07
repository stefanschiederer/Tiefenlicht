import { KINDS, NEUTRAL, PLAYER, TOWER_R, WALL_T, WORLD_H, WORLD_W, type TowerKind } from './config';

const SPECIAL: TowerKind[] = ['barracks', 'fortress', 'cannon', 'stable', 'castle', 'mage'];
import { pointSegDist, rng, segSegDist } from './geom';
import { computeReach } from './sim';
import CALIBRATION from './calibration.json';
import type { Block, LevelDef, Tower, Wall } from './state';

type TowerDef = LevelDef['towers'][number];

const t = (x: number, y: number, owner: number, troops: number, kind: TowerKind = 'tower'): TowerDef => ({
  x,
  y,
  owner,
  troops,
  kind,
});

/** Hand-made opening levels (tutorial pacing), then generated ones. */
const HAND: Record<number, Omit<LevelDef, 'n'>> = {
  1: {
    towers: [t(360, 1060, PLAYER, 10), t(200, 720, NEUTRAL, 3), t(520, 720, NEUTRAL, 5), t(360, 330, 2, 6)],
    walls: [],
    aiInterval: 3.5,
    aiDelay: 12,
    enemyGrowth: 0.7,
  },
  2: {
    towers: [
      t(360, 1080, PLAYER, 12),
      t(150, 820, NEUTRAL, 6),
      t(570, 820, NEUTRAL, 6),
      t(360, 640, NEUTRAL, 12),
      t(150, 460, NEUTRAL, 6),
      t(570, 460, NEUTRAL, 6),
      t(360, 200, 2, 12),
    ],
    walls: [],
    aiInterval: 3.2,
    aiDelay: 8,
    enemyGrowth: 0.7,
  },
  3: {
    towers: [
      t(200, 1080, PLAYER, 14),
      t(520, 1080, NEUTRAL, 8),
      t(120, 760, NEUTRAL, 10),
      t(360, 640, NEUTRAL, 20),
      t(600, 520, NEUTRAL, 10),
      t(200, 200, NEUTRAL, 8),
      t(520, 200, 2, 14),
    ],
    walls: [],
    aiInterval: 3,
    aiDelay: 7,
    enemyGrowth: 0.72,
  },
};

export function levelDef(n: number): LevelDef {
  const hand = HAND[n];
  if (hand)
    return {
      n,
      ...hand,
      towers: hand.towers.map((x) => ({ ...x })),
      walls: hand.walls.map((w) => ({ ...w })),
    };
  return generate(n);
}

/**
 * Generated level: point-symmetric layout (player at the bottom, enemy mirrored at the top), neutral
 * towers in between, walls from level 6. More towers, stronger neutrals and a faster enemy with n.
 */
export function generate(n: number): LevelDef {
  // CALIBRATION holds, per level, the first layout a simple bot can beat (scripts/calibrate.ts)
  const first = (CALIBRATION as Record<string, number>)[String(n)] ?? 0;
  for (let attempt = first; attempt < first + 200; attempt++) {
    const def = generateAttempt(n, attempt);
    if (def) return def;
  }
  // fallback: the hand-made level 3 layout
  return { ...(HAND[3] as Omit<LevelDef, 'n'>), n };
}

/** One candidate layout for level n (deterministic per attempt); null if it is not playable. */
export function generateAttempt(n: number, attempt: number): LevelDef | null {
  {
    const rand = rng(n * 9973 + attempt * 131 + 7);
    const ri = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
    const boss = n % 10 === 0;
    // more enemies later on: two from level 12 (every third level), three from level 30 (every fourth)
    const enemies = n >= 30 && n % 4 === 1 ? 3 : n >= 12 && (n % 3 === 0 || n % 10 === 5) ? 2 : 1;
    const two = enemies >= 2;
    const pairs = Math.min(2 + Math.floor(n / 12), 3);
    const towers: TowerDef[] = [];
    const start = 10 + Math.min(14, Math.floor(n / 3)) + (boss && n < 40 ? 3 : 0);
    const px = ri(150, 570);
    // the player starts a little stronger (less so in late levels)
    towers.push(t(px, ri(1040, 1120), PLAYER, start + Math.max(2, 6 - Math.floor(n / 10))));
    if (enemies === 3) {
      towers.push(t(ri(80, 170), ri(200, 300), 2, start));
      towers.push(t(ri(550, 640), ri(200, 300), 3, start));
      towers.push(t(ri(300, 420), ri(110, 170), 4, start));
    } else if (two) {
      towers.push(t(ri(90, 200), ri(160, 260), 2, start));
      towers.push(t(ri(520, 630), ri(160, 260), 3, start));
    } else
      towers.push(
        // boss levels: the enemy holds a castle
        t(
          WORLD_W - px,
          WORLD_H - (towers[0] as TowerDef).y,
          2,
          start + (boss && n >= 80 ? 4 : 0),
          boss && n >= 16 && n < 80 ? 'castle' : 'tower',
        ),
      );
    // extra enemy tower on later levels
    const minD = TOWER_R * 4.4;
    const free = (x: number, y: number) => towers.every((o) => Math.hypot(o.x - x, o.y - y) >= minD);
    if (!two && !boss && n >= 20 && rand() < 0.35) {
      const x = ri(120, 600),
        y = ri(260, 380);
      if (!free(x, y) || !free(WORLD_W - x, WORLD_H - y)) return null;
      towers.push(t(x, y, 2, 6 + Math.floor(n / 4)));
      // the mirrored spot is the player's: both sides start with two towers
      towers.push(t(WORLD_W - x, WORLD_H - y, PLAYER, 6 + Math.floor(n / 4)));
    }
    // special towers: the newest kind always shows up in the level that introduces it, then a mix
    const avail = SPECIAL.filter((k) => KINDS[k].from <= n);
    const fresh = SPECIAL.find((k) => KINDS[k].from === n);
    const specials: TowerKind[] = [];
    if (fresh) specials.push(fresh);
    const want = avail.length ? Math.min(1 + Math.floor(n / 10), 3) : 0;
    const offset = Math.floor(rand() * 3);
    for (let i = 0; specials.length < want && i < 6; i++) {
      const k = avail[(i + offset) % avail.length] as TowerKind;
      if (!specials.includes(k) || specials.length >= avail.length) specials.push(k);
    }
    let tries = 0;
    let placed = 0;
    while (placed < pairs && tries++ < 400) {
      const x = ri(80, 640),
        y = ri(690, 1000);
      const mx = WORLD_W - x,
        my = WORLD_H - y;
      if (!free(x, y) || !free(mx, my) || Math.hypot(mx - x, my - y) < minD) continue;
      const troops = ri(3, 8 + Math.min(22, n));
      const kind: TowerKind = specials[placed] ?? 'tower';
      const tr = kind === 'fortress' ? Math.ceil(troops * 0.6) : troops;
      towers.push(t(x, y, NEUTRAL, tr, kind), t(mx, my, NEUTRAL, tr, kind));
      placed++;
    }
    // central tower sometimes
    if (rand() < 0.35 && free(WORLD_W / 2, WORLD_H / 2))
      towers.push(t(WORLD_W / 2, WORLD_H / 2, NEUTRAL, ri(10, 20 + Math.min(20, n))));
    if (placed < 2) return null;
    // walls stand in front of a tower (Tower War): a guard wall across the way from the player's side,
    // mirrored in front of the matching tower on the other side
    const walls: Wall[] = [];
    const wallPairs = n < 6 ? 0 : Math.min(1 + Math.floor((n - 6) / 15), 2);
    const guarded = towers
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => o.owner === NEUTRAL && o.y < WORLD_H / 2 && o.y > 220)
      .sort(() => rand() - 0.5);
    for (const { o } of guarded) {
      if (walls.length >= wallPairs * 2) break;
      const px0 = (towers[0] as TowerDef).x,
        py0 = (towers[0] as TowerDef).y;
      // direction from the guarded tower towards the player's start
      let dx = px0 - o.x,
        dy = py0 - o.y;
      const dl = Math.hypot(dx, dy) || 1;
      dx /= dl;
      dy /= dl;
      const dist = TOWER_R + 52,
        half = ri(62, 82);
      const cx = o.x + dx * dist,
        cy = o.y + dy * dist;
      const w: Wall = { x1: cx - dy * half, y1: cy + dx * half, x2: cx + dy * half, y2: cy - dx * half };
      const m: Wall = { x1: WORLD_W - w.x1, y1: WORLD_H - w.y1, x2: WORLD_W - w.x2, y2: WORLD_H - w.y2 };
      const clear = (v: Wall) =>
        [v.x1, v.x2].every((x) => x > 30 && x < WORLD_W - 30) &&
        towers.every((q) => pointSegDist(q.x, q.y, v.x1, v.y1, v.x2, v.y2) > TOWER_R + WALL_T);
      const apart = (v: Wall) =>
        walls.every((q) => segSegDist(v.x1, v.y1, v.x2, v.y2, q.x1, q.y1, q.x2, q.y2) > WALL_T * 3);
      if (!clear(w) || !clear(m) || !apart(w) || !apart(m)) continue;
      walls.push(w, m);
    }
    // 1–2 impassable obstacles between the two halves (from level 5)
    const blocks: Block[] = [];
    const blockCount = n < 5 ? 0 : n < 15 ? 1 : rand() < 0.5 ? 1 : 2;
    const kinds: Block['kind'][] = ['rocks', 'pond', 'grove'];
    for (let bt = 0; blocks.length < blockCount && bt < 300; bt++) {
      const r = ri(62, 84);
      // one in the middle band, a second one mirrored-free on either side
      const x = blocks.length === 0 ? ri(170, 550) : ri(90, 630),
        y = blocks.length === 0 ? ri(440, 840) : ri(380, 900);
      const okTowers = towers.every((q) => Math.hypot(q.x - x, q.y - y) > r + TOWER_R + 30);
      const okWalls = walls.every((q) => pointSegDist(x, y, q.x1, q.y1, q.x2, q.y2) > r + WALL_T + 20);
      const okBlocks = blocks.every((q) => Math.hypot(q.x - x, q.y - y) > q.r + r + 60);
      if (okTowers && okWalls && okBlocks)
        blocks.push({ x, y, r, kind: kinds[Math.floor(rand() * kinds.length)] as Block['kind'] });
    }
    // every level from 5 on has at least one obstacle; otherwise try another layout
    if (blockCount > 0 && blocks.length === 0) return null;
    const def: LevelDef = {
      n,
      towers,
      walls,
      blocks,
      // difficulty rises steadily up to level 80; boss levels (every tenth) are a notch harder
      aiInterval: Math.max(1.4, 3.2 - n * 0.025) * (boss && n < 40 ? 0.85 : 1),
      aiDelay: Math.max(2, 7 - n * 0.12) * (boss ? 0.6 : 1),
      enemyGrowth: Math.min(1, 0.7 + n * 0.004) + (boss && n < 40 ? 0.04 : 0),
    };
    return isPlayable(def) ? def : null;
  }
}

/** Every tower is reachable from the player's start over drawable lines. */
export function isPlayable(def: LevelDef): boolean {
  const towers: Tower[] = def.towers.map((x, id) => ({ id, ...x, acc: 0, kind: x.kind ?? 'tower', cool: 0 }));
  const reach = computeReach({ towers, blocks: def.blocks ?? [] });
  const seen = new Set<number>([0]);
  const queue = [0];
  while (queue.length) {
    const a = queue.shift() as number;
    reach[a]?.forEach((ok, b) => {
      if (ok && !seen.has(b)) {
        seen.add(b);
        queue.push(b);
      }
    });
  }
  return seen.size === towers.length;
}
