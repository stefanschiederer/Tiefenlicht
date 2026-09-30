import { TEAM_COLORS, TEAM_DARK, TEAM_LIGHT } from '@/game/config';

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

/** Round castle tower in the owner colour; taller with each level, flag on level 3. */
export function towerSprite(owner: number, level: 1 | 2 | 3): Sprite {
  const key = `${owner}:${level}`;
  const hit = towerCache.get(key);
  if (hit) return hit;
  const col = TEAM_COLORS[owner] ?? TEAM_COLORS[0],
    dark = TEAM_DARK[owner] ?? TEAM_DARK[0],
    light = TEAM_LIGHT[owner] ?? TEAM_LIGHT[0];
  const r = [46, 50, 54][level - 1] as number;
  const hgt = [40, 64, 88][level - 1] as number;
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
  // window on level 2+
  if (level >= 2) {
    g.fillStyle = '#26303b';
    const wy = by - hgt * 0.62;
    g.beginPath();
    g.roundRect(ax - 7, wy, 14, 20, [7, 7, 2, 2]);
    g.fill();
    g.stroke();
  }
  // top: battlement ring
  const ty = by - hgt;
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
  // flag on level 3
  if (level >= 3) {
    g.strokeStyle = '#4b3a2c';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(ax, ty + 2);
    g.lineTo(ax, ty - 62);
    g.stroke();
    g.strokeStyle = OUT;
    g.lineWidth = 3.5;
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(ax + 2, ty - 62);
    g.quadraticCurveTo(ax + 22, ty - 64, ax + 42, ty - 52);
    g.quadraticCurveTo(ax + 22, ty - 44, ax + 2, ty - 40);
    g.closePath();
    g.fill();
    g.stroke();
  }
  for (let i = 0; i < merlons; i++) if (Math.sin((i / merlons) * TAU) >= 0) drawMerlon(i);
  const sprite: Sprite = { c, ax, ay, r, top: ay - ty + ry + (level >= 3 ? 50 : 16) };
  towerCache.set(key, sprite);
  return sprite;
}

const troopCache = new Map<number, Sprite>();

