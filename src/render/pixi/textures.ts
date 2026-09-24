import { Texture } from 'pixi.js';
import type { NodeType, UnitType } from '@/data';
import type { Rock } from '@/sim/state';

/* ------------------------------------------------------------------ Tower-War-style art
 * Every texture is generated on a 2D canvas (no foreign assets). The look is a bright, flat
 * cartoon battlefield: grass island on water, oblique 2.5D military buildings on a coloured
 * pad, tiny soldiers / bikes / tanks, trees and rocks as decoration.
 *
 * Node art layers (all anchored at the node centre = ground point):
 *   base     tinted  – the round landing pad in the owner colour
 *   platform untinted – walls, crates, towers (material colours)
 *   detail   tinted  – roofs, doors, flags, tents in the owner colour
 *   rotor    tinted  – animated part (turret, radar dish, fan), placed at ROTOR_Y
 * Tinted textures are grey-shaded white art multiplied with the owner colour (see tintedTexture).
 */

const TAU = Math.PI * 2;
/** Texture pixel size per world unit (crisp when zoomed). */
export const TEX_SCALE = 2;
/** Node art is drawn for this base radius; sprites are scaled to the node's world radius. */
export const NODE_R = 32;
type Level = 1 | 2 | 3;
const R = NODE_R * TEX_SCALE;
const SIZE = R * 3;
const C = SIZE / 2;
/** Dark outline colour of the cartoon style. */
export const INK = '#22303f';
/** Oblique projection: ground depth v maps to (v*KX, -v*KY). */
const KX = 0.45,
  KY = 0.5;
/** Pad ellipse (ground disc) vertical squash. */
export const PAD_RY = 0.62;
/** Vertical offset (texture px) of the rotor sprite above the node centre, per type. */
export const ROTOR_Y: Record<NodeType, number> = {
  nest: 0,
  brut: 0,
  bastion: 0,
  strom: -R * 0.78,
  waechter: -R * 0.72,
  quelle: -R * 0.7,
};

type Mat = { top: string; front: string; side: string };
const CONCRETE: Mat = { top: '#f4f6f8', front: '#d7dde4', side: '#b6bfc9' };
const STEEL: Mat = { top: '#98a2ad', front: '#6f7985', side: '#525b66' };
const WOOD: Mat = { top: '#e5b77e', front: '#c48f58', side: '#9c6a3c' };
const SAND: Mat = { top: '#ebd9a8', front: '#cfb57e', side: '#b09462' };
/** Grey-shaded white: after multiply-tinting these become light / mid / dark owner colour. */
const TINT: Mat = { top: '#ffffff', front: '#cfcfcf', side: '#a3a3a3' };

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return [c, c.getContext('2d') as CanvasRenderingContext2D];
}
const cache = new Map<string, Texture>();
function cached(key: string, make: () => HTMLCanvasElement): Texture {
  let t = cache.get(key);
  if (!t) {
    t = Texture.from(make());
    cache.set(key, t);
  }
  return t;
}
function lcg(seed: number): () => number {
  let s = (seed | 1) & 0x7fffffff;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/* ------------------------------------------------------------------ 2.5D drawing helpers */
class Draw {
  constructor(
    readonly g: CanvasRenderingContext2D,
    readonly ox: number,
    readonly oy: number,
    readonly lw: number,
  ) {
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = INK;
    g.lineWidth = lw;
  }
  /** Ground point (u right, v back, z up) → canvas. */
  p(u: number, v: number, z = 0): [number, number] {
    return [this.ox + u + v * KX, this.oy - v * KY - z];
  }
  face(pts: [number, number][], fill: string, outline = true): void {
    const g = this.g;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    if (outline) g.stroke();
  }
  /** Box with footprint w×d centred at (cu, cv), height h. */
  box(cu: number, cv: number, w: number, d: number, h: number, m: Mat, z0 = 0): void {
    const u0 = cu - w / 2,
      u1 = cu + w / 2,
      v0 = cv - d / 2,
      v1 = cv + d / 2;
    this.face(
      [this.p(u0, v0, z0), this.p(u1, v0, z0), this.p(u1, v0, z0 + h), this.p(u0, v0, z0 + h)],
      m.front,
    );
    this.face(
      [this.p(u1, v0, z0), this.p(u1, v1, z0), this.p(u1, v1, z0 + h), this.p(u1, v0, z0 + h)],
      m.side,
    );
    this.face(
      [this.p(u0, v0, z0 + h), this.p(u1, v0, z0 + h), this.p(u1, v1, z0 + h), this.p(u0, v1, z0 + h)],
      m.top,
    );
  }
  /** Flat rectangle on a horizontal plane at height z. */
  slab(cu: number, cv: number, w: number, d: number, z: number, fill: string, outline = false): void {
    const u0 = cu - w / 2,
      u1 = cu + w / 2,
      v0 = cv - d / 2,
      v1 = cv + d / 2;
    this.face([this.p(u0, v0, z), this.p(u1, v0, z), this.p(u1, v1, z), this.p(u0, v1, z)], fill, outline);
  }
  /** Rectangle on the front wall (plane v = const) between heights z0..z1. */
  wall(u0: number, u1: number, v: number, z0: number, z1: number, fill: string, outline = false): void {
    this.face([this.p(u0, v, z0), this.p(u1, v, z0), this.p(u1, v, z1), this.p(u0, v, z1)], fill, outline);
  }
  /** Tent: triangular prism with the ridge along v. */
  tent(cu: number, cv: number, w: number, d: number, h: number, m: Mat, flap = true): void {
    const u0 = cu - w / 2,
      u1 = cu + w / 2,
      v0 = cv - d / 2,
      v1 = cv + d / 2;
    // left slope (lit), right slope (shade), front gable
    this.face([this.p(u0, v0), this.p(cu, v0, h), this.p(cu, v1, h), this.p(u0, v1)], m.top);
    this.face([this.p(cu, v0, h), this.p(u1, v0), this.p(u1, v1), this.p(cu, v1, h)], m.side);
    this.face([this.p(u0, v0), this.p(u1, v0), this.p(cu, v0, h)], m.front);
    if (flap)
      this.face([this.p(cu - w * 0.16, v0), this.p(cu + w * 0.16, v0), this.p(cu, v0, h * 0.55)], '#6b6b6b');
  }
  /** Cylinder (tower) of radius r and height h standing at (cu, cv). */
  cylinder(cu: number, cv: number, r: number, h: number, m: Mat, z0 = 0): void {
    const g = this.g;
    const [x, y] = this.p(cu, cv, z0);
    const ry = r * PAD_RY;
    g.beginPath();
    g.moveTo(x - r, y);
    g.lineTo(x - r, y - h);
    g.ellipse(x, y - h, r, ry, 0, Math.PI, 0, true);
    g.lineTo(x + r, y);
    g.ellipse(x, y, r, ry, 0, 0, Math.PI);
    g.closePath();
    const grd = g.createLinearGradient(x - r, 0, x + r, 0);
    grd.addColorStop(0, m.front);
    grd.addColorStop(0.55, m.front);
    grd.addColorStop(1, m.side);
    g.fillStyle = grd;
    g.fill();
    g.stroke();
    g.beginPath();
    g.ellipse(x, y - h, r, ry, 0, 0, TAU);
    g.fillStyle = m.top;
    g.fill();
    g.stroke();
  }
  /** Flag on a pole at (cu, cv): pole untinted (platform), cloth tinted (detail). */
  pole(cu: number, cv: number, h: number): void {
    const g = this.g;
    const [x, y] = this.p(cu, cv);
    g.strokeStyle = '#4a5563';
    g.lineWidth = this.lw * 0.9;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x, y - h);
    g.stroke();
    g.strokeStyle = INK;
    g.lineWidth = this.lw;
  }
  flag(cu: number, cv: number, h: number, w: number): void {
    const [x, y] = this.p(cu, cv, h);
    this.face(
      [
        [x, y],
        [x + w, y + w * 0.3],
        [x, y + w * 0.6],
      ],
      '#f4f4f4',
    );
  }
  shadow(cu: number, cv: number, rx: number, ry: number, a = 0.18): void {
    const g = this.g;
    const [x, y] = this.p(cu, cv);
    g.fillStyle = `rgba(20,40,30,${a})`;
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, TAU);
    g.fill();
  }
  dot(x: number, y: number, r: number, fill: string): void {
    const g = this.g;
    g.fillStyle = fill;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
}
function nodeDraw(g: CanvasRenderingContext2D): Draw {
  return new Draw(g, C, C + R * 0.12, 2.6);
}

