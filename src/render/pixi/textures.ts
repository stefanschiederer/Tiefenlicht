import { Texture } from 'pixi.js';
import type { NodeType, UnitType } from '@/data';
import type { Rock } from '@/sim/state';

const TAU = Math.PI * 2;
/** Texture pixel size per world unit (crisp when zoomed). */
export const TEX_SCALE = 2;
/** Node art is drawn for this base radius; sprites are scaled to the node's world radius. */
export const NODE_R = 32;

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return [c, c.getContext('2d') as CanvasRenderingContext2D];
}
function poly(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sides: number,
  rot: number,
): void {
  g.beginPath();
  for (let k = 0; k < sides; k++) {
    const a = rot + (k * TAU) / sides;
    if (k) g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  g.closePath();
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
/** Tiny soft dot for particles and plankton. */
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

type Level = 1 | 2 | 3;
const R = NODE_R * TEX_SCALE;
const SIZE = R * 3;
const C = SIZE / 2;

function hexPath(g: CanvasRenderingContext2D, x: number, y: number, r: number, rot = Math.PI / 6): void {
  poly(g, x, y, r, 6, rot);
}
/** Soft drop shadow + rim used under every node. */
function platformBase(g: CanvasRenderingContext2D, r: number): void {
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.7)';
  g.shadowBlur = 18;
  g.shadowOffsetY = 6;
  g.fillStyle = 'rgba(4,10,18,0.92)';
  g.beginPath();
  g.arc(C, C, r * 1.28, 0, TAU);
  g.fill();
  g.restore();
  const rim = g.createRadialGradient(C, C, r * 1.05, C, C, r * 1.3);
  rim.addColorStop(0, 'rgba(120,170,210,0)');
  rim.addColorStop(1, 'rgba(120,170,210,0.2)');
  g.fillStyle = rim;
  g.beginPath();
  g.arc(C, C, r * 1.3, 0, TAU);
  g.fill();
}
function bodyGradient(
  g: CanvasRenderingContext2D,
  r: number,
  light = '#1a3452',
  dark = '#050d18',
): CanvasGradient {
  const grd = g.createRadialGradient(C - r * 0.35, C - r * 0.4, r * 0.1, C, C, r * 1.05);
  grd.addColorStop(0, light);
  grd.addColorStop(1, dark);
  return grd;
}
function highlight(g: CanvasRenderingContext2D, r: number, a = 0.14): void {
  const hl = g.createRadialGradient(C - r * 0.4, C - r * 0.5, 0, C - r * 0.3, C - r * 0.4, r * 0.9);
  hl.addColorStop(0, `rgba(255,255,255,${a})`);
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl;
  g.beginPath();
  g.arc(C, C, r, 0, TAU);
  g.fill();
}

/** Dark body silhouette with shading (not tinted). Grows with the level. */
export function platformTexture(type: NodeType, level: Level = 1): Texture {
  return cached(`platform:${type}:${level}`, () => {
    const [c, g] = canvas(SIZE, SIZE);
    platformBase(g, R);
    g.fillStyle = bodyGradient(g, R);
    if (type === 'nest') {
      // organic pod: slightly squashed blob with lobes
      g.beginPath();
      for (let k = 0; k <= 40; k++) {
        const a = (k / 40) * TAU,
          rr = R * (0.95 + 0.05 * Math.sin(a * 5 + 1));
        if (k) g.lineTo(C + Math.cos(a) * rr, C + Math.sin(a) * rr * 0.92);
        else g.moveTo(C + Math.cos(a) * rr, C + Math.sin(a) * rr * 0.92);
      }
      g.closePath();
      g.fill();
      highlight(g, R);
      // vents (dark craters), count grows with level
      const vents = 2 + level;
      for (let k = 0; k < vents; k++) {
        const a = -Math.PI / 2 + (k * TAU) / vents,
          vx = C + Math.cos(a) * R * 0.55,
          vy = C + Math.sin(a) * R * 0.5;
        g.fillStyle = '#04090f';
        g.beginPath();
        g.ellipse(vx, vy, R * 0.16, R * 0.11, a + Math.PI / 2, 0, TAU);
        g.fill();
      }
    } else if (type === 'brut') {
      // hive: hex body with honeycomb shading
      g.fillStyle = bodyGradient(g, R, '#22334a', '#070e18');
      hexPath(g, C, C, R, 0);
      g.fill();
      highlight(g, R, 0.1);
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 2;
      const cellR = R * 0.22;
      for (let q = -2; q <= 2; q++)
        for (let rr = -2; rr <= 2; rr++) {
          const x = C + cellR * 1.75 * q + (rr % 2 ? cellR * 0.875 : 0),
            y = C + cellR * 1.5 * rr;
          if (Math.hypot(x - C, y - C) > R * 0.72) continue;
          hexPath(g, x, y, cellR * 0.92, 0);
          g.stroke();
        }
    } else if (type === 'bastion') {
      // fortress: thick hexagon with layered plates
      g.fillStyle = bodyGradient(g, R, '#2a3646', '#0a1018');
      hexPath(g, C, C, R * 1.02);
      g.fill();
      for (let k = 0; k < level; k++) {
        g.fillStyle = `rgba(0,0,0,${0.18 + k * 0.05})`;
        hexPath(g, C, C, R * (0.86 - k * 0.2));
        g.fill();
        g.strokeStyle = 'rgba(160,190,220,0.14)';
        g.lineWidth = 3;
        hexPath(g, C, C, R * (0.86 - k * 0.2));
        g.stroke();
      }
      highlight(g, R, 0.1);
    } else if (type === 'strom') {
      // turbine housing: ring with an open centre
      g.fillStyle = bodyGradient(g, R, '#173a52', '#061220');
      g.beginPath();
      g.arc(C, C, R, 0, TAU);
      g.fill();
      g.globalCompositeOperation = 'destination-out';
      g.beginPath();
      g.arc(C, C, R * 0.62, 0, TAU);
      g.fill();
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgba(6,14,24,0.85)';
      g.beginPath();
      g.arc(C, C, R * 0.62, 0, TAU);
      g.fill();
      highlight(g, R, 0.12);
    } else if (type === 'waechter') {
      // turret: square base with chamfered corners and a round mount
      g.fillStyle = bodyGradient(g, R, '#2a3242', '#0a0e16');
      poly(g, C, C, R * 1.05, 8, Math.PI / 8);
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.beginPath();
      g.arc(C, C, R * 0.7, 0, TAU);
      g.fill();
      highlight(g, R, 0.1);
    } else {
      // crystal fountain: faceted base
      g.fillStyle = bodyGradient(g, R, '#1d3450', '#060f1c');
      poly(g, C, C, R, 10, 0);
      g.fill();
      highlight(g, R, 0.16);
    }
    return c;
  });
}

/** White detail layer per type and level (tinted with the owner colour). */
export function detailTexture(type: NodeType, level: Level = 1): Texture {
  return cached(`detail:${type}:${level}`, () => {
    const [c, g] = canvas(SIZE, SIZE);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = '#fff';
    g.fillStyle = '#fff';
    const s = R / 24;
    if (type === 'nest') {
      g.globalAlpha = 0.9;
      g.lineWidth = 2.4 * s;
      g.beginPath();
      for (let k = 0; k <= 40; k++) {
        const a = (k / 40) * TAU,
          rr = R * (0.95 + 0.05 * Math.sin(a * 5 + 1));
        if (k) g.lineTo(C + Math.cos(a) * rr, C + Math.sin(a) * rr * 0.92);
        else g.moveTo(C + Math.cos(a) * rr, C + Math.sin(a) * rr * 0.92);
      }
      g.closePath();
      g.stroke();
      // vent rims
      const vents = 2 + level;
      g.globalAlpha = 0.85;
      g.lineWidth = 1.8 * s;
      for (let k = 0; k < vents; k++) {
        const a = -Math.PI / 2 + (k * TAU) / vents;
        g.beginPath();
        g.ellipse(
          C + Math.cos(a) * R * 0.55,
          C + Math.sin(a) * R * 0.5,
          R * 0.17,
          R * 0.12,
          a + Math.PI / 2,
          0,
          TAU,
        );
        g.stroke();
      }
      // veins
      g.globalAlpha = 0.28;
      g.lineWidth = 1.2 * s;
      for (let k = 0; k < 6; k++) {
        const a = k * (TAU / 6) + 0.3;
        g.beginPath();
        g.moveTo(C + Math.cos(a) * R * 0.2, C + Math.sin(a) * R * 0.2);
        g.quadraticCurveTo(
          C + Math.cos(a + 0.3) * R * 0.5,
          C + Math.sin(a + 0.3) * R * 0.5,
          C + Math.cos(a) * R * 0.85,
          C + Math.sin(a) * R * 0.8,
        );
        g.stroke();
      }
    } else if (type === 'brut') {
      g.globalAlpha = 0.95;
      g.lineWidth = 2.6 * s;
      hexPath(g, C, C, R, 0);
      g.stroke();
      // brood capsules (glowing eggs) in the cells, more with level
      const cellR = R * 0.22;
      const slots: [number, number][] = [];
      for (let q = -2; q <= 2; q++)
        for (let rr = -2; rr <= 2; rr++) {
          const x = C + cellR * 1.75 * q + (rr % 2 ? cellR * 0.875 : 0),
            y = C + cellR * 1.5 * rr;
          if (Math.hypot(x - C, y - C) <= R * 0.72) slots.push([x, y]);
        }
      slots.sort((a, b) => Math.hypot(a[0] - C, a[1] - C) - Math.hypot(b[0] - C, b[1] - C));
      const n = Math.min(slots.length, 3 + level * 4);
      for (let i = 0; i < n; i++) {
        const [x, y] = slots[i] as [number, number];
        const eg = g.createRadialGradient(x - cellR * 0.2, y - cellR * 0.2, 0, x, y, cellR * 0.7);
        eg.addColorStop(0, 'rgba(255,255,255,1)');
        eg.addColorStop(1, 'rgba(255,255,255,0.35)');
        g.globalAlpha = 0.9;
        g.fillStyle = eg;
        g.beginPath();
        g.arc(x, y, cellR * 0.62, 0, TAU);
        g.fill();
      }
      g.fillStyle = '#fff';
    } else if (type === 'bastion') {
      g.globalAlpha = 0.95;
      g.lineWidth = 4.5 * s;
      hexPath(g, C, C, R * 1.02);
      g.stroke();
      // rivets and plate seams; more plates with level
      for (let k = 0; k < level; k++) {
        const rr = R * (0.86 - k * 0.2);
        g.globalAlpha = 0.5;
        g.lineWidth = 1.6 * s;
        hexPath(g, C, C, rr);
        g.stroke();
        g.globalAlpha = 0.95;
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 6 + (i * Math.PI) / 3;
          g.beginPath();
          g.arc(C + Math.cos(a) * rr, C + Math.sin(a) * rr, 2.4 * s, 0, TAU);
          g.fill();
        }
      }
      // keep: central bunker
      g.globalAlpha = 0.9;
      hexPath(g, C, C, R * 0.28);
      g.fill();
    } else if (type === 'strom') {
      g.globalAlpha = 0.9;
      g.lineWidth = 2.6 * s;
      g.beginPath();
      g.arc(C, C, R, 0, TAU);
      g.stroke();
      g.globalAlpha = 0.4;
      g.lineWidth = 1.4 * s;
      g.beginPath();
      g.arc(C, C, R * 0.62, 0, TAU);
      g.stroke();
      // flow marks on the housing, count by level
      g.globalAlpha = 0.6;
      for (let k = 0; k < 4 + level * 2; k++) {
        const a = (k * TAU) / (4 + level * 2);
        g.beginPath();
        g.moveTo(C + Math.cos(a) * R * 0.7, C + Math.sin(a) * R * 0.7);
        g.lineTo(C + Math.cos(a + 0.18) * R * 0.92, C + Math.sin(a + 0.18) * R * 0.92);
        g.stroke();
      }
    } else if (type === 'waechter') {
      g.globalAlpha = 0.95;
      g.lineWidth = 2.6 * s;
      poly(g, C, C, R * 1.05, 8, Math.PI / 8);
      g.stroke();
      g.globalAlpha = 0.5;
      g.lineWidth = 1.4 * s;
      g.beginPath();
      g.arc(C, C, R * 0.7, 0, TAU);
      g.stroke();
      // corner emplacements, more with level
      g.globalAlpha = 0.9;
      for (let k = 0; k < 2 + level; k++) {
        const a = Math.PI / 8 + (k * TAU) / (2 + level) + 0.4;
        g.beginPath();
        g.arc(C + Math.cos(a) * R * 0.88, C + Math.sin(a) * R * 0.88, 3 * s, 0, TAU);
        g.fill();
      }
    } else {
      g.globalAlpha = 0.9;
      g.lineWidth = 2.4 * s;
      poly(g, C, C, R, 10, 0);
      g.stroke();
      // crystal shards radiating outward, more with level
      const shards = 4 + level * 2;
      for (let k = 0; k < shards; k++) {
        const a = (k * TAU) / shards + 0.15,
          len = R * (0.6 + 0.25 * ((k * 7) % 3) * 0.5);
        g.globalAlpha = 0.75;
        g.beginPath();
        g.moveTo(C + Math.cos(a - 0.12) * R * 0.25, C + Math.sin(a - 0.12) * R * 0.25);
        g.lineTo(C + Math.cos(a) * len, C + Math.sin(a) * len);
        g.lineTo(C + Math.cos(a + 0.12) * R * 0.25, C + Math.sin(a + 0.12) * R * 0.25);
        g.closePath();
        g.fill();
      }
      g.globalAlpha = 1;
      const og = g.createRadialGradient(C - R * 0.06, C - R * 0.06, 0, C, C, R * 0.3);
      og.addColorStop(0, 'rgba(255,255,255,1)');
      og.addColorStop(1, 'rgba(255,255,255,0.5)');
      g.fillStyle = og;
      g.beginPath();
      g.arc(C, C, R * 0.3, 0, TAU);
      g.fill();
      g.fillStyle = '#fff';
    }
    // core light (all types except quelle which has its orb)
    if (type !== 'quelle') {
      g.globalAlpha = 0.95;
      g.beginPath();
      g.arc(C, C, R * (type === 'bastion' ? 0.14 : 0.18), 0, TAU);
      g.fill();
    }
    return c;
  });
}

