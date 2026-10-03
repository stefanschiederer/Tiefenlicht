import { TEAM_COLORS, TEAM_DARK, TEAM_LIGHT, type Theme, type TowerKind } from '@/game/config';

/* Procedural cartoon sprites in the Tower War look. All drawn on 2D canvases, no external assets. */

const OUT = '#1d2530';
const TAU = Math.PI * 2;

export interface Sprite {
  c: HTMLCanvasElement;
  /** Anchor (ground point) inside the canvas. */
  ax: number;
  ay: number;
  /** Radius of the tower body in sprite pixels (scale reference). */
  r: number;
  /** Height of the top of the art above the anchor. */
  top: number;
  /** Height of the cannon mount above the anchor (cannon towers). */
  gun?: number;
  /** Where a waving flag is planted (height above the anchor, x offset); none on cannons and mage towers. */
  peak?: number;
  peakX?: number;
}

function mk(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  return [c, g];
}

const towerCache = new Map<string, Sprite>();

/** Tower art for every kind, cached per owner, level and kind. */
export function towerSprite(owner: number, level: 1 | 2 | 3, kind: TowerKind = 'tower'): Sprite {
  const key = `${owner}:${level}:${kind}`;
  const hit = towerCache.get(key);
  if (hit) return hit;
  const sp =
    kind === 'barracks' || kind === 'stable'
      ? barracksSprite(owner, level, kind === 'stable')
      : kind === 'castle'
        ? roundTower(owner, level, { rMul: 1.05, hMul: 1.05, castle: true })
        : kind === 'mage'
          ? roundTower(owner, level, { rMul: 0.82, hMul: 1.3, mage: true })
          : kind === 'fortress'
            ? roundTower(owner, level, { rMul: 1.18, hMul: 0.7, fortress: true })
            : kind === 'cannon'
              ? roundTower(owner, level, { rMul: 0.95, hMul: 0.85, cannon: true })
              : roundTower(owner, level, {});
  towerCache.set(key, sp);
  return sp;
}

interface TowerOpts {
  rMul?: number;
  hMul?: number;
  fortress?: boolean;
  cannon?: boolean;
  castle?: boolean;
  mage?: boolean;
}

/** Small round corner turret with a battlement cap (castle). */
function turret(
  g: CanvasRenderingContext2D,
  x: number,
  base: number,
  r: number,
  h: number,
  col: string,
  dark: string,
  light: string,
): void {
  const ry = r * 0.42;
  const grd = g.createLinearGradient(x - r, 0, x + r, 0);
  grd.addColorStop(0, light);
  grd.addColorStop(0.4, col);
  grd.addColorStop(1, dark);
  g.fillStyle = grd;
  g.strokeStyle = OUT;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x - r, base);
  g.lineTo(x - r, base - h);
  g.ellipse(x, base - h, r, ry, 0, Math.PI, 0, true);
  g.lineTo(x + r, base);
  g.ellipse(x, base, r, ry, 0, 0, Math.PI);
  g.closePath();
  g.fill();
  g.stroke();
  // pointed roof
  g.fillStyle = dark;
  g.beginPath();
  g.moveTo(x - r - 4, base - h);
  g.lineTo(x, base - h - r * 1.5);
  g.lineTo(x + r + 4, base - h);
  g.ellipse(x, base - h, r + 4, ry + 2, 0, 0, Math.PI);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = light;
  g.beginPath();
  g.moveTo(x - r * 0.6, base - h - 2);
  g.lineTo(x - 2, base - h - r * 1.35);
  g.lineTo(x - r * 0.1, base - h);
  g.closePath();
  g.fill();
}