/** Soft radial glow (white, tinted at use). */
export function glowTexture(): Texture {
  return cached('glow', () => {
    const [c, g] = canvas(128, 128);
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,0.9)');
    grd.addColorStop(0.3, 'rgba(255,255,255,0.35)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return c;
  });
}
/** Tiny soft dot for particles. */
export function dotTexture(): Texture {
  return cached('dot', () => {
    const [c, g] = canvas(16, 16);
    const grd = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.6)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 16, 16);
    return c;
  });
}

/* ------------------------------------------------------------------ node: base pad (tinted) */
export function baseTexture(type: NodeType, level: Level = 1): Texture {
  return cached(`base:${type}:${level}`, () => {
    const [c, g] = canvas(SIZE, SIZE);
    const d = nodeDraw(g);
    const [x, y] = d.p(0, 0);
    const rx = R * (0.96 + (level - 1) * 0.03),
      ry = rx * PAD_RY,
      th = 7;
    // pad thickness (dark rim below) + top disc
    g.fillStyle = '#8c8c8c';
    g.beginPath();
    g.ellipse(x, y + th, rx, ry, 0, 0, TAU);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2.6;
    g.stroke();
    g.fillStyle = '#e2e2e2';
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, TAU);
    g.fill();
    g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(x, y, rx * 0.82, ry * 0.82, 0, 0, TAU);
    g.fill();
    // level chevrons on the front of the pad
    for (let i = 0; i < level - 1; i++) {
      const px = x + (i - (level - 2) / 2) * 16,
        py = y + ry * 0.55;
      g.fillStyle = '#7a7a7a';
      g.beginPath();
      g.moveTo(px - 6, py - 3);
      g.lineTo(px, py + 3);
      g.lineTo(px + 6, py - 3);
      g.lineTo(px, py);
      g.closePath();
      g.fill();
    }
    return c;
  });
}