/** White rotating layer per type (tinted); null for types without one. */
export function rotorTexture(type: NodeType, level: Level = 1): Texture | null {
  if (type === 'bastion') return null;
  return cached(`rotor:${type}:${level}`, () => {
    const [c, g] = canvas(SIZE, SIZE);
    g.lineCap = 'round';
    g.strokeStyle = '#fff';
    g.fillStyle = '#fff';
    const s = R / 24;
    if (type === 'nest') {
      // drifting spores around the core
      g.globalAlpha = 0.8;
      for (let k = 0; k < 3 + level; k++) {
        const a = (k * TAU) / (3 + level);
        g.beginPath();
        g.arc(C + Math.cos(a) * R * 0.36, C + Math.sin(a) * R * 0.34, 1.8 * s, 0, TAU);
        g.fill();
      }
    } else if (type === 'brut') {
      // slowly turning comb glow ring
      g.globalAlpha = 0.45;
      g.lineWidth = 2 * s;
      for (let k = 0; k < 3; k++) {
        const a0 = (k * TAU) / 3;
        g.beginPath();
        g.arc(C, C, R * 0.5, a0, a0 + 1.2);
        g.stroke();
      }
    } else if (type === 'strom') {
      // turbine blades inside the housing
      const blades = 3 + (level - 1);
      g.globalAlpha = 0.95;
      for (let k = 0; k < blades; k++) {
        const a = (k * TAU) / blades;
        g.beginPath();
        g.moveTo(C + Math.cos(a) * R * 0.12, C + Math.sin(a) * R * 0.12);
        g.quadraticCurveTo(
          C + Math.cos(a + 0.5) * R * 0.4,
          C + Math.sin(a + 0.5) * R * 0.4,
          C + Math.cos(a + 0.9) * R * 0.56,
          C + Math.sin(a + 0.9) * R * 0.56,
        );
        g.lineTo(C + Math.cos(a + 0.6) * R * 0.56, C + Math.sin(a + 0.6) * R * 0.56);
        g.quadraticCurveTo(
          C + Math.cos(a + 0.25) * R * 0.32,
          C + Math.sin(a + 0.25) * R * 0.32,
          C + Math.cos(a - 0.2) * R * 0.12,
          C + Math.sin(a - 0.2) * R * 0.12,
        );
        g.closePath();
        g.fill();
      }
      g.beginPath();
      g.arc(C, C, R * 0.12, 0, TAU);
      g.fill();
    } else if (type === 'waechter') {
      // cannon: barrel(s) with muzzle, longer with level
      g.globalAlpha = 0.95;
      const len = R * (0.8 + level * 0.1),
        w = 4.6 * s;
      const barrels = level >= 3 ? [-w * 0.8, w * 0.8] : [0];
      for (const off of barrels) {
        g.beginPath();
        g.moveTo(C, C + off - w / 2);
        g.lineTo(C + len, C + off - w / 2);
        g.lineTo(C + len, C + off + w / 2);
        g.lineTo(C, C + off + w / 2);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(0,0,0,0.7)';
        g.fillRect(C + len - 3 * s, C + off - w / 2 + 1, 3 * s, w - 2);
        g.fillStyle = '#fff';
      }
      // mount
      g.fillStyle = '#0a1220';
      g.beginPath();
      g.arc(C, C, R * 0.3, 0, TAU);
      g.fill();
      g.fillStyle = '#fff';
      g.globalAlpha = 0.6;
      g.beginPath();
      g.arc(C, C, R * 0.3, 0, TAU);
      g.stroke();
    } else if (type === 'quelle') {
      // orbiting light orbs
      g.globalAlpha = 0.9;
      for (let k = 0; k < 2 + level; k++) {
        const a = (k * TAU) / (2 + level);
        g.beginPath();
        g.arc(C + Math.cos(a) * R * 0.72, C + Math.sin(a) * R * 0.72, 2.4 * s, 0, TAU);
        g.fill();
      }
    }
    return c;
  });
}