/** Round castle tower in the owner colour; taller with each level, flag on level 3. */
function roundTower(owner: number, level: 1 | 2 | 3, o: TowerOpts): Sprite {
  const col = TEAM_COLORS[owner] ?? TEAM_COLORS[0],
    dark = TEAM_DARK[owner] ?? TEAM_DARK[0],
    light = TEAM_LIGHT[owner] ?? TEAM_LIGHT[0];
  const r = ([46, 50, 54][level - 1] as number) * (o.rMul ?? 1);
  const hgt = ([40, 64, 88][level - 1] as number) * (o.hMul ?? 1);
  const ry = r * 0.42;
  const W = 200,
    H = 260,
    ax = 100,
    ay = 220;
  const [c, g] = mk(W, H);
  g.lineWidth = 4;
  g.strokeStyle = OUT;
  // ground shadow
  g.fillStyle = 'rgba(20,50,20,0.25)';
  g.beginPath();
  g.ellipse(ax + 6, ay + 4, r + 18, ry + 10, 0, 0, TAU);
  g.fill();
  // stone plinth
  const pr = r + 10,
    pry = pr * 0.42,
    ph = 12;
  g.fillStyle = '#9aa3ad';
  g.beginPath();
  g.ellipse(ax, ay, pr, pry, 0, 0, Math.PI);
  g.lineTo(ax - pr, ay - ph);
  g.ellipse(ax, ay - ph, pr, pry, 0, Math.PI, 0, true);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#c9cfd6';
  g.beginPath();
  g.ellipse(ax, ay - ph, pr, pry, 0, 0, TAU);
  g.fill();
  g.stroke();
  if (o.fortress) stoneRing(g, ax, ay - ph, r + 16, 26, 'back');
  if (o.castle) {
    // curtain wall between two corner turrets, behind the keep
    g.fillStyle = '#b7bfc8';
    g.strokeStyle = OUT;
    g.lineWidth = 4;
    g.beginPath();
    g.rect(ax - r - 30, ay - ph - hgt * 0.55 - 14, 2 * r + 60, hgt * 0.55);
    g.fill();
    g.stroke();
    for (let x = ax - r - 30; x < ax + r + 30; x += 18) {
      g.fillStyle = '#d5dae0';
      g.beginPath();
      g.rect(x + 2, ay - ph - hgt * 0.55 - 26, 12, 12);
      g.fill();
      g.stroke();
    }
    turret(g, ax - r - 26, ay - 10, 22, hgt * 0.9, col, dark, light);
    turret(g, ax + r + 26, ay - 10, 22, hgt * 0.9, col, dark, light);
  }
  // body cylinder
  const by = ay - ph + 2;
  const grd = g.createLinearGradient(ax - r, 0, ax + r, 0);
  grd.addColorStop(0, light);
  grd.addColorStop(0.35, col);
  grd.addColorStop(1, dark);
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(ax - r, by);
  g.lineTo(ax - r, by - hgt);
  g.ellipse(ax, by - hgt, r, ry, 0, Math.PI, 0, true);
  g.lineTo(ax + r, by);
  g.ellipse(ax, by, r, ry, 0, 0, Math.PI);
  g.closePath();
  g.fill();
  g.stroke();
  // brick rows
  g.save();
  g.beginPath();
  g.moveTo(ax - r, by);
  g.lineTo(ax - r, by - hgt);
  g.lineTo(ax + r, by - hgt);
  g.lineTo(ax + r, by);
  g.ellipse(ax, by, r, ry, 0, 0, Math.PI);
  g.clip();
  g.strokeStyle = 'rgba(0,0,0,0.16)';
  g.lineWidth = 2;
  for (let y = by - 14, row = 0; y > by - hgt + 4; y -= 14, row++) {
    g.beginPath();
    g.ellipse(ax, y, r, ry, 0, 0, Math.PI);
    g.stroke();
    for (let k = -3; k <= 3; k++) {
      const a = (k + (row % 2) * 0.5) * 0.42;
      const x = ax + Math.sin(a) * r;
      const yy = y + Math.cos(a) * ry;
      g.beginPath();
      g.moveTo(x, yy);
      g.lineTo(x, yy + 12);
      g.stroke();
    }
  }
  g.restore();
  // rim light on the sunny side and a soft dark core on the shadow side
  g.strokeStyle = 'rgba(255,255,255,0.45)';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(ax - r + 7, by - hgt + ry * 0.6);
  g.lineTo(ax - r + 7, by + ry * 0.5);
  g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.12)';
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(ax + r - 9, by - hgt + ry * 0.7);
  g.lineTo(ax + r - 9, by + ry * 0.5);
  g.stroke();
  g.strokeStyle = OUT;
  g.lineWidth = 4;
  // door
  g.fillStyle = '#3a2a22';
  const dw = 15;
  g.beginPath();
  g.moveTo(ax - dw, by + ry - 2);
  g.lineTo(ax - dw, by + ry - 22);
  g.arc(ax, by + ry - 22, dw, Math.PI, 0);
  g.lineTo(ax + dw, by + ry - 2);
  g.closePath();
  g.fill();
  g.stroke();
  // shield emblem on fortresses
  if (o.fortress) {
    const sy = by - hgt * 0.72;
    g.fillStyle = '#f2f4f7';
    g.beginPath();
    g.moveTo(ax - 14, sy);
    g.lineTo(ax + 14, sy);
    g.lineTo(ax + 14, sy + 14);
    g.quadraticCurveTo(ax + 12, sy + 26, ax, sy + 32);
    g.quadraticCurveTo(ax - 12, sy + 26, ax - 14, sy + 14);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = col;
    g.fillRect(ax - 3, sy + 4, 6, 22);
    g.fillRect(ax - 10, sy + 10, 20, 6);
  }
  // window on level 2+
  if (level >= 2 && !o.fortress) {
    g.fillStyle = '#26303b';
    const wy = by - hgt * 0.62;
    g.beginPath();
    g.roundRect(ax - 7, wy, 14, 20, [7, 7, 2, 2]);
    g.fill();
    g.stroke();
  }
  // top: battlement ring (a pointed roof with a crystal on mage towers)
  const ty = by - hgt;
  if (o.mage) {
    g.strokeStyle = OUT;
    g.lineWidth = 4;
    const rh = r * 2.1;
    g.fillStyle = dark;
    g.beginPath();
    g.moveTo(ax - r - 8, ty);
    g.quadraticCurveTo(ax - r * 0.3, ty - rh * 0.5, ax + 6, ty - rh);
    g.quadraticCurveTo(ax + r * 0.4, ty - rh * 0.45, ax + r + 8, ty);
    g.ellipse(ax, ty, r + 8, ry + 4, 0, 0, Math.PI);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(ax - r - 2, ty - 2);
    g.quadraticCurveTo(ax - r * 0.3, ty - rh * 0.5, ax + 6, ty - rh);
    g.quadraticCurveTo(ax - r * 0.1, ty - rh * 0.4, ax - 6, ty + 4);
    g.closePath();
    g.fill();
    // stars on the roof
    g.fillStyle = '#ffe066';
    for (const [sx, sy] of [
      [-12, -26],
      [8, -44],
      [14, -16],
    ] as const) {
      g.beginPath();
      g.arc(ax + sx, ty + sy, 3, 0, TAU);
      g.fill();
    }
    // crystal orb
    const oy = ty - rh - 10;
    const og = g.createRadialGradient(ax + 3, oy - 3, 1, ax + 6, oy, 12);
    og.addColorStop(0, '#ffffff');
    og.addColorStop(0.4, '#d2adff');
    og.addColorStop(1, '#7b3fe0');
    g.fillStyle = og;
    g.beginPath();
    g.arc(ax + 6, oy, 11, 0, TAU);
    g.fill();
    g.stroke();
    return { c, ax, ay, r: r / (o.rMul ?? 1), top: ay - oy + 14, gun: ay - oy };
  }
  const merlons = 10;
  const drawMerlon = (i: number) => {
    const a = (i / merlons) * TAU;
    const mx = ax + Math.cos(a) * r * 0.9,
      my = ty + Math.sin(a) * ry * 0.9;
    g.fillStyle = Math.cos(a) > 0.3 ? dark : col;
    g.beginPath();
    g.roundRect(mx - 8, my - 16, 16, 18, 3);
    g.fill();
    g.stroke();
  };
  for (let i = 0; i < merlons; i++) if (Math.sin((i / merlons) * TAU) < 0) drawMerlon(i);
  g.fillStyle = light;
  g.beginPath();
  g.ellipse(ax, ty, r, ry, 0, 0, TAU);
  g.fill();
  g.stroke();
  g.fillStyle = dark;
  g.beginPath();
  g.ellipse(ax, ty + 2, r * 0.66, ry * 0.62, 0, 0, TAU);
  g.fill();
  if (o.cannon) {
    // gun mount on the platform (the barrel is drawn live by the renderer)
    g.fillStyle = '#3b4350';
    g.beginPath();
    g.ellipse(ax, ty - 2, r * 0.42, ry * 0.5, 0, 0, TAU);
    g.fill();
    g.stroke();
  }
  // glossy highlight on the top rim
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(ax, ty, r - 5, ry - 3, 0, Math.PI * 1.05, Math.PI * 1.55);
  g.stroke();
  g.strokeStyle = OUT;
  g.lineWidth = 4;
  for (let i = 0; i < merlons; i++) if (Math.sin((i / merlons) * TAU) >= 0) drawMerlon(i);
  if (o.fortress) stoneRing(g, ax, ay - ph, r + 16, 26, 'front');
  return {
    c,
    ax,
    ay,
    r: r / (o.rMul ?? 1),
    top: ay - ty + ry + 16,
    gun: ay - ty + 4,
    ...(o.cannon ? {} : { peak: ay - ty, peakX: 0 }),
  };
}