/* ------------------------------------------------------------------ node: walls (untinted) */
export function platformTexture(type: NodeType, level: Level = 1): Texture {
  return cached(`platform:${type}:${level}`, () => {
    const [c, g] = canvas(SIZE, SIZE);
    const d = nodeDraw(g);
    const L = level;
    if (type === 'nest') {
      // barracks: long hut, annex from level 2, second storey at level 3
      d.shadow(0, 0, R * 0.8, R * 0.42);
      if (L >= 2) d.box(-R * 0.62, R * 0.05, R * 0.34, R * 0.4, R * 0.28, CONCRETE);
      d.box(0.06 * R, 0, R * 0.98, R * 0.5, R * 0.4, CONCRETE);
      if (L >= 3) d.box(0.06 * R, 0.02 * R, R * 0.6, R * 0.36, R * 0.26, CONCRETE, R * 0.4);
      // windows + door
      const v = -R * 0.25;
      d.wall(-R * 0.3, -R * 0.14, v, R * 0.16, R * 0.3, '#7aa7d8', true);
      d.wall(R * 0.28, R * 0.44, v, R * 0.16, R * 0.3, '#7aa7d8', true);
      d.wall(-R * 0.04, R * 0.14, v, 0, R * 0.26, '#3f4854', true);
      if (L >= 3) d.wall(-R * 0.16, R * 0.28, v + R * 0.07, R * 0.52, R * 0.6, '#7aa7d8', true);
      d.pole(R * 0.5, R * 0.28, R * (L >= 3 ? 0.98 : 0.72));
      if (L >= 2) d.pole(-R * 0.66, R * 0.3, R * 0.5);
    } else if (type === 'brut') {
      // training camp: crates, campfire, sandbags (tents are tinted → detail)
      d.shadow(0, 0, R * 0.82, R * 0.42);
      d.box(R * 0.62, -R * 0.1, R * 0.2, R * 0.2, R * 0.2, WOOD);
      d.box(R * 0.66, R * 0.18, R * 0.2, R * 0.2, R * 0.2, WOOD);
      if (L >= 2) d.box(R * 0.62, -R * 0.1, R * 0.18, R * 0.18, R * 0.18, WOOD, R * 0.2);
      if (L >= 3) {
        // campfire
        const [fx, fy] = d.p(-R * 0.62, -R * 0.2);
        d.dot(fx, fy, 9, '#6b7280');
        d.dot(fx, fy - 2, 6, '#f6a623');
        d.dot(fx, fy - 5, 3.5, '#ffe08a');
      }
      d.pole(-R * 0.1, R * 0.4, R * 0.9);
    } else if (type === 'bastion') {
      // bunker: wide concrete block with a dome, gun slits, sandbags (L2), corner towers (L3)
      d.shadow(0, 0, R * 0.88, R * 0.46);
      d.box(0, 0, R * 1.15, R * 0.62, R * 0.34, CONCRETE);
      const [dx, dy] = d.p(0.05 * R, 0.02 * R, R * 0.34);
      const dr = R * 0.34;
      g.beginPath();
      g.ellipse(dx, dy, dr, dr * 0.8, 0, Math.PI, 0);
      g.closePath();
      const grd = g.createLinearGradient(dx - dr, 0, dx + dr, 0);
      grd.addColorStop(0, CONCRETE.top);
      grd.addColorStop(1, CONCRETE.side);
      g.fillStyle = grd;
      g.fill();
      g.stroke();
      const v = -R * 0.31;
      d.wall(-R * 0.42, -R * 0.24, v, R * 0.14, R * 0.22, '#2f3742', true);
      d.wall(R * 0.24, R * 0.42, v, R * 0.14, R * 0.22, '#2f3742', true);
      if (L >= 2)
        for (let i = -3; i <= 3; i++) d.box(i * R * 0.18, -R * 0.5, R * 0.17, R * 0.12, R * 0.09, SAND);
      if (L >= 3) {
        d.box(-R * 0.64, -R * 0.3, R * 0.24, R * 0.24, R * 0.5, CONCRETE);
        d.box(R * 0.64, -R * 0.3, R * 0.24, R * 0.24, R * 0.5, CONCRETE);
      }
    } else if (type === 'strom') {
      // motor pool: garage hall, fuel pump, tyre stack; taller at L3
      d.shadow(0, 0, R * 0.84, R * 0.44);
      d.box(-0.02 * R, 0, R * (L >= 2 ? 1.1 : 0.92), R * 0.56, R * 0.46, CONCRETE);
      if (L >= 3) d.box(R * 0.36, 0.06 * R, R * 0.3, R * 0.3, R * 0.3, STEEL, R * 0.46);
      // fuel pump (red) and tyres
      d.box(R * 0.7, -R * 0.12, R * 0.12, R * 0.12, R * 0.26, {
        top: '#f2a29a',
        front: '#e2574a',
        side: '#b53f34',
      });
      const [tx, ty] = d.p(-R * 0.7, -R * 0.1);
      d.dot(tx, ty, 8, '#3a3f47');
      d.dot(tx, ty, 3.5, '#8a929c');
      if (L >= 2) {
        d.dot(tx, ty - 6, 8, '#3a3f47');
        d.dot(tx, ty - 6, 3.5, '#8a929c');
      }
    } else if (type === 'waechter') {
      // gun tower: sandbag ring, round tower, second tier from L2
      d.shadow(0, 0, R * 0.7, R * 0.38);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.3;
        d.box(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, R * 0.2, R * 0.13, R * 0.1, SAND);
      }
      d.cylinder(0, 0, R * 0.34, R * (L >= 2 ? 0.5 : 0.4), CONCRETE);
      if (L >= 2) d.cylinder(0, 0, R * 0.28, R * 0.16, STEEL, R * 0.5);
      if (L >= 3) d.cylinder(0, 0, R * 0.36, R * 0.08, STEEL, R * 0.66);
      d.wall(-R * 0.08, R * 0.08, -R * 0.34, R * 0.12, R * 0.24, '#2f3742', true);
    } else if (type === 'quelle') {
      // supply depot: warehouse, crates, barrels; second hall at L3
      d.shadow(0, 0, R * 0.86, R * 0.44);
      if (L >= 3) d.box(-R * 0.5, R * 0.22, R * 0.5, R * 0.36, R * 0.32, CONCRETE);
      d.box(0.1 * R, 0, R * 0.9, R * 0.5, R * 0.42, CONCRETE);
      d.box(-R * 0.62, -R * 0.14, R * 0.2, R * 0.2, R * 0.2, WOOD);
      if (L >= 2) d.box(-R * 0.62, -R * 0.14, R * 0.18, R * 0.18, R * 0.18, WOOD, R * 0.2);
      d.cylinder(R * 0.7, -R * 0.08, R * 0.09, R * 0.22, STEEL);
      if (L >= 2) d.cylinder(R * 0.72, R * 0.16, R * 0.09, R * 0.22, STEEL);
      d.wall(-R * 0.1, R * 0.3, -R * 0.25, 0, R * 0.3, '#3f4854', true);
      d.pole(R * 0.1, R * 0.05, R * 0.92);
    }
    return c;
  });
}