/** Level ring (white, tinted). */
export function ringTexture(): Texture {
  return cached('ring', () => {
    const [c, g] = canvas(SIZE, SIZE);
    g.strokeStyle = '#fff';
    g.lineWidth = 1.4 * (R / 24);
    g.beginPath();
    g.arc(C, C, R * 1.14, 0, TAU);
    g.stroke();
    return c;
  });
}

/** Unit silhouettes (white, tinted), 24 px texture for a ~6 world-unit sprite. */
export function unitTexture(unit: UnitType): Texture {
  return cached('unit:' + unit, () => {
    const size = 24,
      s = 2.2,
      cx = 12,
      cy = 12;
    const [c, g] = canvas(size, size);
    g.fillStyle = '#fff';
    g.translate(cx, cy);
    if (unit === 'sporen') {
      g.beginPath();
      g.arc(0, 0, 1.6 * s, 0, TAU);
      g.fill();
    } else if (unit === 'drohnen') {
      g.beginPath();
      g.moveTo(2.6 * s, 0);
      g.lineTo(-1.6 * s, 2 * s);
      g.lineTo(-0.6 * s, 0);
      g.lineTo(-1.6 * s, -2 * s);
      g.closePath();
      g.fill();
    } else if (unit === 'panzer') {
      poly(g, 0, 0, 2.7 * s, 6, 0);
      g.fill();
      g.fillStyle = 'rgba(0,0,0,.45)';
      poly(g, 0, 0, 1.3 * s, 6, 0);
      g.fill();
    } else if (unit === 'pfeile') {
      g.beginPath();
      g.moveTo(4 * s, 0);
      g.lineTo(-3 * s, 1.1 * s);
      g.lineTo(-3 * s, -1.1 * s);
      g.closePath();
      g.fill();
    } else if (unit === 'stachel') {
      g.beginPath();
      g.moveTo(3 * s, 0);
      g.lineTo(0.7 * s, 0.9 * s);
      g.lineTo(0, 3 * s);
      g.lineTo(-0.7 * s, 0.9 * s);
      g.lineTo(-3 * s, 0);
      g.lineTo(-0.7 * s, -0.9 * s);
      g.lineTo(0, -3 * s);
      g.lineTo(0.7 * s, -0.9 * s);
      g.closePath();
      g.fill();
    } else {
      g.beginPath();
      g.arc(0, 0, 2 * s, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)';
      g.beginPath();
      g.arc(-0.5 * s, -0.5 * s, 0.7 * s, 0, TAU);
      g.fill();
    }
    return c;
  });
}