/** Crenellated stone ring wall (fortress), drawn in two halves around the tower body. */
function stoneRing(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  h: number,
  half: 'back' | 'front',
): void {
  const ry = r * 0.42;
  const [a0, a1] = half === 'back' ? [Math.PI, TAU] : [0, Math.PI];
  g.strokeStyle = OUT;
  g.lineWidth = 4;
  // wall band
  g.fillStyle = half === 'back' ? '#8b949f' : '#aab2bc';
  g.beginPath();
  g.ellipse(cx, cy, r, ry, 0, a0, a1);
  g.ellipse(cx, cy - h, r, ry, 0, a1, a0, true);
  g.closePath();
  g.fill();
  g.stroke();
  // merlons on top
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const inHalf = half === 'back' ? Math.sin(a) < 0 : Math.sin(a) >= 0;
    if (!inHalf) continue;
    const mx = cx + Math.cos(a) * r,
      my = cy - h + Math.sin(a) * ry;
    g.fillStyle = '#c7cdd4';
    g.beginPath();
    g.roundRect(mx - 7, my - 12, 14, 14, 3);
    g.fill();
    g.stroke();
  }
  if (half === 'front') {
    // gate
    g.fillStyle = '#3a2a22';
    g.beginPath();
    g.moveTo(cx - 13, cy + ry - 1);
    g.lineTo(cx - 13, cy + ry - 16);
    g.arc(cx, cy + ry - 16, 13, Math.PI, 0);
    g.lineTo(cx + 13, cy + ry - 1);
    g.closePath();
    g.fill();
    g.stroke();
  }
}

