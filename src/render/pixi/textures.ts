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

/** Dark platform + body silhouette (not tinted). */
export function platformTexture(type: NodeType): Texture {
  return cached('platform:' + type, () => {
    const R = NODE_R * TEX_SCALE,
      size = R * 2.8,
      cx = size / 2,
      cy = size / 2;
    const [c, g] = canvas(size, size);
    g.fillStyle = 'rgba(4,10,18,0.9)';
    g.beginPath();
    g.arc(cx, cy, R * 1.28, 0, TAU);
    g.fill();
    const rim = g.createRadialGradient(cx, cy, R * 1.05, cx, cy, R * 1.3);
    rim.addColorStop(0, 'rgba(120,170,210,0)');
    rim.addColorStop(1, 'rgba(120,170,210,0.18)');
    g.fillStyle = rim;
    g.beginPath();
    g.arc(cx, cy, R * 1.3, 0, TAU);
    g.fill();
    const body = g.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
    body.addColorStop(0, '#14293f');
    body.addColorStop(1, '#06101b');
    g.fillStyle = body;
    if (type === 'bastion') poly(g, cx, cy, R, 6, Math.PI / 6);
    else {
      g.beginPath();
      g.arc(cx, cy, R, 0, TAU);
    }
    g.fill();
    return c;
  });
}

/** White detail layer per type (tinted with the owner colour). */
export function detailTexture(type: NodeType): Texture {
  return cached('detail:' + type, () => {
    const R = NODE_R * TEX_SCALE,
      size = R * 2.8,
      cx = size / 2,
      cy = size / 2,
      s = R / 24;
    const [c, g] = canvas(size, size);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = '#fff';
    g.fillStyle = '#fff';
    // outline
    g.lineWidth = (type === 'bastion' ? 4.5 : 2.6) * s;
    if (type === 'bastion') poly(g, cx, cy, R, 6, Math.PI / 6);
    else {
      g.beginPath();
      g.arc(cx, cy, R, 0, TAU);
    }
    g.stroke();
    g.globalAlpha = 0.4;
    g.lineWidth = 1.3 * s;
    if (type === 'nest') {
      for (const f of [0.78, 0.56]) {
        g.beginPath();
        g.arc(cx, cy, R * f, 0, TAU);
        g.stroke();
      }
    } else if (type === 'brut') {
      g.beginPath();
      g.arc(cx, cy, R * 0.7, 0, TAU);
      g.stroke();
    } else if (type === 'bastion') {
      g.globalAlpha = 0.55;
      g.lineWidth = 1.8 * s;
      poly(g, cx, cy, R * 0.62, 6, Math.PI / 6);
      g.stroke();
      g.globalAlpha = 0.9;
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + (k * Math.PI) / 3;
        g.beginPath();
        g.arc(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9, 2.2 * s, 0, TAU);
        g.fill();
      }
      g.globalAlpha = 0.3;
      poly(g, cx, cy, R * 0.36, 6, Math.PI / 6);
      g.stroke();
    } else if (type === 'waechter') {
      g.globalAlpha = 0.5;
      poly(g, cx, cy, R * 0.6, 4, 0);
      g.stroke();
      g.globalAlpha = 0.35;
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78);
        g.lineTo(cx + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95);
        g.stroke();
      }
    } else if (type === 'quelle') {
      g.globalAlpha = 0.5;
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * R * 0.45, cy + Math.sin(a) * R * 0.45);
        g.lineTo(cx + Math.cos(a) * R * 0.82, cy + Math.sin(a) * R * 0.82);
        g.stroke();
      }
    }
    // core
    g.globalAlpha = 0.95;
    g.beginPath();
    g.arc(cx, cy, R * 0.2, 0, TAU);
    g.fill();
    return c;
  });
}

/** White rotating layer per type (tinted); empty for types without one. */
export function rotorTexture(type: NodeType): Texture | null {
  if (type === 'bastion') return null;
  return cached('rotor:' + type, () => {
    const R = NODE_R * TEX_SCALE,
      size = R * 2.8,
      cx = size / 2,
      cy = size / 2,
      s = R / 24;
    const [c, g] = canvas(size, size);
    g.lineCap = 'round';
    g.strokeStyle = '#fff';
    g.fillStyle = '#fff';
    if (type === 'nest') {
      g.globalAlpha = 0.7;
      for (let k = 0; k < 3; k++) {
        const a = (k * TAU) / 3;
        g.beginPath();
        g.arc(cx + Math.cos(a) * R * 0.67, cy + Math.sin(a) * R * 0.67, 1.8 * s, 0, TAU);
        g.fill();
      }
    } else if (type === 'brut') {
      g.globalAlpha = 0.9;
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        g.beginPath();
        g.arc(cx + Math.cos(a) * R * 0.7, cy + Math.sin(a) * R * 0.7, 2.8 * s, 0, TAU);
        g.fill();
      }
      g.globalAlpha = 0.55;
      g.lineWidth = 1.6 * s;
      for (let k = 0; k < 3; k++) {
        const a0 = (k * TAU) / 3;
        g.beginPath();
        g.arc(cx, cy, R * 0.42, a0, a0 + 1.4);
        g.stroke();
      }
    } else if (type === 'strom') {
      g.globalAlpha = 0.85;
      g.lineWidth = 2.4 * s;
      for (let k = 0; k < 3; k++) {
        const a0 = (k * TAU) / 3;
        g.beginPath();
        g.arc(cx, cy, R * 0.62, a0, a0 + 1.15);
        g.stroke();
      }
      g.globalAlpha = 0.45;
      g.lineWidth = 1.4 * s;
      for (let k = 0; k < 3; k++) {
        const a0 = (k * TAU) / 3 + 0.8;
        g.beginPath();
        g.arc(cx, cy, R * 0.36, a0, a0 + 1.4);
        g.stroke();
      }
    } else if (type === 'waechter') {
      g.globalAlpha = 0.95;
      const w = 4.4 * s,
        len = R * 0.85;
      g.beginPath();
      g.moveTo(cx, cy - w / 2);
      g.lineTo(cx + len, cy - w / 2);
      g.arc(cx + len, cy, w / 2, -Math.PI / 2, Math.PI / 2);
      g.lineTo(cx, cy + w / 2);
      g.closePath();
      g.fill();
      g.globalAlpha = 1;
      g.fillStyle = '#07111c';
      g.beginPath();
      g.arc(cx, cy, R * 0.24, 0, TAU);
      g.fill();
    } else if (type === 'quelle') {
      g.globalAlpha = 0.9;
      for (let k = 0; k < 3; k++) {
        const a = (k * TAU) / 3;
        g.beginPath();
        g.arc(cx + Math.cos(a) * R * 0.62, cy + Math.sin(a) * R * 0.62, 2 * s, 0, TAU);
        g.fill();
      }
    }
    return c;
  });
}

/** Level ring (white, tinted). */
export function ringTexture(): Texture {
  return cached('ring', () => {
    const R = NODE_R * TEX_SCALE,
      size = R * 2.8,
      cx = size / 2;
    const [c, g] = canvas(size, size);
    g.strokeStyle = '#fff';
    g.lineWidth = 1.4 * (R / 24);
    g.beginPath();
    g.arc(cx, cx, R * 1.12, 0, TAU);
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
