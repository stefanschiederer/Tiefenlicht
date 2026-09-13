import { Texture } from 'pixi.js';
import type { NodeType, UnitType } from '@/data';
import type { Rock } from '@/sim/state';

const TAU = Math.PI * 2;
/** Texture pixel size per world unit (crisp when zoomed). */
export const TEX_SCALE = 2;
/** Node art is drawn for this base radius; sprites are scaled to the node's world radius. */
export const NODE_R = 32;
type Level = 1 | 2 | 3;
const R = NODE_R * TEX_SCALE;
const SIZE = R * 3;
const C = SIZE / 2;
/** Dark outline colour of the lagoon style. */
export const INK = '#10324a';

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
function radial(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  inner: string,
  outer: string,
  ox = -0.3,
  oy = -0.35,
): CanvasGradient {
  const grd = g.createRadialGradient(x + r * ox, y + r * oy, r * 0.1, x, y, r * 1.05);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  return grd;
}
function shadow(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  g.fillStyle = 'rgba(16,50,74,0.22)';
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.fill();
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

/* ------------------------------------------------------------------ nodes: lagoon style
 * platform = the coloured body of the building (its own material colour, dark outline), untinted.
 * detail   = white parts tinted with the owner colour (base ring, cap, lights, eggs, pearl glow).
 * rotor    = white, tinted, animated (fish, blades, light beam, orbiting pearls).
 */
export function platformTexture(type: NodeType, level: Level = 1): Texture {
  return cached(`platform:${type}:${level}`, () => {
    const [c, g] = canvas(SIZE, SIZE);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const s = R / 24;
    shadow(g, C, C + R * 0.95, R * 1.05, R * 0.24);
    if (type === 'nest') {
      // coral dome with spore vents; more vents with level
      g.fillStyle = radial(g, C, C + R * 0.1, R, '#ffd46a', '#e88a1a');
      g.strokeStyle = '#8a4a10';
      g.lineWidth = 4 * s;
      g.beginPath();
      g.moveTo(C - R * 0.95, C + R * 0.8);
      g.bezierCurveTo(C - R * 1.1, C - R * 0.2, C - R * 0.55, C - R * 0.85, C, C - R * 0.9);
      g.bezierCurveTo(C + R * 0.55, C - R * 0.85, C + R * 1.1, C - R * 0.2, C + R * 0.95, C + R * 0.8);
      g.closePath();
      g.fill();
      g.stroke();
      const vents = 2 + level;
      for (let k = 0; k < vents; k++) {
        const a = -Math.PI / 2 + (k - (vents - 1) / 2) * 0.75;
        const vx = C + Math.cos(a) * R * 0.5,
          vy = C + R * 0.05 + Math.sin(a) * R * 0.45;
        g.fillStyle = '#5a2d08';
        g.beginPath();
        g.ellipse(vx, vy, R * 0.17, R * 0.13, 0, 0, TAU);
        g.fill();
      }
      // small coral branches on top (pink)
      g.strokeStyle = '#ff8fa8';
      g.lineWidth = 5 * s;
      for (const [dx, dir] of [
        [-0.55, -1],
        [0.55, 1],
      ] as [number, number][]) {
        g.beginPath();
        g.moveTo(C + R * dx, C - R * 0.55);
        g.quadraticCurveTo(C + R * (dx + dir * 0.15), C - R * 0.95, C + R * (dx + dir * 0.05), C - R * 1.2);
        g.stroke();
      }
    } else if (type === 'brut') {
      // jellyfish colony: translucent pink bell, tentacles hanging
      g.strokeStyle = '#ff6fa3';
      g.lineWidth = 4 * s;
      g.globalAlpha = 0.85;
      for (let k = 0; k < 4; k++) {
        const x = C - R * 0.6 + k * R * 0.4;
        g.beginPath();
        g.moveTo(x, C + R * 0.45);
        g.bezierCurveTo(x + R * 0.1, C + R * 0.75, x - R * 0.12, C + R * 0.95, x + R * 0.05, C + R * 1.25);
        g.stroke();
      }
      g.globalAlpha = 1;
      g.fillStyle = radial(g, C, C - R * 0.1, R, '#ffe0ef', '#ff6fa3');
      g.strokeStyle = '#c2336d';
      g.beginPath();
      g.moveTo(C - R, C + R * 0.35);
      g.bezierCurveTo(C - R, C - R * 0.75, C - R * 0.5, C - R * 1.05, C, C - R * 1.05);
      g.bezierCurveTo(C + R * 0.5, C - R * 1.05, C + R, C - R * 0.75, C + R, C + R * 0.35);
      g.quadraticCurveTo(C, C + R * 0.7, C - R, C + R * 0.35);
      g.closePath();
      g.fill();
      g.stroke();
    } else if (type === 'bastion') {
      // shell fortress: plated hexagon with spikes
      g.strokeStyle = '#2d4257';
      g.lineWidth = 6 * s;
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + (k * Math.PI) / 2;
        g.beginPath();
        g.moveTo(C + Math.cos(a) * R * 0.95, C + Math.sin(a) * R * 0.95);
        g.lineTo(C + Math.cos(a) * R * 1.25, C + Math.sin(a) * R * 1.25);
        g.stroke();
      }
      g.fillStyle = radial(g, C, C, R, '#d6dfe8', '#5f7a94');
      g.lineWidth = 5 * s;
      poly(g, C, C, R * 1.02, 6, Math.PI / 6);
      g.fill();
      g.stroke();
      for (let k = 0; k < level; k++) {
        g.strokeStyle = 'rgba(45,66,87,0.55)';
        g.lineWidth = 3 * s;
        poly(g, C, C, R * (0.82 - k * 0.2), 6, Math.PI / 6);
        g.stroke();
      }
    } else if (type === 'strom') {
      // whirlpool turbine: turquoise ring around a deep-blue eye
      g.fillStyle = radial(g, C, C, R, '#bff3ff', '#1a89b3');
      g.strokeStyle = INK;
      g.lineWidth = 5 * s;
      g.beginPath();
      g.arc(C, C, R, 0, TAU);
      g.fill();
      g.stroke();
      g.fillStyle = '#0b3d5c';
      g.beginPath();
      g.arc(C, C, R * 0.62, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 3 * s;
      for (let k = 0; k < 2 + level; k++) {
        const a0 = (k * TAU) / (2 + level);
        g.beginPath();
        g.arc(C, C, R * 0.82, a0, a0 + 0.8);
        g.stroke();
      }
    } else if (type === 'waechter') {
      // lighthouse turret: cream tower with red stripes, lamp on top
      g.fillStyle = '#f7f1e3';
      g.strokeStyle = '#2d4257';
      g.lineWidth = 4 * s;
      g.beginPath();
      g.moveTo(C - R * 0.5, C + R * 0.9);
      g.lineTo(C - R * 0.38, C - R * 0.55);
      g.lineTo(C + R * 0.38, C - R * 0.55);
      g.lineTo(C + R * 0.5, C + R * 0.9);
      g.closePath();
      g.fill();
      g.stroke();
      g.strokeStyle = '#ff4f7d';
      g.lineWidth = 9 * s;
      for (let k = 0; k < 1 + level; k++) {
        const y = C + R * 0.55 - k * R * 0.45;
        g.beginPath();
        g.moveTo(C - R * 0.4, y);
        g.lineTo(C + R * 0.4, y);
        g.stroke();
      }
      g.fillStyle = '#2d4257';
      g.beginPath();
      g.roundRect(C - R * 0.55, C - R * 0.72, R * 1.1, R * 0.18, 3 * s);
      g.fill();
      g.fillStyle = '#fff5a8';
      g.strokeStyle = '#2d4257';
      g.lineWidth = 4 * s;
      g.beginPath();
      g.roundRect(C - R * 0.4, C - R * 1.05, R * 0.8, R * 0.36, 4 * s);
      g.fill();
      g.stroke();
      g.fillStyle = '#2d4257';
      g.beginPath();
      g.moveTo(C - R * 0.14, C - R * 1.05);
      g.lineTo(C + R * 0.14, C - R * 1.05);
      g.lineTo(C, C - R * 1.28);
      g.closePath();
      g.fill();
    } else {
      // giant clam: orange scalloped shell, open
      g.fillStyle = '#ff9a5c';
      g.strokeStyle = '#b0451a';
      g.lineWidth = 4 * s;
      g.beginPath();
      g.moveTo(C - R * 1.05, C + R * 0.35);
      g.bezierCurveTo(C - R * 1.05, C - R * 0.15, C - R * 0.5, C - R * 0.25, C, C - R * 0.25);
      g.bezierCurveTo(C + R * 0.5, C - R * 0.25, C + R * 1.05, C - R * 0.15, C + R * 1.05, C + R * 0.35);
      g.quadraticCurveTo(C, C + R * 0.8, C - R * 1.05, C + R * 0.35);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = '#ffc48a';
      g.beginPath();
      g.moveTo(C - R * 0.98, C + R * 0.28);
      g.bezierCurveTo(C - R * 0.7, C - R * 0.5, C - R * 0.2, C - R * 1.05, C, C - R * 1.1);
      g.bezierCurveTo(C + R * 0.2, C - R * 1.05, C + R * 0.7, C - R * 0.5, C + R * 0.98, C + R * 0.28);
      g.quadraticCurveTo(C, C + R * 0.05, C - R * 0.98, C + R * 0.28);
      g.closePath();
      g.fill();
      g.stroke();
      g.strokeStyle = 'rgba(176,69,26,0.55)';
      g.lineWidth = 2 * s;
      for (let k = 0; k < 3 + level; k++) {
        const t = (k + 1) / (4 + level);
        g.beginPath();
        g.moveTo(C - R * 0.98 + R * 1.96 * t, C + R * 0.2);
        g.quadraticCurveTo(C - R * 0.98 + R * 1.96 * t * 0.9 + R * 0.1, C - R * 0.5, C, C - R * 1.05);
        g.stroke();
      }
    }
    return c;
  });
}

export function detailTexture(type: NodeType, level: Level = 1): Texture {
  return cached(`detail:${type}:${level}`, () => {
    const [c, g] = canvas(SIZE, SIZE);
    const s = R / 24;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.fillStyle = '#fff';
    g.strokeStyle = '#fff';
    // owner base ring under every building
    g.globalAlpha = 0.95;
    g.lineWidth = 5 * s;
    g.beginPath();
    g.ellipse(C, C + R * 0.95, R * 1.15, R * 0.3, 0, 0, TAU);
    g.stroke();
    g.globalAlpha = 1;
    if (type === 'nest') {
      const vents = 2 + level;
      for (let k = 0; k < vents; k++) {
        const a = -Math.PI / 2 + (k - (vents - 1) / 2) * 0.75;
        g.beginPath();
        g.arc(C + Math.cos(a) * R * 0.5, C + R * 0.05 + Math.sin(a) * R * 0.45, R * 0.075, 0, TAU);
        g.fill();
      }
    } else if (type === 'brut') {
      const eggs = 3 + level * 2;
      for (let k = 0; k < eggs; k++) {
        const a = (k / eggs) * TAU,
          r = R * (0.3 + 0.15 * (k % 2));
        g.beginPath();
        g.arc(C + Math.cos(a) * r, C - R * 0.15 + Math.sin(a) * r * 0.6, R * 0.1, 0, TAU);
        g.fill();
      }
    } else if (type === 'bastion') {
      g.beginPath();
      g.arc(C, C, R * 0.24, 0, TAU);
      g.fill();
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + (k * Math.PI) / 3;
        g.beginPath();
        g.arc(C + Math.cos(a) * R * 0.82, C + Math.sin(a) * R * 0.82, 3 * s, 0, TAU);
        g.fill();
      }
    } else if (type === 'strom') {
      g.beginPath();
      g.arc(C, C, R * 0.12, 0, TAU);
      g.fill();
    } else if (type === 'waechter') {
      g.beginPath();
      g.arc(C, C - R * 0.87, R * 0.13, 0, TAU);
      g.fill();
    } else {
      const grd = g.createRadialGradient(C - R * 0.05, C + R * 0.15, 0, C, C + R * 0.2, R * 0.32);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.7, 'rgba(255,255,255,0.9)');
      grd.addColorStop(1, 'rgba(255,255,255,0.4)');
      g.fillStyle = grd;
      g.beginPath();
      g.arc(C, C + R * 0.2, R * 0.32, 0, TAU);
      g.fill();
    }
    return c;
  });
}