/** Barracks: a square hall with a pitched roof in the owner colour; bigger with each level. */
function barracksSprite(owner: number, level: 1 | 2 | 3, stable = false): Sprite {
  const col = TEAM_COLORS[owner] ?? TEAM_COLORS[0],
    dark = TEAM_DARK[owner] ?? TEAM_DARK[0],
    light = TEAM_LIGHT[owner] ?? TEAM_LIGHT[0];
  const W = 200,
    H = 260,
    ax = 100,
    ay = 220;
  const [c, g] = mk(W, H);
  g.strokeStyle = OUT;
  g.lineWidth = 4;
  const w = [84, 92, 100][level - 1] as number,
    d = 30,
    h = [34, 46, 58][level - 1] as number,
    roof = [30, 36, 42][level - 1] as number;
  g.fillStyle = 'rgba(20,50,20,0.25)';
  g.beginPath();
  g.ellipse(ax + 8, ay + 2, w * 0.72, 22, 0, 0, TAU);
  g.fill();
  // coordinates: front face from (x0, y0) to (x1, y0-h); depth goes up-right by (d, -d*0.6)
  const x0 = ax - w / 2,
    x1 = ax + w / 2 - d * 0.5,
    y0 = ay + 4,
    dx = d,
    dy = -d * 0.6;
  const poly = (pts: [number, number][], fill: string) => {
    g.fillStyle = fill;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
    g.stroke();
  };
  // stone walls
  poly(
    [
      [x1, y0],
      [x1 + dx, y0 + dy],
      [x1 + dx, y0 + dy - h],
      [x1, y0 - h],
    ],
    stable ? '#9c6a3c' : '#9aa3ad',
  );
  poly(
    [
      [x0, y0],
      [x1, y0],
      [x1, y0 - h],
      [x0, y0 - h],
    ],
    stable ? '#c48f58' : '#d5dae0',
  );
  // brick hints
  g.strokeStyle = 'rgba(0,0,0,0.14)';
  g.lineWidth = 2;
  for (let y = y0 - 12; y > y0 - h + 4; y -= 12) {
    g.beginPath();
    g.moveTo(x0 + 3, y);
    g.lineTo(x1 - 3, y);
    g.stroke();
  }
  g.strokeStyle = OUT;
  g.lineWidth = 4;
  // roof: front gable triangle + slope
  const rx0 = x0 - 6,
    rx1 = x1 + 6,
    ry0 = y0 - h,
    mid = (rx0 + rx1) / 2;
  poly(
    [
      [mid, ry0 - roof],
      [rx1, ry0],
      [rx1 + dx, ry0 + dy],
      [mid + dx, ry0 - roof + dy],
    ],
    dark,
  );
  poly(
    [
      [rx0, ry0],
      [mid, ry0 - roof],
      [mid + dx, ry0 - roof + dy],
      [rx0 + dx, ry0 + dy],
    ],
    col,
  );
  poly(
    [
      [rx0, ry0],
      [rx1, ry0],
      [mid, ry0 - roof],
    ],
    light,
  );
  // door and windows
  g.fillStyle = '#3a2a22';
  g.beginPath();
  g.roundRect(ax - d * 0.25 - 12, y0 - 26, 24, 26, [10, 10, 0, 0]);
  g.fill();
  g.stroke();
  g.fillStyle = '#26303b';
  for (const wx of [x0 + 14, x1 - 26])
    if (h > 40) {
      g.beginPath();
      g.roundRect(wx, y0 - h + 10, 12, 14, 3);
      g.fill();
      g.stroke();
    }
  if (stable) {
    // horseshoe on the gable and a paddock fence in front
    g.strokeStyle = '#ffffff';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(mid, ry0 - roof * 0.32, 8, Math.PI * 0.1, Math.PI * 0.9, true);
    g.stroke();
    g.strokeStyle = OUT;
    g.lineWidth = 3;
    g.fillStyle = '#e5b77e';
    for (const fx of [x0 - 18, x0 - 2, x1 + dx + 4, x1 + dx + 20]) {
      g.beginPath();
      g.roundRect(fx - 3, y0 - 20, 6, 22, 2);
      g.fill();
      g.stroke();
    }
    for (const [fa, fb] of [
      [x0 - 22, x0 + 2],
      [x1 + dx, x1 + dx + 24],
    ] as const)
      for (const fy of [y0 - 15, y0 - 7]) {
        g.beginPath();
        g.roundRect(fa, fy - 2, fb - fa, 4, 2);
        g.fill();
        g.stroke();
      }
  } else {
    // crossed swords sign on the gable
    g.strokeStyle = '#ffffff';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(mid - 8, ry0 - 6);
    g.lineTo(mid + 8, ry0 - roof * 0.6);
    g.moveTo(mid + 8, ry0 - 6);
    g.lineTo(mid - 8, ry0 - roof * 0.6);
    g.stroke();
  }
  g.strokeStyle = OUT;
  g.lineWidth = 4;
  const top = ay - (ry0 - roof + dy) + 6;
  return { c, ax, ay, r: 50, top, gun: 0, peak: ay - (ry0 - roof + dy * 0.5), peakX: mid + dx * 0.5 - ax };
}