/** Renders a rock cluster (world units) into a texture; returns its world-space top-left. */
export function rockClusterTexture(
  cluster: Rock[],
  seed: number,
): { texture: Texture; x: number; y: number; w: number; h: number } {
  let rnd = seed | 1;
  const rand = () => {
    rnd = (rnd * 1103515245 + 12345) & 0x7fffffff;
    return rnd / 0x7fffffff;
  };
  const pad = 40;
  const minX = Math.min(...cluster.map((p) => p.x - p.r)) - pad,
    minY = Math.min(...cluster.map((p) => p.y - p.r)) - pad,
    maxX = Math.max(...cluster.map((p) => p.x + p.r)) + pad,
    maxY = Math.max(...cluster.map((p) => p.y + p.r)) + pad;
  const w = maxX - minX,
    h = maxY - minY;
  const [c, g] = canvas(w * TEX_SCALE, h * TEX_SCALE);
  g.scale(TEX_SCALE, TEX_SCALE);
  g.translate(-minX, -minY);
  const unionPath = (padR: number) => {
    g.beginPath();
    for (const p of cluster) {
      g.moveTo(p.x + p.r + padR, p.y);
      g.arc(p.x, p.y, p.r + padR, 0, TAU);
    }
  };
  const cx = cluster.reduce((s, p) => s + p.x, 0) / cluster.length,
    cy = cluster.reduce((s, p) => s + p.y, 0) / cluster.length,
    ext = Math.max(...cluster.map((p) => Math.hypot(p.x - cx, p.y - cy) + p.r));
  // drop shadow / depth
  g.save();
  g.shadowColor = 'rgba(0,0,0,.85)';
  g.shadowBlur = 28;
  g.shadowOffsetY = 6;
  g.fillStyle = '#060e18';
  unionPath(6);
  g.fill();
  g.restore();
  g.fillStyle = 'rgba(120,175,210,.22)';
  unionPath(3);
  g.fill();
  const rg = g.createRadialGradient(cx - ext * 0.35, cy - ext * 0.4, ext * 0.05, cx, cy, ext);
  rg.addColorStop(0, '#1a3550');
  rg.addColorStop(1, '#091522');
  g.fillStyle = rg;
  unionPath(0);
  g.fill();
  g.save();
  unionPath(0);
  g.clip();
  for (const p of cluster) {
    for (let i = 0; i < 22; i++) {
      const a = rand() * TAU,
        d = rand() * p.r * 0.95;
      g.fillStyle = rand() < 0.7 ? 'rgba(0,0,0,.24)' : 'rgba(150,200,230,.08)';
      g.beginPath();
      g.arc(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 1.5 + rand() * 4, 0, TAU);
      g.fill();
    }
    // rim light top-left
    const rl = g.createRadialGradient(p.x - p.r * 0.4, p.y - p.r * 0.5, p.r * 0.2, p.x, p.y, p.r);
    rl.addColorStop(0, 'rgba(140,200,240,.16)');
    rl.addColorStop(1, 'rgba(140,200,240,0)');
    g.fillStyle = rl;
    g.beginPath();
    g.arc(p.x, p.y, p.r, 0, TAU);
    g.fill();
  }
  g.restore();
  // Not cached: each level builds its own rock textures and releases them on the next setLevel.
  return { texture: Texture.from(c, true), x: minX, y: minY, w, h };
}