/* ------------------------------------------------------------------ node: tinted details */
export function detailTexture(type: NodeType, level: Level = 1): Texture {
  return cached(`detail:${type}:${level}`, () => {
    const [c, g] = canvas(SIZE, SIZE);
    const d = nodeDraw(g);
    const L = level;
    if (type === 'nest') {
      d.slab(0.06 * R, 0, R * 1.02, R * 0.54, R * 0.4, TINT.top, true);
      if (L >= 3) d.slab(0.06 * R, 0.02 * R, R * 0.64, R * 0.4, R * 0.66, TINT.top, true);
      if (L >= 2) d.slab(-R * 0.62, R * 0.05, R * 0.38, R * 0.44, R * 0.28, TINT.front, true);
      d.wall(-R * 0.43, R * 0.55, -R * 0.25, R * 0.31, R * 0.36, TINT.front);
      d.flag(R * 0.5, R * 0.28, R * (L >= 3 ? 0.98 : 0.72), R * 0.3);
      if (L >= 2) d.flag(-R * 0.66, R * 0.3, R * 0.5, R * 0.22);
    } else if (type === 'brut') {
      if (L >= 2) d.tent(R * 0.3, R * 0.3, R * 0.5, R * 0.42, R * 0.34, TINT);
      if (L >= 3) d.tent(-R * 0.56, R * 0.3, R * 0.46, R * 0.4, R * 0.32, TINT);
      d.tent(-R * 0.08, -R * 0.06, R * (L >= 3 ? 0.9 : 0.8), R * 0.6, R * (L >= 3 ? 0.58 : 0.5), TINT);
      d.flag(-R * 0.1, R * 0.4, R * 0.9, R * 0.28);
    } else if (type === 'bastion') {
      // hangar door with rails, stripe on the dome, tower tops
      d.wall(-R * 0.17, R * 0.17, -R * 0.31, 0, R * 0.28, TINT.front, true);
      for (let z = 0.07; z < 0.28; z += 0.07)
        d.wall(-R * 0.15, R * 0.15, -R * 0.31, R * z, R * z + 1.5, TINT.side);
      const [dx, dy] = d.p(0.05 * R, 0.02 * R, R * 0.34);
      g.strokeStyle = '#ffffff';
      g.lineWidth = 5;
      g.beginPath();
      g.ellipse(dx, dy - 2, R * 0.3, R * 0.24, 0, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
      g.strokeStyle = INK;
      g.lineWidth = 2.6;
      if (L >= 3) {
        d.slab(-R * 0.64, -R * 0.3, R * 0.26, R * 0.26, R * 0.5, TINT.top, true);
        d.slab(R * 0.64, -R * 0.3, R * 0.26, R * 0.26, R * 0.5, TINT.top, true);
      }
    } else if (type === 'strom') {
      const w = L >= 2 ? 1.1 : 0.92;
      d.slab(-0.02 * R, 0, R * (w + 0.06), R * 0.6, R * 0.46, TINT.top, true);
      // rolling doors with lines
      const doors = L >= 2 ? [-R * 0.3, R * 0.26] : [-0.02 * R];
      for (const du of doors) {
        d.wall(du - R * 0.2, du + R * 0.2, -R * 0.28, 0, R * 0.34, TINT.front, true);
        for (let z = 0.08; z < 0.34; z += 0.08)
          d.wall(du - R * 0.18, du + R * 0.18, -R * 0.28, R * z, R * z + 1.5, TINT.side);
      }
      // speed chevrons on the pad
      const [px, py] = d.p(0, -R * 0.78);
      for (let i = 0; i < 3; i++) {
        g.fillStyle = i ? '#cfcfcf' : '#ffffff';
        g.beginPath();
        g.moveTo(px - 40 + i * 30, py + 5);
        g.lineTo(px - 30 + i * 30, py);
        g.lineTo(px - 40 + i * 30, py - 5);
        g.lineTo(px - 34 + i * 30, py);
        g.closePath();
        g.fill();
      }
    } else if (type === 'waechter') {
      // tinted band around the tower base
      const [x, y] = d.p(0, 0);
      g.fillStyle = TINT.front;
      g.beginPath();
      g.ellipse(x, y - R * 0.1, R * 0.35, R * 0.35 * PAD_RY, 0, 0, Math.PI);
      g.lineTo(x - R * 0.35, y - R * 0.18);
      g.ellipse(x, y - R * 0.18, R * 0.35, R * 0.35 * PAD_RY, 0, Math.PI, 0, true);
      g.closePath();
      g.fill();
      g.stroke();
    } else if (type === 'quelle') {
      d.slab(0.1 * R, 0, R * 0.94, R * 0.54, R * 0.42, TINT.top, true);
      if (L >= 3) d.slab(-R * 0.5, R * 0.22, R * 0.54, R * 0.4, R * 0.32, TINT.front, true);
      d.wall(-R * 0.35, R * 0.55, -R * 0.25, R * 0.32, R * 0.38, TINT.front);
      d.flag(R * 0.1, R * 0.05, R * 0.92, R * 0.28);
    }
    return c;
  });
}

/* ------------------------------------------------------------------ node: animated part (tinted) */
export function rotorTexture(type: NodeType, level: Level = 1): Texture | null {
  if (type !== 'waechter' && type !== 'quelle' && type !== 'strom') return null;
  return cached(`rotor:${type}:${level}`, () => {
    const [c, g] = canvas(SIZE, SIZE);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = INK;
    g.lineWidth = 2.6;
    if (type === 'waechter') {
      // turret cap with one (L1–2) or two (L3) barrels
      const barrels = level >= 3 ? [-6, 6] : [0];
      for (const off of barrels) {
        g.fillStyle = '#7a7a7a';
        g.beginPath();
        g.roundRect(C, C + off - 3.5, R * 0.62, 7, 3);
        g.fill();
        g.stroke();
        g.fillStyle = '#4c4c4c';
        g.beginPath();
        g.roundRect(C + R * 0.5, C + off - 4.5, 10, 9, 2);
        g.fill();
        g.stroke();
      }
      g.fillStyle = '#d8d8d8';
      g.beginPath();
      g.ellipse(C, C, R * 0.26, R * 0.26 * 0.85, 0, 0, TAU);
      g.fill();
      g.stroke();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(C - 2, C - 3, R * 0.14, R * 0.11, 0, 0, TAU);
      g.fill();
    } else if (type === 'quelle') {
      // radar dish seen from above: mast + half disc
      g.fillStyle = '#5a5a5a';
      g.beginPath();
      g.roundRect(C - 3, C - 3, R * 0.4, 6, 3);
      g.fill();
      g.fillStyle = '#e6e6e6';
      g.beginPath();
      g.ellipse(C, C, R * 0.3, R * 0.3, 0, Math.PI * 0.55, Math.PI * 1.45);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(C, C, R * 0.2, R * 0.2, 0, Math.PI * 0.6, Math.PI * 1.4);
      g.closePath();
      g.fill();
      g.fillStyle = '#4c4c4c';
      g.beginPath();
      g.arc(C, C, 5, 0, TAU);
      g.fill();
    } else {
      // rooftop fan / beacon
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU;
        g.fillStyle = i ? '#cfcfcf' : '#ffffff';
        g.beginPath();
        g.moveTo(C, C);
        g.lineTo(C + Math.cos(a - 0.35) * R * 0.22, C + Math.sin(a - 0.35) * R * 0.22);
        g.lineTo(C + Math.cos(a + 0.35) * R * 0.22, C + Math.sin(a + 0.35) * R * 0.22);
        g.closePath();
        g.fill();
        g.stroke();
      }
      g.fillStyle = '#4c4c4c';
      g.beginPath();
      g.arc(C, C, 4, 0, TAU);
      g.fill();
    }
    return c;
  });
}