export function rotorTexture(type: NodeType, level: Level = 1): Texture | null {
  if (type === 'bastion' || type === 'brut') return null;
  return cached(`rotor:${type}:${level}`, () => {
    const [c, g] = canvas(SIZE, SIZE);
    const s = R / 24;
    g.fillStyle = '#fff';
    g.strokeStyle = '#fff';
    g.lineCap = 'round';
    if (type === 'nest') {
      // small fish circling the dome
      for (let k = 0; k < 2 + level; k++) {
        const a = (k * TAU) / (2 + level);
        const x = C + Math.cos(a) * R * 1.1,
          y = C + Math.sin(a) * R * 1.1;
        g.save();
        g.translate(x, y);
        g.rotate(a + Math.PI / 2);
        g.beginPath();
        g.moveTo(-5 * s, 0);
        g.quadraticCurveTo(0, -3.5 * s, 5 * s, 0);
        g.quadraticCurveTo(0, 3.5 * s, -5 * s, 0);
        g.moveTo(-5 * s, 0);
        g.lineTo(-8 * s, -3 * s);
        g.lineTo(-8 * s, 3 * s);
        g.closePath();
        g.fill();
        g.restore();
      }
    } else if (type === 'strom') {
      const blades = 3 + (level - 1);
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
    } else if (type === 'waechter') {
      // rotating light beam from the lamp
      const len = R * (1.1 + level * 0.15);
      g.globalAlpha = 0.55;
      g.beginPath();
      g.moveTo(C, C - R * 0.87);
      g.lineTo(C + len, C - R * 0.87 - R * 0.22);
      g.lineTo(C + len, C - R * 0.87 + R * 0.22);
      g.closePath();
      g.fill();
    } else if (type === 'quelle') {
      for (let k = 0; k < 2 + level; k++) {
        const a = (k * TAU) / (2 + level);
        g.beginPath();
        g.arc(C + Math.cos(a) * R * 0.85, C + Math.sin(a) * R * 0.85, 2.8 * s, 0, TAU);
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
    g.lineWidth = 2 * (R / 24);
    g.beginPath();
    g.ellipse(C, C + R * 0.95, R * 1.3, R * 0.36, 0, 0, TAU);
    g.stroke();
    return c;
  });
}

/* ------------------------------------------------------------------ units: sea creatures
 * White fill (tinted with the owner colour) with a dark outline and a white eye.
 */
export function unitTexture(unit: UnitType): Texture {
  return cached('unit:' + unit, () => {
    const size = 40,
      cx = 20,
      cy = 20;
    const [c, g] = canvas(size, size);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.translate(cx, cy);
    g.fillStyle = '#fff';
    g.strokeStyle = INK;
    g.lineWidth = 2.2;
    const eye = (x: number, y: number) => {
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(x, y, 2.2, 0, TAU);
      g.fill();
      g.fillStyle = INK;
      g.beginPath();
      g.arc(x + 0.6, y, 1.1, 0, TAU);
      g.fill();
      g.fillStyle = '#fff';
    };
    if (unit === 'sporen') {
      // fish
      g.beginPath();
      g.moveTo(-8, 0);
      g.quadraticCurveTo(0, -7, 9, 0);
      g.quadraticCurveTo(0, 7, -8, 0);
      g.closePath();
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(-8, 0);
      g.lineTo(-14, -6);
      g.lineTo(-13, 6);
      g.closePath();
      g.fill();
      g.stroke();
      eye(4, -1.5);
    } else if (unit === 'drohnen') {
      // jellyfish
      g.beginPath();
      g.moveTo(-9, 2);
      g.bezierCurveTo(-9, -9, 9, -9, 9, 2);
      g.quadraticCurveTo(0, 5, -9, 2);
      g.closePath();
      g.fill();
      g.stroke();
      g.lineWidth = 1.6;
      for (const x of [-6, -2, 2, 6]) {
        g.beginPath();
        g.moveTo(x, 3);
        g.quadraticCurveTo(x + 2, 8, x - 1, 13);
        g.stroke();
      }
      g.lineWidth = 2.2;
      eye(-2, -2);
    } else if (unit === 'panzer') {
      // armoured crab
      g.beginPath();
      g.ellipse(0, 1, 10, 7, 0, 0, TAU);
      g.fill();
      g.stroke();
      g.lineWidth = 3;
      for (const [x, y, dx, dy] of [
        [-8, 0, -6, -5],
        [8, 0, 6, -5],
        [-7, 5, -5, 6],
        [7, 5, 5, 6],
      ]) {
        g.beginPath();
        g.moveTo(x as number, y as number);
        g.lineTo((x as number) + (dx as number), (y as number) + (dy as number));
        g.stroke();
      }
      g.lineWidth = 2.2;
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.moveTo(sx * 12, -5);
        g.lineTo(sx * 16, -11);
        g.lineTo(sx * 11, -9);
        g.closePath();
        g.fill();
        g.stroke();
      }
      eye(-3, -2);
      eye(3, -2);
    } else if (unit === 'pfeile') {
      // manta ray
      g.beginPath();
      g.moveTo(0, -8);
      g.bezierCurveTo(10, -8, 17, -1, 16, 1);
      g.bezierCurveTo(8, 1, 4, 6, 0, 8);
      g.bezierCurveTo(-4, 6, -8, 1, -16, 1);
      g.bezierCurveTo(-17, -1, -10, -8, 0, -8);
      g.closePath();
      g.fill();
      g.stroke();
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(0, 8);
      g.quadraticCurveTo(2, 13, 4, 17);
      g.stroke();
      g.lineWidth = 2.2;
      eye(-3, -3);
    } else if (unit === 'stachel') {
      // pufferfish
      g.beginPath();
      g.arc(0, 0, 8, 0, TAU);
      g.fill();
      g.stroke();
      g.lineWidth = 2.4;
      for (let k = 0; k < 8; k++) {
        const a = (k * TAU) / 8;
        g.beginPath();
        g.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
        g.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
        g.stroke();
      }
      g.lineWidth = 2.2;
      eye(-2.5, -2);
    } else {
      // pearl
      const grd = g.createRadialGradient(-2, -2, 0, 0, 0, 8);
      grd.addColorStop(0, '#fff');
      grd.addColorStop(1, 'rgba(255,255,255,0.6)');
      g.fillStyle = grd;
      g.beginPath();
      g.arc(0, 0, 8, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(16,50,74,0.5)';
      g.stroke();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(-3, -3, 2, 0, TAU);
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
  g.fillStyle = 'rgba(16,50,74,0.22)';
  g.beginPath();
  for (const p of cluster) {
    g.moveTo(p.x + p.r * 1.05 + 6, p.y + 8);
    g.ellipse(p.x + 6, p.y + 8, p.r * 1.05, p.r * 0.7, 0, 0, TAU);
  }
  g.fill();
  const rg = g.createRadialGradient(cx - ext * 0.35, cy - ext * 0.4, ext * 0.05, cx, cy, ext);
  rg.addColorStop(0, '#c9b58e');
  rg.addColorStop(1, '#7d6a4f');
  g.fillStyle = rg;
  unionPath(0);
  g.fill();
  g.strokeStyle = '#4a3b2a';
  g.lineWidth = 4;
  unionPath(0);
  g.stroke();
  g.save();
  unionPath(0);
  g.clip();
  for (const p of cluster) {
    for (let i = 0; i < 14; i++) {
      const a = rand() * TAU,
        d = rand() * p.r * 0.9;
      g.fillStyle = rand() < 0.6 ? 'rgba(74,59,42,0.25)' : 'rgba(255,255,255,0.35)';
      g.beginPath();
      g.arc(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 1.5 + rand() * 4, 0, TAU);
      g.fill();
    }
    // pink coral tuft on top
    g.strokeStyle = '#ff7ea8';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(p.x - p.r * 0.2, p.y - p.r * 0.5);
    g.quadraticCurveTo(p.x - p.r * 0.35, p.y - p.r * 0.9, p.x - p.r * 0.15, p.y - p.r * 1.05);
    g.moveTo(p.x + p.r * 0.1, p.y - p.r * 0.55);
    g.quadraticCurveTo(p.x + p.r * 0.3, p.y - p.r * 0.85, p.x + p.r * 0.2, p.y - p.r * 1.1);
    g.stroke();
  }
  g.restore();
  return { texture: Texture.from(c, true), x: minX, y: minY, w, h };
}

/** Screen background gradient: bright lagoon from surface to sand. */
export function backgroundTexture(): Texture {
  return cached('bg', () => {
    const [c, g] = canvas(64, 512);
    const bg = g.createLinearGradient(0, 0, 0, 512);
    bg.addColorStop(0, '#d9f6ff');
    bg.addColorStop(0.25, '#8fe3f4');
    bg.addColorStop(0.6, '#37b7d6');
    bg.addColorStop(1, '#1a89b3');
    g.fillStyle = bg;
    g.fillRect(0, 0, 64, 512);
    return c;
  });
}

/** Soft sun shaft (white, additive). */
export function shaftTexture(): Texture {
  return cached('shaft', () => {
    const [c, g] = canvas(128, 512);
    const grd = g.createLinearGradient(0, 0, 0, 512);
    grd.addColorStop(0, 'rgba(255,255,255,0.7)');
    grd.addColorStop(0.7, 'rgba(255,255,255,0.15)');
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

/** Sand floor strip with a wavy top edge (world width, tiled). */
export function sandTexture(): Texture {
  return cached('sand', () => {
    const w = 512,
      h = 160;
    const [c, g] = canvas(w, h);
    g.fillStyle = '#f2dfb2';
    g.beginPath();
    g.moveTo(0, 40);
    for (let x = 0; x <= w; x += 32) g.quadraticCurveTo(x + 16, x % 64 ? 24 : 56, x + 32, 40);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath();
    g.moveTo(0, 46);
    for (let x = 0; x <= w; x += 32) g.quadraticCurveTo(x + 16, x % 64 ? 30 : 62, x + 32, 46);
    g.lineTo(w, 60);
    g.lineTo(0, 60);
    g.closePath();
    g.fill();
    for (let i = 0; i < 60; i++) {
      g.fillStyle = i % 3 ? 'rgba(201,181,142,0.45)' : 'rgba(255,255,255,0.5)';
      g.beginPath();
      g.arc(Math.random() * w, 60 + Math.random() * 90, 1 + Math.random() * 2, 0, TAU);
      g.fill();
    }
    return c;
  });
}

/** Colourful reef flora for the sand floor and sides. */
export function plantTexture(kind: 'fan' | 'kelp' | 'brain' | 'tube', seed: number): Texture {
  return cached(`plant:${kind}:${seed}`, () => {
    let rnd = seed | 1;
    const rand = () => {
      rnd = (rnd * 1103515245 + 12345) & 0x7fffffff;
      return rnd / 0x7fffffff;
    };
    const w = 160,
      h = 200;
    const [c, g] = canvas(w, h);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if (kind === 'fan') {
      const col = ['#ff7ea8', '#ff9a5c', '#c86bff'][seed % 3] as string;
      g.strokeStyle = col;
      const branch = (x: number, y: number, a: number, len: number, depth: number) => {
        if (depth === 0 || len < 4) return;
        const nx = x + Math.cos(a) * len,
          ny = y + Math.sin(a) * len;
        g.lineWidth = depth * 2.2;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(nx, ny);
        g.stroke();
        const n = 2 + (rand() < 0.4 ? 1 : 0);
        for (let i = 0; i < n; i++)
          branch(nx, ny, a + (rand() - 0.5) * 1.3, len * (0.62 + rand() * 0.2), depth - 1);
      };
      branch(w / 2, h - 4, -Math.PI / 2, 48, 5);
      g.fillStyle = col;
      for (let i = 0; i < 24; i++) {
        g.beginPath();
        g.arc(30 + rand() * 100, 30 + rand() * 110, 2 + rand() * 2.5, 0, TAU);
        g.fill();
      }
    } else if (kind === 'kelp') {
      for (let k = 0; k < 3; k++) {
        const x0 = w * (0.3 + k * 0.2);
        g.strokeStyle = '#3fbf7f';
        g.lineWidth = 6 - k;
        g.beginPath();
        g.moveTo(x0, h);
        let x = x0;
        for (let y = h; y > 20 + k * 30; y -= 12) {
          x += (rand() - 0.5) * 10;
          g.lineTo(x, y);
        }
        g.stroke();
        g.fillStyle = '#7fe0a8';
        for (let y = h - 20; y > 40 + k * 30; y -= 22) {
          const dir = rand() < 0.5 ? -1 : 1;
          g.beginPath();
          g.ellipse(x0 + dir * 11, y, 13, 5, dir * 0.6, 0, TAU);
          g.fill();
        }
      }
    } else if (kind === 'brain') {
      g.fillStyle = '#ffb457';
      g.strokeStyle = '#c96d1a';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(w / 2, h - 50, 62, 46, 0, Math.PI, 0);
      g.closePath();
      g.fill();
      g.stroke();
      g.strokeStyle = 'rgba(201,109,26,0.7)';
      g.lineWidth = 3;
      for (let i = 0; i < 9; i++) {
        g.beginPath();
        let x = 30 + i * 12,
          y = h - 52;
        g.moveTo(x, y);
        for (let k = 0; k < 6; k++) {
          x += (rand() - 0.5) * 12;
          y -= 6;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    } else {
      for (let k = 0; k < 4; k++) {
        const x = 30 + k * 32 + rand() * 10,
          th = 60 + rand() * 90,
          r = 9 + rand() * 5;
        g.fillStyle = ['#c86bff', '#ff7ea8', '#3fa9d8', '#ffb457'][k] as string;
        g.strokeStyle = INK;
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(x - r, h);
        g.lineTo(x - r * 0.8, h - th);
        g.arc(x, h - th, r * 0.8, Math.PI, 0);
        g.lineTo(x + r, h);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = 'rgba(16,50,74,0.7)';
        g.beginPath();
        g.ellipse(x, h - th, r * 0.45, r * 0.25, 0, 0, TAU);
        g.fill();
      }
    }
    return c;
  });
}

/** Reef barrier: a jagged coral wall segment (drawn vertical, rotated to the edge normal). */
export function barrierTexture(): Texture {
  return cached('barrier', () => {
    const w = 60,
      h = 140;
    const [c, g] = canvas(w, h);
    const body = g.createLinearGradient(0, 0, w, 0);
    body.addColorStop(0, '#c2336d');
    body.addColorStop(0.5, '#ff7ea8');
    body.addColorStop(1, '#c2336d');
    g.fillStyle = body;
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(w * 0.35, 6);
    for (let i = 0; i <= 10; i++) {
      const y = 6 + (i / 10) * (h - 12);
      g.lineTo(w * (0.62 + 0.18 * Math.sin(i * 2.1)), y);
    }
    g.lineTo(w * 0.35, h - 6);
    for (let i = 10; i >= 0; i--) {
      const y = 6 + (i / 10) * (h - 12);
      g.lineTo(w * (0.38 - 0.18 * Math.sin(i * 1.7 + 1)), y);
    }
    g.closePath();
    g.fill();
    g.stroke();
    for (let i = 0; i < 18; i++) {
      const x = w * (0.3 + Math.random() * 0.4),
        y = 10 + Math.random() * (h - 20);
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(120,30,70,0.5)';
      g.beginPath();
      g.arc(x, y, 1.5 + Math.random() * 2.5, 0, TAU);
      g.fill();
    }
    return c;
  });
}

/** Mine: dark spiky urchin with a red core. */
export function mineTexture(): Texture {
  return cached('mine', () => {
    const size = 48,
      cx = 24,
      cy = 24;
    const [c, g] = canvas(size, size);
    g.fillStyle = '#2a1a3a';
    for (let i = 0; i < 12; i++) {
      const a = (i * TAU) / 12;
      g.beginPath();
      g.moveTo(cx + Math.cos(a - 0.15) * 11, cy + Math.sin(a - 0.15) * 11);
      g.lineTo(cx + Math.cos(a) * 23, cy + Math.sin(a) * 23);
      g.lineTo(cx + Math.cos(a + 0.15) * 11, cy + Math.sin(a + 0.15) * 11);
      g.closePath();
      g.fill();
    }
    g.fillStyle = radial(g, cx, cy, 13, '#6a3a7a', '#2a1a3a');
    g.beginPath();
    g.arc(cx, cy, 13, 0, TAU);
    g.fill();
    g.fillStyle = '#ff4f7d';
    g.beginPath();
    g.arc(cx, cy, 4.5, 0, TAU);
    g.fill();
    return c;
  });
}

/** Composes the node art into a small DOM canvas icon in the given colour (legend, intros, menus). */
export function nodeIcon(type: NodeType, level: Level = 1, color = '#ffb400', size = 40): HTMLCanvasElement {
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
  const draw = (c: HTMLCanvasElement, alpha = 1) => {
    g.globalAlpha = alpha;
    g.drawImage(c, 0, 0, c.width, c.height, size * 0.1, size * 0.1, size * 1.8, size * 1.8);
    g.globalAlpha = 1;
  };
  draw(tinted(detailTexture(type, level)));
  draw(platform);
  const rt = rotorTexture(type, level);
  if (rt) draw(tinted(rt), 0.95);
  return out;
}

/** Pre-tinted copy of a white texture (composited on canvas), cached per colour — avoids runtime tint. */
export function tintedTexture(base: Texture, color: string): Texture {
  const key = `tint:${base.uid}:${color}`;
  return cached(key, () => {
    const src = base.source.resource as HTMLCanvasElement;
    const [c, g] = canvas(src.width, src.height);
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  });
}
