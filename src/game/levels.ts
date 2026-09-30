import { KINDS, NEUTRAL, PLAYER, TOWER_R, WALL_T, WORLD_H, WORLD_W, type TowerKind } from './config';

const SPECIAL: TowerKind[] = ['barracks', 'fortress', 'cannon'];
import { pointSegDist, rng } from './geom';
import { computeReach } from './sim';
import type { LevelDef, Tower, Wall } from './state';

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
    aiInterval: 3,
    aiDelay: 6,
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
    aiInterval: 2.6,
    aiDelay: 4,
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
  for (let attempt = 0; attempt < 200; attempt++) {
    const rand = rng(n * 9973 + attempt * 131 + 7);
    const ri = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
    const two = n >= 12 && n % 5 === 2; // occasionally a second enemy
    const pairs = Math.min(2 + Math.floor(n / 4), 6);
    const towers: TowerDef[] = [];
    const start = 10 + Math.min(10, Math.floor(n / 3));
    const px = ri(150, 570);
    towers.push(t(px, ri(1040, 1120), PLAYER, start));
    if (two) {
      towers.push(t(ri(90, 200), ri(160, 260), 2, start));
      towers.push(t(ri(520, 630), ri(160, 260), 3, start));
    } else towers.push(t(WORLD_W - px, WORLD_H - (towers[0] as TowerDef).y, 2, start));
    // extra enemy tower on later levels
    const minD = TOWER_R * 4.1;
    const free = (x: number, y: number) => towers.every((o) => Math.hypot(o.x - x, o.y - y) >= minD);
    if (!two && n >= 9 && rand() < 0.5) {
      const x = ri(120, 600),
        y = ri(260, 380);
      if (!free(x, y) || !free(WORLD_W - x, WORLD_H - y)) continue;
      towers.push(t(x, y, 2, 6 + Math.floor(n / 4)));
      towers.push(t(WORLD_W - x, WORLD_H - y, NEUTRAL, 6 + Math.floor(n / 4)));
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
    if (rand() < 0.5 && free(WORLD_W / 2, WORLD_H / 2))
      towers.push(t(WORLD_W / 2, WORLD_H / 2, NEUTRAL, ri(10, 20 + Math.min(20, n))));
    if (placed < 2) continue;
    // walls
    const walls: Wall[] = [];
    const wallCount = n < 6 ? 0 : Math.min(1 + Math.floor((n - 6) / 6), 3);
    let wt = 0;
    while (walls.length < wallCount * 2 && wt++ < 300) {
      const cx = ri(100, 620),
        cy = ri(420, 620);
      const len = ri(120, 240),
        ang = rand() * Math.PI;
      const w: Wall = {
        x1: cx - (Math.cos(ang) * len) / 2,
        y1: cy - (Math.sin(ang) * len) / 2,
        x2: cx + (Math.cos(ang) * len) / 2,
        y2: cy + (Math.sin(ang) * len) / 2,
      };
      const m: Wall = { x1: WORLD_W - w.x1, y1: WORLD_H - w.y1, x2: WORLD_W - w.x2, y2: WORLD_H - w.y2 };
      const clear = (v: Wall) =>
        [v.x1, v.x2].every((x) => x > 40 && x < WORLD_W - 40) &&
        towers.every((o) => pointSegDist(o.x, o.y, v.x1, v.y1, v.x2, v.y2) > TOWER_R + WALL_T + 26);
      if (!clear(w) || !clear(m)) continue;
      walls.push(w, m);
    }
    const def: LevelDef = {
      n,
      towers,
      walls,
      aiInterval: Math.max(0.9, 2.6 - n * 0.06),
      aiDelay: Math.max(1, 4 - n * 0.2),
    };
    if (isPlayable(def)) return def;
  }
  // fallback: the hand-made level 3 layout
  return { ...(HAND[3] as Omit<LevelDef, 'n'>), n };
}

/** Every tower is reachable from the player's start over drawable lines. */
export function isPlayable(def: LevelDef): boolean {
  const towers: Tower[] = def.towers.map((x, id) => ({ id, ...x, acc: 0, kind: x.kind ?? 'tower', cool: 0 }));
  const reach = computeReach({ towers, walls: def.walls });
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