/** Level ring (tinted) around the pad. */
export function ringTexture(): Texture {
  return cached('ring', () => {
    const [c, g] = canvas(SIZE, SIZE);
    g.strokeStyle = '#fff';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(C, C + R * 0.12, R * 1.12, R * 1.12 * PAD_RY, 0, 0, TAU);
    g.stroke();
    return c;
  });
}

/* ------------------------------------------------------------------ units (top-down, facing +x, tinted) */
export function unitTexture(unit: UnitType): Texture {
  return cached('unit:' + unit, () => {
    const size = 48,
      cx = 24,
      cy = 24;
    const [c, g] = canvas(size, size);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.translate(cx, cy);
    g.strokeStyle = INK;
    g.lineWidth = 2;
    const rr = (x: number, y: number, w: number, h: number, r: number, fill: string, outline = true) => {
      g.fillStyle = fill;
      g.beginPath();
      g.roundRect(x, y, w, h, r);
      g.fill();
      if (outline) g.stroke();
    };
    const dot = (x: number, y: number, r: number, fill: string, outline = true) => {
      g.fillStyle = fill;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
      if (outline) g.stroke();
    };
    const wheel = (x: number, y: number, w: number, h: number) =>
      rr(x - w / 2, y - h / 2, w, h, 2, '#3a3a3a');
    if (unit === 'sporen') {
      // soldier: shoulders, helmet, rifle
      g.fillStyle = '#4a4a4a';
      g.beginPath();
      g.roundRect(-2, -1.5, 18, 3, 1.5);
      g.fill();
      g.stroke();
      rr(-8, -8, 12, 16, 5, '#d6d6d6');
      dot(0, 0, 6, '#ffffff');
      dot(-1.5, -1.5, 2.6, '#cfcfcf', false);
    } else if (unit === 'drohnen') {
      // recruit: smaller, cap, pistol
      g.fillStyle = '#4a4a4a';
      g.beginPath();
      g.roundRect(0, -1.2, 10, 2.4, 1.2);
      g.fill();
      g.stroke();
      rr(-7, -6.5, 10, 13, 4, '#d6d6d6');
      dot(0, 0, 5, '#ffffff');
      rr(-5, -3, 5, 6, 2, '#bdbdbd', false);
    } else if (unit === 'panzer') {
      // tank: tracks, hull, turret, barrel
      wheel(0, -9, 30, 6);
      wheel(0, 9, 30, 6);
      rr(-14, -7, 28, 14, 3, '#cfcfcf');
      g.fillStyle = '#5a5a5a';
      g.beginPath();
      g.roundRect(2, -2, 20, 4, 2);
      g.fill();
      g.stroke();
      dot(-2, 0, 7, '#ffffff');
      dot(-3, -1, 3, '#d0d0d0', false);
    } else if (unit === 'pfeile') {
      // motorbike with rider
      wheel(10, 0, 9, 4.5);
      wheel(-10, 0, 9, 4.5);
      rr(-9, -3, 18, 6, 3, '#e0e0e0');
      g.strokeStyle = '#4a4a4a';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(6, -6);
      g.lineTo(6, 6);
      g.stroke();
      g.strokeStyle = INK;
      g.lineWidth = 2;
      dot(-1, 0, 4.5, '#ffffff');
    } else if (unit === 'stachel') {
      // jeep with mounted gun
      wheel(7, -8, 7, 4);
      wheel(-7, -8, 7, 4);
      wheel(7, 8, 7, 4);
      wheel(-7, 8, 7, 4);
      rr(-12, -6.5, 24, 13, 3, '#d9d9d9');
      rr(3, -5, 4, 10, 1, '#8fb3d9', true);
      g.fillStyle = '#4a4a4a';
      g.beginPath();
      g.roundRect(-4, -1.5, 16, 3, 1.5);
      g.fill();
      g.stroke();
      dot(-5, 0, 4.5, '#ffffff');
    } else {
      // supply truck: cab + cargo box
      wheel(9, -8, 6, 4);
      wheel(-9, -8, 6, 4);
      wheel(-2, -8, 6, 4);
      wheel(9, 8, 6, 4);
      wheel(-9, 8, 6, 4);
      wheel(-2, 8, 6, 4);
      rr(-15, -7, 20, 14, 2, '#f0f0f0');
      rr(6, -6, 9, 12, 3, '#cfcfcf');
      rr(9, -5, 3, 10, 1, '#8fb3d9');
      g.fillStyle = '#c4c4c4';
      g.fillRect(-13, -7, 1.5, 14);
      g.fillRect(-7, -7, 1.5, 14);
      g.fillRect(-1, -7, 1.5, 14);
    }
    return c;
  });
}