const troopCache = new Map<string, Sprite>();

/** Rider on a brown horse (side view, facing right). */
function riderSprite(owner: number, frame = 0): Sprite {
  const col = TEAM_COLORS[owner] ?? TEAM_COLORS[0],
    dark = TEAM_DARK[owner] ?? TEAM_DARK[0];
  const [c, g] = mk(64, 60);
  const ax = 32,
    ay = 54;
  g.strokeStyle = OUT;
  g.lineWidth = 3;
  g.fillStyle = 'rgba(20,50,20,0.25)';
  g.beginPath();
  g.ellipse(ax, ay, 22, 4, 0, 0, TAU);
  g.fill();
  // legs
  g.fillStyle = '#6b4226';
  for (const [i, lx] of [-16, -9, 8, 15].entries()) {
    const rot = (i % 2 === frame ? 0.35 : -0.35) * (i < 2 ? 1 : -1);
    g.save();
    g.translate(ax + lx, ay - 16);
    g.rotate(rot);
    g.beginPath();
    g.roundRect(-3, 0, 6, 16, 2);
    g.fill();
    g.stroke();
    g.restore();
  }
  // body, neck, head
  g.fillStyle = '#8a5a32';
  g.beginPath();
  g.ellipse(ax, ay - 20, 21, 10, 0, 0, TAU);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(ax + 12, ay - 26);
  g.lineTo(ax + 22, ay - 40);
  g.lineTo(ax + 30, ay - 36);
  g.lineTo(ax + 22, ay - 20);
  g.closePath();
  g.fill();
  g.stroke();
  g.beginPath();
  g.ellipse(ax + 27, ay - 38, 7, 5, 0.4, 0, TAU);
  g.fill();
  g.stroke();
  // tail and mane
  g.fillStyle = '#3d2614';
  g.beginPath();
  g.ellipse(ax - 22, ay - 20, 4, 8, 0.6, 0, TAU);
  g.fill();
  // saddle blanket in team colour
  g.fillStyle = col;
  g.beginPath();
  g.roundRect(ax - 9, ay - 30, 16, 12, 3);
  g.fill();
  g.stroke();
  // rider
  g.fillStyle = col;
  g.beginPath();
  g.roundRect(ax - 7, ay - 46, 14, 18, 6);
  g.fill();
  g.stroke();
  g.fillStyle = '#ffd3a6';
  g.beginPath();
  g.arc(ax + 1, ay - 50, 7, 0, TAU);
  g.fill();
  g.stroke();
  g.fillStyle = dark;
  g.beginPath();
  g.arc(ax + 1, ay - 52, 8, Math.PI, 0);
  g.closePath();
  g.fill();
  g.stroke();
  return { c, ax, ay, r: 12, top: 60 };
}

/** Soldier sprite (two walk frames); riders (from a stable) sit on a horse. */
export function troopSprite(owner: number, rider = false, frame = 0): Sprite {
  const key = `${owner}:${rider}:${frame}`;
  const hit = troopCache.get(key);
  if (hit) return hit;
  if (rider) {
    const sp = riderSprite(owner, frame);
    troopCache.set(key, sp);
    return sp;
  }
  const col = TEAM_COLORS[owner] ?? TEAM_COLORS[0],
    dark = TEAM_DARK[owner] ?? TEAM_DARK[0],
    light = TEAM_LIGHT[owner] ?? TEAM_LIGHT[0];
  const [c, g] = mk(48, 60);
  const ax = 22,
    ay = 54;
  g.strokeStyle = OUT;
  g.lineWidth = 3;
  g.fillStyle = 'rgba(20,50,20,0.28)';
  g.beginPath();
  g.ellipse(ax, ay, 12, 4, 0, 0, TAU);
  g.fill();
  // spear behind the body
  g.strokeStyle = '#6b4226';
  g.lineWidth = 3.5;
  g.beginPath();
  g.moveTo(ax + 11, ay - 6);
  g.lineTo(ax + 15, ay - 56);
  g.stroke();
  g.fillStyle = '#d7dde4';
  g.strokeStyle = OUT;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(ax + 15.5, ay - 59);
  g.lineTo(ax + 19, ay - 50);
  g.lineTo(ax + 12, ay - 51);
  g.closePath();
  g.fill();
  g.stroke();
  g.lineWidth = 3;
  // legs: apart or together
  g.fillStyle = '#2d3440';
  const legs: [number, number][] = frame
    ? [
        [-3, 0.25],
        [3, -0.25],
      ]
    : [
        [-1, 0.05],
        [1, -0.05],
      ];
  for (const [dx, rot] of legs) {
    g.save();
    g.translate(ax + dx, ay - 14);
    g.rotate(rot);
    g.beginPath();
    g.roundRect(-3.5, 0, 7, 14, 3);
    g.fill();
    g.stroke();
    g.restore();
  }
  // body with shading and a belt
  const grd = g.createLinearGradient(ax - 11, 0, ax + 11, 0);
  grd.addColorStop(0, light);
  grd.addColorStop(0.45, col);
  grd.addColorStop(1, dark);
  g.fillStyle = grd;
  g.beginPath();
  g.roundRect(ax - 11, ay - 33, 22, 21, 8);
  g.fill();
  g.stroke();
  g.fillStyle = '#4b3a2c';
  g.fillRect(ax - 10, ay - 19, 20, 3.5);
  // arm holding the spear
  g.fillStyle = col;
  g.beginPath();
  g.roundRect(ax + 4, ay - 30, 9, 7, 3.5);
  g.fill();
  g.stroke();
  // head
  g.fillStyle = '#ffd3a6';
  g.beginPath();
  g.arc(ax + 1, ay - 39, 8, 0, TAU);
  g.fill();
  g.stroke();
  // helmet with a shine
  g.fillStyle = dark;
  g.beginPath();
  g.arc(ax + 1, ay - 41, 9, Math.PI, 0);
  g.lineTo(ax + 12, ay - 40);
  g.lineTo(ax - 9, ay - 40);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.beginPath();
  g.ellipse(ax - 3, ay - 46, 3, 1.6, -0.4, 0, TAU);
  g.fill();
  // eye
  g.fillStyle = OUT;
  g.beginPath();
  g.arc(ax + 5, ay - 38, 1.6, 0, TAU);
  g.fill();
  const sprite: Sprite = { c, ax, ay, r: 12, top: 52 };
  troopCache.set(key, sprite);
  return sprite;
}