/** Little soldier (side view, facing right) in the owner colour. */
export function troopSprite(owner: number): Sprite {
  const hit = troopCache.get(owner);
  if (hit) return hit;
  const col = TEAM_COLORS[owner] ?? TEAM_COLORS[0],
    dark = TEAM_DARK[owner] ?? TEAM_DARK[0];
  const [c, g] = mk(40, 52);
  const ax = 20,
    ay = 46;
  g.strokeStyle = OUT;
  g.lineWidth = 3;
  g.fillStyle = 'rgba(20,50,20,0.25)';
  g.beginPath();
  g.ellipse(ax, ay, 12, 4, 0, 0, TAU);
  g.fill();
  // legs
  g.fillStyle = '#2d3440';
  g.beginPath();
  g.roundRect(ax - 8, ay - 14, 7, 14, 3);
  g.roundRect(ax + 1, ay - 14, 7, 14, 3);
  g.fill();
  g.stroke();
  // body
  g.fillStyle = col;
  g.beginPath();
  g.roundRect(ax - 11, ay - 32, 22, 21, 8);
  g.fill();
  g.stroke();
  // head
  g.fillStyle = '#ffd3a6';
  g.beginPath();
  g.arc(ax + 1, ay - 38, 8, 0, TAU);
  g.fill();
  g.stroke();
  // helmet
  g.fillStyle = dark;
  g.beginPath();
  g.arc(ax + 1, ay - 40, 9, Math.PI, 0);
  g.lineTo(ax + 12, ay - 39);
  g.lineTo(ax - 9, ay - 39);
  g.closePath();
  g.fill();
  g.stroke();
  // eye
  g.fillStyle = OUT;
  g.beginPath();
  g.arc(ax + 5, ay - 37, 1.6, 0, TAU);
  g.fill();
  const sprite: Sprite = { c, ax, ay, r: 12, top: 50 };
  troopCache.set(owner, sprite);
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

/** A round cartoon tree (for the border around the field). */
export function drawTree(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  g.fillStyle = 'rgba(20,60,20,0.25)';
  g.beginPath();
  g.ellipse(x + 4 * s, y + 2 * s, 20 * s, 7 * s, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#7a4b25';
  g.strokeStyle = OUT;
  g.lineWidth = 2.5 * s;
  g.beginPath();
  g.roundRect(x - 4 * s, y - 20 * s, 8 * s, 22 * s, 3 * s);
  g.fill();
  g.stroke();
  g.fillStyle = '#3aa24a';
  g.beginPath();
  g.arc(x, y - 32 * s, 20 * s, 0, TAU);
  g.fill();
  g.stroke();
  g.fillStyle = '#5cc463';
  g.beginPath();
  g.arc(x - 5 * s, y - 37 * s, 11 * s, 0, TAU);
  g.fill();
}

/** Ground: grass with soft patches and tufts, the playfield slightly lighter; trees outside. */
export function drawGround(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  f: { x: number; y: number; w: number; h: number },
  seed: number,
): void {
  const rand = prand(seed * 7 + 3);
  g.fillStyle = '#6ebf3c';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,60,0,0.05)';
    g.beginPath();
    g.ellipse(rand() * w, rand() * h, 40 + rand() * 120, 20 + rand() * 60, rand() * 3, 0, TAU);
    g.fill();
  }
  // playfield
  const rad = Math.min(f.w, f.h) * 0.06;
  g.fillStyle = 'rgba(0,50,0,0.18)';
  g.beginPath();
  g.roundRect(f.x - 2, f.y + 4, f.w + 4, f.h + 2, rad);
  g.fill();
  g.fillStyle = '#8fd956';
  g.beginPath();
  g.roundRect(f.x, f.y, f.w, f.h, rad);
  g.fill();
  g.save();
  g.clip();
  for (let i = 0; i < 40; i++) {
    g.fillStyle = i % 3 ? 'rgba(255,255,255,0.07)' : 'rgba(0,80,0,0.06)';
    g.beginPath();
    g.ellipse(
      f.x + rand() * f.w,
      f.y + rand() * f.h,
      30 + rand() * f.w * 0.2,
      16 + rand() * f.w * 0.1,
      rand() * 3,
      0,
      TAU,
    );
    g.fill();
  }
  g.strokeStyle = 'rgba(40,110,20,0.45)';
  g.lineWidth = 1.6;
  for (let i = 0; i < Math.round((f.w * f.h) / 2500); i++) {
    const x = f.x + rand() * f.w,
      y = f.y + rand() * f.h;
    g.beginPath();
    g.moveTo(x - 3, y - 5);
    g.lineTo(x, y);
    g.lineTo(x + 3, y - 5);
    g.stroke();
  }
  // a few flowers
  for (let i = 0; i < 18; i++) {
    const x = f.x + rand() * f.w,
      y = f.y + rand() * f.h;
    g.fillStyle = ['#fff', '#ffe066', '#ff9ec7'][i % 3] as string;
    g.beginPath();
    g.arc(x, y, 2.2, 0, TAU);
    g.fill();
  }
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(f.x, f.y, f.w, f.h, rad);
  g.stroke();
  // trees around the playfield
  const s = Math.max(0.6, Math.min(1.1, f.w / 700));
  const trees: [number, number][] = [];
  for (let i = 0; i < 90; i++) {
    const x = rand() * w,
      y = rand() * h;
    const inside = x > f.x - 20 && x < f.x + f.w + 20 && y > f.y - 10 && y < f.y + f.h + 50;
    if (inside) continue;
    trees.push([x, y]);
  }
  trees.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => drawTree(g, x, y, s * (0.7 + rand() * 0.5)));
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