/* ------------------------------------------------------------------ rocks (obstacles): grey boulders */
export function rockClusterTexture(
  cluster: Rock[],
  seed: number,
): { texture: Texture; x: number; y: number; w: number; h: number } {
  const rand = lcg(seed);
  const pad = 30;
  const minX = Math.min(...cluster.map((p) => p.x - p.r)) - pad,
    minY = Math.min(...cluster.map((p) => p.y - p.r)) - pad,
    maxX = Math.max(...cluster.map((p) => p.x + p.r)) + pad,
    maxY = Math.max(...cluster.map((p) => p.y + p.r)) + pad;
  const w = maxX - minX,
    h = maxY - minY;
  const [c, g] = canvas(w * TEX_SCALE, h * TEX_SCALE);
  g.scale(TEX_SCALE, TEX_SCALE);
  g.translate(-minX, -minY);
  g.lineJoin = 'round';
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  const blob = (p: Rock, scale: number, dy: number) => {
    g.beginPath();
    const n = 9;
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * TAU,
        rr = p.r * scale * (0.86 + 0.14 * Math.sin(a * 3 + p.x * 0.1)),
        x = p.x + Math.cos(a) * rr,
        y = p.y + dy + Math.sin(a) * rr * 0.8;
      if (k) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.closePath();
  };
  // ground shadow, dark base, lit top
  for (const p of cluster) {
    blob(p, 1.08, p.r * 0.3);
    g.fillStyle = 'rgba(20,40,30,0.18)';
    g.fill();
  }
  for (const p of cluster) {
    blob(p, 1, p.r * 0.12);
    g.fillStyle = '#7d8793';
    g.fill();
    g.stroke();
  }
  for (const p of cluster) {
    blob(p, 0.82, -p.r * 0.12);
    g.fillStyle = '#b9c2cc';
    g.fill();
    g.stroke();
    blob(p, 0.4, -p.r * 0.32);
    g.fillStyle = '#dfe5eb';
    g.fill();
  }
  // grass tufts
  g.strokeStyle = '#4f9a3a';
  g.lineWidth = 1.4;
  for (const p of cluster)
    for (let i = 0; i < 4; i++) {
      const a = rand() * TAU,
        x = p.x + Math.cos(a) * p.r * 1.05,
        y = p.y + Math.sin(a) * p.r * 0.85 + p.r * 0.3;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 2, y - 5);
      g.moveTo(x, y);
      g.lineTo(x + 2, y - 5);
      g.stroke();
    }
  return { texture: Texture.from(c, true), x: minX, y: minY, w, h };
}