/** Deterministic PRNG for decoration. */
function prand(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Palette {
  outer: string;
  field: string;
  light: string;
  dark: string;
  tuft: string;
  flowers: string[];
  rock: [string, string];
  bush: [string, string];
}
export const PALETTES: Record<Theme, Palette> = {
  grass: {
    outer: '#5fb235',
    field: '#8fd956',
    light: 'rgba(255,255,255,0.08)',
    dark: 'rgba(0,80,0,0.07)',
    tuft: 'rgba(40,110,20,0.45)',
    flowers: ['#ffffff', '#ffe066', '#ff9ec7'],
    rock: ['#9aa3ad', '#c9cfd6'],
    bush: ['#3aa24a', '#5cc463'],
  },
  desert: {
    outer: '#d9a95b',
    field: '#f0cf8a',
    light: 'rgba(255,255,255,0.12)',
    dark: 'rgba(150,90,20,0.08)',
    tuft: 'rgba(160,110,40,0.35)',
    flowers: ['#ff8a5c', '#ffd166'],
    rock: ['#b9835a', '#d9a47a'],
    bush: ['#6f9a3a', '#8fbf4a'],
  },
  snow: {
    outer: '#b9d3e6',
    field: '#eef6fb',
    light: 'rgba(255,255,255,0.5)',
    dark: 'rgba(90,140,190,0.08)',
    tuft: 'rgba(120,160,200,0.35)',
    flowers: ['#bfe3ff', '#ffffff'],
    rock: ['#8b9bb0', '#c3d0de'],
    bush: ['#3f7f6a', '#5a9d86'],
  },
  autumn: {
    outer: '#b38a3a',
    field: '#d9c26a',
    light: 'rgba(255,255,255,0.1)',
    dark: 'rgba(120,70,0,0.08)',
    tuft: 'rgba(140,100,20,0.4)',
    flowers: ['#ff7043', '#ffca28', '#e53935'],
    rock: ['#9aa3ad', '#c9cfd6'],
    bush: ['#d0662b', '#f08a3c'],
  },
};

/** A round cartoon tree; colours depend on the world. */
export function drawTree(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  theme: Theme = 'grass',
): void {
  g.fillStyle = 'rgba(20,40,20,0.22)';
  g.beginPath();
  g.ellipse(x + 4 * s, y + 2 * s, 20 * s, 7 * s, 0, 0, TAU);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 2.5 * s;
  if (theme === 'desert') {
    // cactus
    g.fillStyle = '#4f9d4a';
    g.beginPath();
    g.roundRect(x - 7 * s, y - 44 * s, 14 * s, 46 * s, 7 * s);
    g.fill();
    g.stroke();
    g.beginPath();
    g.roundRect(x - 20 * s, y - 34 * s, 9 * s, 18 * s, 4.5 * s);
    g.roundRect(x + 11 * s, y - 40 * s, 9 * s, 20 * s, 4.5 * s);
    g.fill();
    g.stroke();
    g.fillStyle = '#6fbf63';
    g.fillRect(x - 3 * s, y - 40 * s, 3 * s, 34 * s);
    return;
  }
  g.fillStyle = '#7a4b25';
  g.beginPath();
  g.roundRect(x - 4 * s, y - 20 * s, 8 * s, 22 * s, 3 * s);
  g.fill();
  g.stroke();
  if (theme === 'snow') {
    // snowy pine
    for (let i = 0; i < 3; i++) {
      const yy = y - 14 * s - i * 14 * s,
        ww = (22 - i * 5) * s;
      g.fillStyle = '#2f7d5c';
      g.beginPath();
      g.moveTo(x - ww, yy);
      g.lineTo(x + ww, yy);
      g.lineTo(x, yy - 22 * s);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(x - ww * 0.45, yy - 12 * s);
      g.lineTo(x + ww * 0.45, yy - 12 * s);
      g.lineTo(x, yy - 22 * s);
      g.closePath();
      g.fill();
    }
    return;
  }
  const [c1, c2] = theme === 'autumn' ? ['#e0702a', '#f59a3d'] : ['#3aa24a', '#5cc463'];
  g.fillStyle = c1;
  g.beginPath();
  g.arc(x, y - 32 * s, 20 * s, 0, TAU);
  g.fill();
  g.stroke();
  g.fillStyle = c2;
  g.beginPath();
  g.arc(x - 5 * s, y - 37 * s, 11 * s, 0, TAU);
  g.fill();
}

function drawBush(g: CanvasRenderingContext2D, x: number, y: number, s: number, p: Palette): void {
  g.fillStyle = 'rgba(20,40,20,0.2)';
  g.beginPath();
  g.ellipse(x + 3 * s, y + 2 * s, 16 * s, 5 * s, 0, 0, TAU);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 2 * s;
  g.fillStyle = p.bush[0];
  for (const [dx, dy, r] of [
    [-7, -6, 8],
    [7, -6, 8],
    [0, -11, 9],
  ] as const) {
    g.beginPath();
    g.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
    g.fill();
    g.stroke();
  }
  g.fillStyle = p.bush[1];
  g.beginPath();
  g.arc(x - 2 * s, y - 13 * s, 4 * s, 0, TAU);
  g.fill();
}

function drawRock(g: CanvasRenderingContext2D, x: number, y: number, s: number, p: Palette): void {
  g.fillStyle = 'rgba(20,40,20,0.2)';
  g.beginPath();
  g.ellipse(x + 3 * s, y + 2 * s, 14 * s, 5 * s, 0, 0, TAU);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 2 * s;
  g.fillStyle = p.rock[0];
  g.beginPath();
  g.moveTo(x - 13 * s, y);
  g.lineTo(x - 10 * s, y - 10 * s);
  g.lineTo(x - 2 * s, y - 15 * s);
  g.lineTo(x + 9 * s, y - 11 * s);
  g.lineTo(x + 13 * s, y - 1 * s);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = p.rock[1];
  g.beginPath();
  g.moveTo(x - 8 * s, y - 9 * s);
  g.lineTo(x - 2 * s, y - 13 * s);
  g.lineTo(x + 6 * s, y - 10 * s);
  g.lineTo(x - 2 * s, y - 6 * s);
  g.closePath();
  g.fill();
}

/**
 * Ground of a level: the world's colours, soft patches, tufts and flowers, bushes and rocks away from
 * the towers, and trees (cacti, pines…) around the playfield.
 */
export function drawGround(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  f: { x: number; y: number; w: number; h: number },
  seed: number,
  theme: Theme,
  avoid: { x: number; y: number; r: number }[],
): void {
  const p = PALETTES[theme];
  const rand = prand(seed * 7 + 3);
  g.fillStyle = p.outer;
  g.fillRect(0, 0, w, h);
  // playfield
  const rad = Math.min(28, Math.min(f.w, f.h) * 0.06);
  g.fillStyle = 'rgba(0,30,0,0.18)';
  g.beginPath();
  g.roundRect(f.x - 2, f.y + 4, f.w + 4, f.h + 2, rad);
  g.fill();
  g.fillStyle = p.field;
  g.beginPath();
  g.roundRect(f.x, f.y, f.w, f.h, rad);
  g.fill();
  g.save();
  g.clip();
  for (let i = 0; i < 46; i++) {
    g.fillStyle = i % 3 ? p.light : p.dark;
    g.beginPath();
    g.ellipse(
      f.x + rand() * f.w,
      f.y + rand() * f.h,
      30 + rand() * f.w * 0.22,
      16 + rand() * f.w * 0.1,
      rand() * 3,
      0,
      TAU,
    );
    g.fill();
  }
  g.strokeStyle = p.tuft;
  g.lineWidth = 1.6;
  for (let i = 0; i < Math.round((f.w * f.h) / 2200); i++) {
    const x = f.x + rand() * f.w,
      y = f.y + rand() * f.h;
    g.beginPath();
    g.moveTo(x - 3, y - 5);
    g.lineTo(x, y);
    g.lineTo(x + 3, y - 5);
    g.stroke();
  }
  for (let i = 0; i < 26; i++) {
    const x = f.x + rand() * f.w,
      y = f.y + rand() * f.h;
    g.fillStyle = p.flowers[i % p.flowers.length] as string;
    for (const [dx, dy] of [
      [0, 0],
      [4, 2],
      [-3, 3],
    ] as const)
      if (rand() < 0.8) {
        g.beginPath();
        g.arc(x + dx, y + dy, 2.2, 0, TAU);
        g.fill();
      }
  }
  // bushes and rocks, never under a tower
  const s = Math.max(0.7, Math.min(1.2, f.w / 600));
  const props: [number, number, 'bush' | 'rock'][] = [];
  for (let i = 0; i < 40 && props.length < 12; i++) {
    const x = f.x + 14 + rand() * (f.w - 28),
      y = f.y + 24 + rand() * (f.h - 30);
    if (avoid.some((a) => Math.hypot(a.x - x, a.y - y) < a.r + 26 * s)) continue;
    if (props.some(([px, py]) => Math.hypot(px - x, py - y) < 50 * s)) continue;
    props.push([x, y, rand() < 0.55 ? 'bush' : 'rock']);
  }
  props
    .sort((a, b) => a[1] - b[1])
    .forEach(([x, y, k]) => (k === 'bush' ? drawBush(g, x, y, s * 0.8, p) : drawRock(g, x, y, s * 0.8, p)));
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(f.x, f.y, f.w, f.h, rad);
  g.stroke();
  // trees around the playfield
  const trees: [number, number][] = [];
  for (let i = 0; i < 110; i++) {
    const x = rand() * w,
      y = rand() * h;
    const inside = x > f.x - 20 && x < f.x + f.w + 20 && y > f.y - 10 && y < f.y + f.h + 50;
    if (inside) continue;
    trees.push([x, y]);
  }
  trees.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => drawTree(g, x, y, s * (0.7 + rand() * 0.5), theme));
  // warm sunlight from the top left
  const sun = g.createLinearGradient(0, 0, w, h);
  sun.addColorStop(0, 'rgba(255,244,200,0.16)');
  sun.addColorStop(0.5, 'rgba(255,244,200,0)');
  g.fillStyle = sun;
  g.fillRect(0, 0, w, h);
  // soft vignette
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,20,0,0.18)');
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
}