/** Screen background gradient (stretched). */
export function backgroundTexture(): Texture {
  return cached('bg', () => {
    const [c, g] = canvas(64, 512);
    const bg = g.createLinearGradient(0, 0, 0, 512);
    bg.addColorStop(0, '#0a1a2e');
    bg.addColorStop(0.5, '#061323');
    bg.addColorStop(1, '#02070e');
    g.fillStyle = bg;
    g.fillRect(0, 0, 64, 512);
    return c;
  });
}

/** Soft light shaft (white, additive). */
export function shaftTexture(): Texture {
  return cached('shaft', () => {
    const [c, g] = canvas(128, 512);
    const grd = g.createLinearGradient(0, 0, 0, 512);
    grd.addColorStop(0, 'rgba(255,255,255,0.55)');
    grd.addColorStop(0.7, 'rgba(255,255,255,0.12)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(44, 0);
    g.lineTo(84, 0);
    g.lineTo(128, 512);
    g.lineTo(0, 512);
    g.closePath();
    g.fill();
    const soft = g.createLinearGradient(0, 0, 128, 0);
    soft.addColorStop(0, 'rgba(0,0,0,1)');
    soft.addColorStop(0.3, 'rgba(0,0,0,0)');
    soft.addColorStop(0.7, 'rgba(0,0,0,0)');
    soft.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = soft;
    g.fillRect(0, 0, 128, 512);
    return c;
  });
}

/** Procedural coral / kelp silhouettes for the map border (white, tinted). */
export function plantTexture(kind: 'fan' | 'kelp' | 'tube', seed: number): Texture {
  return cached(`plant:${kind}:${seed}`, () => {
    let rnd = seed | 1;
    const rand = () => {
      rnd = (rnd * 1103515245 + 12345) & 0x7fffffff;
      return rnd / 0x7fffffff;
    };
    const w = 160,
      h = 200;
    const [c, g] = canvas(w, h);
    g.strokeStyle = '#fff';
    g.fillStyle = '#fff';
    g.lineCap = 'round';
    if (kind === 'fan') {
      // sea fan: branching from the base
      const branch = (x: number, y: number, a: number, len: number, depth: number) => {
        if (depth === 0 || len < 4) return;
        const nx = x + Math.cos(a) * len,
          ny = y + Math.sin(a) * len;
        g.lineWidth = depth * 1.1;
        g.globalAlpha = 0.55 + depth * 0.08;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(nx, ny);
        g.stroke();
        const n = 2 + (rand() < 0.4 ? 1 : 0);
        for (let i = 0; i < n; i++)
          branch(nx, ny, a + (rand() - 0.5) * 1.3, len * (0.62 + rand() * 0.2), depth - 1);
      };
      branch(w / 2, h - 4, -Math.PI / 2, 46, 5);
    } else if (kind === 'kelp') {
      for (let k = 0; k < 3; k++) {
        const x0 = w * (0.3 + k * 0.2);
        g.lineWidth = 3 - k * 0.5;
        g.globalAlpha = 0.7;
        g.beginPath();
        g.moveTo(x0, h);
        let x = x0;
        for (let y = h; y > 20 + k * 30; y -= 12) {
          x += (rand() - 0.5) * 10;
          g.lineTo(x, y);
        }
        g.stroke();
        // leaves
        g.globalAlpha = 0.5;
        for (let y = h - 20; y > 40 + k * 30; y -= 22) {
          const dir = rand() < 0.5 ? -1 : 1;
          g.beginPath();
          g.ellipse(x0 + dir * 10, y, 12, 4, dir * 0.6, 0, TAU);
          g.fill();
        }
      }
    } else {
      // tube sponges
      for (let k = 0; k < 4; k++) {
        const x = 30 + k * 32 + rand() * 10,
          th = 60 + rand() * 90,
          r = 7 + rand() * 5;
        g.globalAlpha = 0.65;
        g.beginPath();
        g.moveTo(x - r, h);
        g.lineTo(x - r * 0.8, h - th);
        g.arc(x, h - th, r * 0.8, Math.PI, 0);
        g.lineTo(x + r, h);
        g.closePath();
        g.fill();
        g.globalAlpha = 0.9;
        g.fillStyle = '#000';
        g.beginPath();
        g.ellipse(x, h - th, r * 0.45, r * 0.25, 0, 0, TAU);
        g.fill();
        g.fillStyle = '#fff';
      }
    }
    return c;
  });
}

/** Composes the node art into a small DOM canvas icon in the given colour (legend, intros, menus). */
export function nodeIcon(type: NodeType, level: Level = 1, color = '#ffc45a', size = 40): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = out.height = size * 2;
  out.style.width = out.style.height = size + 'px';
  const g = out.getContext('2d') as CanvasRenderingContext2D;
  const tinted = (tex: Texture): HTMLCanvasElement => {
    const src = tex.source.resource as HTMLCanvasElement;
    const t = document.createElement('canvas');
    t.width = src.width;
    t.height = src.height;
    const tg = t.getContext('2d') as CanvasRenderingContext2D;
    tg.drawImage(src, 0, 0);
    tg.globalCompositeOperation = 'source-in';
    tg.fillStyle = color;
    tg.fillRect(0, 0, t.width, t.height);
    return t;
  };
  const platform = platformTexture(type, level).source.resource as HTMLCanvasElement;
  // glow
  const grd = g.createRadialGradient(size, size, 0, size, size, size);
  grd.addColorStop(0, color + '66');
  grd.addColorStop(1, color + '00');
  g.fillStyle = grd;
  g.fillRect(0, 0, size * 2, size * 2);
  const draw = (c: HTMLCanvasElement, alpha = 1) => {
    g.globalAlpha = alpha;
    g.drawImage(c, 0, 0, c.width, c.height, size * 0.2, size * 0.2, size * 1.6, size * 1.6);
    g.globalAlpha = 1;
  };
  draw(platform);
  draw(tinted(detailTexture(type, level)));
  const rt = rotorTexture(type, level);
  if (rt) draw(tinted(rt), 0.95);
  return out;
}