/* ------------------------------------------------------------------ terrain */
/** Screen background: soft sky-blue water gradient. */
export function backgroundTexture(): Texture {
  return cached('bg', () => {
    const [c, g] = canvas(64, 512);
    const bg = g.createLinearGradient(0, 0, 0, 512);
    bg.addColorStop(0, '#8fdcf7');
    bg.addColorStop(1, '#5dbde9');
    g.fillStyle = bg;
    g.fillRect(0, 0, 64, 512);
    return c;
  });
}
/** Tileable water with small wave strokes (world space, under the island). */
export function waterTexture(): Texture {
  return cached('water', () => {
    const s = 256;
    const [c, g] = canvas(s, s);
    g.fillStyle = '#6cc8ee';
    g.fillRect(0, 0, s, s);
    const rand = lcg(77);
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = 2;
    g.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const x = rand() * s,
        y = rand() * s,
        w = 10 + rand() * 16;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + w / 2, y - 3, x + w, y);
      g.stroke();
    }
    return c;
  });
}
/**
 * The island: grass plateau with a sand rim and an earth cliff below, sized for the world plus a
 * margin. Returned with its world-space top-left so the renderer can place it.
 */
export function landTexture(
  worldW: number,
  worldH: number,
  seed: number,
): { texture: Texture; x: number; y: number; w: number; h: number } {
  const M = 110,
    CLIFF = 30,
    w = worldW + 2 * M,
    h = worldH + 2 * M + CLIFF;
  const [c, g] = canvas(w, h);
  const rand = lcg(seed * 7 + 3);
  const plate = (dy: number, inset: number) => {
    g.beginPath();
    g.roundRect(inset, inset + dy, w - 2 * inset, h - CLIFF - 2 * inset, 140);
  };
  plate(CLIFF, 0);
  g.fillStyle = '#b48a58';
  g.fill();
  plate(CLIFF * 0.55, 0);
  g.fillStyle = '#c9a06a';
  g.fill();
  plate(0, 0);
  g.fillStyle = '#e8d8a0';
  g.fill();
  plate(0, 12);
  g.fillStyle = '#9ed45f';
  g.fill();
  g.save();
  plate(0, 12);
  g.clip();
  for (let i = 0; i < 90; i++) {
    g.fillStyle = i % 3 ? '#93cb55' : '#adde72';
    g.beginPath();
    g.ellipse(rand() * w, rand() * h, 40 + rand() * 120, 24 + rand() * 60, rand() * Math.PI, 0, TAU);
    g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 260; i++) {
    const x = rand() * w,
      y = rand() * h;
    g.fillRect(x, y, 3, 1.5);
  }
  g.strokeStyle = 'rgba(70,140,50,0.35)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 160; i++) {
    const x = rand() * w,
      y = rand() * h;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - 2, y - 5);
    g.moveTo(x, y);
    g.lineTo(x + 2, y - 5);
    g.stroke();
  }
  g.restore();
  return { texture: Texture.from(c), x: -M, y: -M, w, h };
}

export type DecoKind = 'tree' | 'pine' | 'bush' | 'house' | 'stone' | 'fence';
/** Decorative props (anchor bottom-centre), drawn 96×110 with light from the top-left. */
export function decoTexture(kind: DecoKind, seed: number): Texture {
  return cached(`deco:${kind}:${seed}`, () => {
    const w = 96,
      h = 110;
    const [c, g] = canvas(w, h);
    const rand = lcg(seed);
    const d = new Draw(g, w / 2, h - 12, 2.4);
    const [gx, gy] = d.p(0, 0);
    if (kind === 'tree') {
      d.shadow(0, 0, 22, 9);
      g.fillStyle = '#7a4b25';
      g.beginPath();
      g.roundRect(gx - 4, gy - 30, 8, 30, 3);
      g.fill();
      g.stroke();
      const r = 22 + rand() * 6;
      d.dot(gx, gy - 40, r, '#3e9c48');
      g.stroke();
      d.dot(gx - r * 0.2, gy - 46, r * 0.7, '#5cc16a');
      d.dot(gx - r * 0.35, gy - 52, r * 0.3, '#8ddb8e');
    } else if (kind === 'pine') {
      d.shadow(0, 0, 18, 8);
      g.fillStyle = '#7a4b25';
      g.fillRect(gx - 3, gy - 14, 6, 14);
      for (let i = 0; i < 3; i++) {
        const y = gy - 10 - i * 18,
          rw = 24 - i * 5;
        d.face(
          [
            [gx - rw, y],
            [gx + rw, y],
            [gx, y - 26],
          ],
          i % 2 ? '#3e9c48' : '#4fb35b',
        );
      }
    } else if (kind === 'bush') {
      d.shadow(0, 0, 18, 7);
      d.dot(gx + 8, gy - 8, 11, '#3e9c48');
      g.stroke();
      d.dot(gx - 8, gy - 9, 12, '#4fb35b');
      g.stroke();
      d.dot(gx, gy - 14, 12, '#5cc16a');
      g.stroke();
      d.dot(gx - 4, gy - 18, 5, '#8ddb8e');
    } else if (kind === 'house') {
      d.shadow(0, 2, 26, 11);
      d.box(0, 0, 34, 26, 22, CONCRETE);
      // roof prism
      const m: Mat = { top: '#f0965a', front: '#e07a45', side: '#b95d31' };
      d.tent(0, 0, 40, 30, 16, m, false);
      // the tent helper sits on the ground; lift it: redraw at z via a translate
    } else if (kind === 'stone') {
      d.shadow(0, 0, 14, 6);
      g.beginPath();
      g.moveTo(gx - 12, gy);
      g.lineTo(gx - 10, gy - 10);
      g.lineTo(gx - 2, gy - 15);
      g.lineTo(gx + 9, gy - 11);
      g.lineTo(gx + 12, gy - 2);
      g.lineTo(gx + 6, gy + 1);
      g.closePath();
      g.fillStyle = '#9aa4af';
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(gx - 8, gy - 9);
      g.lineTo(gx - 2, gy - 13);
      g.lineTo(gx + 6, gy - 10);
      g.lineTo(gx - 3, gy - 6);
      g.closePath();
      g.fillStyle = '#cfd7df';
      g.fill();
    } else {
      // fence: three posts and two rails
      g.fillStyle = '#c48f58';
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.roundRect(gx + i * 22 - 3, gy - 20, 6, 20, 2);
        g.fill();
        g.stroke();
      }
      for (const z of [8, 15]) {
        g.beginPath();
        g.roundRect(gx - 26, gy - z - 2, 52, 4, 2);
        g.fillStyle = '#e5b77e';
        g.fill();
        g.stroke();
      }
    }
    return c;
  });
}