/** Stone wall between (x1,y1) and (x2,y2) in screen space: top face, front face, bricks. */
export function drawWall(
  g: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thick: number,
): void {
  const h = thick * 0.7;
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(20,50,20,0.25)';
  g.lineWidth = thick + 6;
  g.beginPath();
  g.moveTo(x1 + 4, y1 + h * 0.6 + 4);
  g.lineTo(x2 + 4, y2 + h * 0.6 + 4);
  g.stroke();
  g.strokeStyle = OUT;
  g.lineWidth = thick + 5;
  g.beginPath();
  g.moveTo(x1, y1 + h * 0.5);
  g.lineTo(x2, y2 + h * 0.5);
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
  g.strokeStyle = '#7f8893';
  g.lineWidth = thick;
  g.beginPath();
  g.moveTo(x1, y1 + h * 0.5);
  g.lineTo(x2, y2 + h * 0.5);
  g.stroke();
  g.strokeStyle = '#c7cdd4';
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
  // brick joints
  const len = Math.hypot(x2 - x1, y2 - y1),
    ux = (x2 - x1) / len,
    uy = (y2 - y1) / len;
  g.strokeStyle = 'rgba(60,70,80,0.45)';
  g.lineWidth = 1.5;
  g.lineCap = 'butt';
  for (let d = thick * 0.8; d < len - thick * 0.4; d += thick * 0.9) {
    const cx = x1 + ux * d,
      cy = y1 + uy * d;
    g.beginPath();
    g.moveTo(cx - uy * thick * 0.45, cy + ux * thick * 0.45);
    g.lineTo(cx + uy * thick * 0.45, cy - ux * thick * 0.45);
    g.stroke();
  }
  g.lineCap = 'round';
}

/** Data URL of a tower kind in neutral grey (for the "Neu" card). */
export function kindIcon(kind: TowerKind): string {
  return towerIcon(0, 2, kind);
}

const iconCache = new Map<string, string>();
/** Cropped data URL of a tower (for DOM screens: new-tower card, campaign map). */
export function towerIcon(owner: number, level: 1 | 2 | 3, kind: TowerKind): string {
  const key = `${owner}:${level}:${kind}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  const url = renderIcon(owner, level, kind);
  iconCache.set(key, url);
  return url;
}

function renderIcon(owner: number, level: 1 | 2 | 3, kind: TowerKind): string {
  const sp = towerSprite(owner, level, kind);
  const top = sp.ay - sp.top - 6,
    bottom = sp.ay + 34,
    w = 180;
  const [c, g] = mk(w, bottom - top);
  g.drawImage(sp.c, sp.ax - w / 2, top, w, bottom - top, 0, 0, w, bottom - top);
  if (kind === 'cannon') {
    // barrel, as in the game
    const y = sp.ay - (sp.gun ?? 0) - top;
    g.save();
    g.translate(w / 2, y);
    g.rotate(-Math.PI * 0.3);
    g.fillStyle = '#2e343d';
    g.strokeStyle = OUT;
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(-5, -8, 46, 16, 6);
    g.fill();
    g.stroke();
    g.restore();
    g.fillStyle = '#3b4350';
    g.beginPath();
    g.arc(w / 2, y, 11, 0, TAU);
    g.fill();
    g.stroke();
  }
  return c.toDataURL();
}