/** Sandbag barricade across a road (drawn along +x, rotated to the edge). */
export function barrierTexture(): Texture {
  return cached('barrier', () => {
    const w = 70,
      h = 70;
    const [c, g] = canvas(w, h);
    const d = new Draw(g, w / 2, h / 2 + 8, 2.2);
    d.shadow(0, 0, 30, 10, 0.2);
    for (let row = 0; row < 3; row++)
      for (let i = -2; i <= 2; i++) {
        if (row === 2 && Math.abs(i) > 1) continue;
        const off = row % 2 ? 6 : 0;
        d.box(i * 12 + off, 0, 12, 9, 7, SAND, row * 6.5);
      }
    // barbed wire on top
    g.strokeStyle = '#4a5563';
    g.lineWidth = 1.5;
    g.beginPath();
    for (let x = 6; x < w - 6; x += 8) {
      const [px, py] = d.p(x - w / 2, 0, 24);
      g.moveTo(px, py);
      g.lineTo(px + 8, py - 3);
      g.moveTo(px + 4, py - 4);
      g.lineTo(px + 4, py + 1);
    }
    g.stroke();
    return c;
  });
}

/** Land mine: dark disc with a red light. */
export function mineTexture(): Texture {
  return cached('mine', () => {
    const size = 48,
      cx = 24,
      cy = 24;
    const [c, g] = canvas(size, size);
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.fillStyle = 'rgba(20,40,30,0.2)';
    g.beginPath();
    g.ellipse(cx, cy + 4, 18, 9, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#3d4552';
    g.beginPath();
    g.ellipse(cx, cy + 2, 17, 10, 0, 0, TAU);
    g.fill();
    g.stroke();
    g.fillStyle = '#5b6573';
    g.beginPath();
    g.ellipse(cx, cy - 2, 17, 10, 0, 0, TAU);
    g.fill();
    g.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      g.fillStyle = '#8b96a5';
      g.beginPath();
      g.arc(cx + Math.cos(a) * 11, cy - 2 + Math.sin(a) * 6, 2, 0, TAU);
      g.fill();
    }
    g.fillStyle = '#ff4b4b';
    g.beginPath();
    g.arc(cx, cy - 3, 4.5, 0, TAU);
    g.fill();
    g.stroke();
    g.fillStyle = '#ffd0d0';
    g.beginPath();
    g.arc(cx - 1.5, cy - 4.5, 1.6, 0, TAU);
    g.fill();
    return c;
  });
}

/** Composes the node art into a small DOM canvas icon in the given colour (legend, intros, menus). */
export function nodeIcon(type: NodeType, level: Level = 1, color = '#3b82f6', size = 40): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = out.height = size * 2;
  out.style.width = out.style.height = size + 'px';
  const g = out.getContext('2d') as CanvasRenderingContext2D;
  const src = (t: Texture) => t.source.resource as HTMLCanvasElement;
  const draw = (c: HTMLCanvasElement, dy = 0) => {
    g.drawImage(c, 0, 0, c.width, c.height, size * 0.05, size * 0.05 + dy, size * 1.9, size * 1.9);
  };
  draw(src(tintedTexture(baseTexture(type, level), color)));
  draw(src(platformTexture(type, level)));
  draw(src(tintedTexture(detailTexture(type, level), color)));
  const rt = rotorTexture(type, level);
  if (rt) draw(src(tintedTexture(rt, color)), (ROTOR_Y[type] * size * 1.9) / SIZE);
  return out;
}

/** Pre-tinted copy of a grey-shaded white texture: multiply by the colour, keep the alpha. */
export function tintedTexture(base: Texture, color: string): Texture {
  const key = `tint:${base.uid}:${color}`;
  return cached(key, () => {
    const src = base.source.resource as HTMLCanvasElement;
    const [c, g] = canvas(src.width, src.height);
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(src, 0, 0);
    return c;
  });
}
