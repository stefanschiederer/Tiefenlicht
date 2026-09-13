import type { NodeType, UnitType } from '@/data';

export const TAU = Math.PI * 2;
export const UI_FONT = '"Avenir Next","Segoe UI","Helvetica Neue",Arial,sans-serif';

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const glows: Record<string, HTMLCanvasElement> = {};
export function glowSprite(color: string): HTMLCanvasElement {
  let c = glows[color];
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, rgba(color, 0.9));
    grd.addColorStop(0.3, rgba(color, 0.35));
    grd.addColorStop(1, rgba(color, 0));
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    glows[color] = c;
  }
  return c;
}
export function glow(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  a: number,
): void {
  g.globalAlpha = a;
  g.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  g.globalAlpha = 1;
}
export function roundRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.arcTo(x + w, y, x + w, y + r, r);
  g.lineTo(x + w, y + h - r);
  g.arcTo(x + w, y + h, x + w - r, y + h, r);
  g.lineTo(x + r, y + h);
  g.arcTo(x, y + h, x, y + h - r, r);
  g.lineTo(x, y + r);
  g.arcTo(x, y, x + r, y, r);
  g.closePath();
}
export function pill(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color?: string,
): void {
  g.font = `600 ${size}px ${UI_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const w = g.measureText(text).width + size * 0.9,
    h = size * 1.5;
  g.fillStyle = 'rgba(4,10,18,.72)';
  roundRect(g, x - w / 2, y - h / 2, w, h, h / 2);
  g.fill();
  g.fillStyle = color || '#fff';
  g.fillText(text, x, y + 0.5);
}
export function poly(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sides: number,
  rot: number,
): void {
  g.beginPath();
  for (let k = 0; k < sides; k++) {
    const a = rot + (k * TAU) / sides,
      xx = x + Math.cos(a) * r,
      yy = y + Math.sin(a) * r;
    if (k) g.lineTo(xx, yy);
    else g.moveTo(xx, yy);
  }
  g.closePath();
}
function shapePath(g: CanvasRenderingContext2D, x: number, y: number, r: number, T: NodeType): void {
  if (T === 'bastion') poly(g, x, y, r, 6, Math.PI / 6);
  else {
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
  }
}

/** The tower itself: platform, body by type, level rings, core. */
export function drawTower(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  T: NodeType,
  C: string,
  own: boolean,
  t: number,
  level: number,
): void {
  const s = r / 24,
    pulse = 0.5 + 0.5 * Math.sin(t * 2);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.fillStyle = 'rgba(6,14,24,.85)';
  g.beginPath();
  g.arc(x, y, r * 1.22, 0, TAU);
  g.fill();
  g.strokeStyle = rgba(C, 0.18);
  g.lineWidth = 1 * s;
  g.beginPath();
  g.arc(x, y, r * 1.22, 0, TAU);
  g.stroke();
  for (let k = 1; k < level; k++) {
    g.strokeStyle = rgba(C, 0.55);
    g.lineWidth = 1.3 * s;
    g.beginPath();
    g.arc(x, y, r * (1.09 + k * 0.065), 0, TAU);
    g.stroke();
  }
  const body = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  body.addColorStop(0, '#12263a');
  body.addColorStop(1, '#06101b');
  g.fillStyle = body;
  shapePath(g, x, y, r, T);
  g.fill();
  g.lineWidth = (T === 'bastion' ? 4.5 : 2.6) * s;
  g.strokeStyle = own ? C : rgba(C, 0.8);
  shapePath(g, x, y, r, T);
  g.stroke();
  if (T === 'nest') {
    g.strokeStyle = rgba(C, 0.35);
    g.lineWidth = 1.2 * s;
    for (const f of [0.78, 0.56]) {
      g.beginPath();
      g.arc(x, y, r * f, 0, TAU);
      g.stroke();
    }
    g.fillStyle = rgba(C, 0.6);
    for (let k = 0; k < 3; k++) {
      const a = t * 0.4 + (k * TAU) / 3;
      g.beginPath();
      g.arc(x + Math.cos(a) * r * 0.67, y + Math.sin(a) * r * 0.67, 1.6 * s, 0, TAU);
      g.fill();
    }
  } else if (T === 'brut') {
    g.strokeStyle = rgba(C, 0.4);
    g.lineWidth = 1.4 * s;
    g.beginPath();
    g.arc(x, y, r * 0.7, 0, TAU);
    g.stroke();
    g.strokeStyle = rgba(C, 0.55);
    g.lineWidth = 1.6 * s;
    for (let k = 0; k < 3; k++) {
      const a0 = -t * 0.8 + (k * TAU) / 3;
      g.beginPath();
      g.arc(x, y, r * 0.42, a0, a0 + 1.4);
      g.stroke();
    }
    for (let k = 0; k < 6; k++) {
      const a = t * 0.6 + (k * Math.PI) / 3,
        px = x + Math.cos(a) * r * 0.7,
        py = y + Math.sin(a) * r * 0.7;
      g.fillStyle = rgba(C, 0.9);
      g.beginPath();
      g.arc(px, py, (2.6 + 0.6 * Math.sin(t * 3 + k)) * s, 0, TAU);
      g.fill();
    }
  } else if (T === 'bastion') {
    g.strokeStyle = rgba(C, 0.5);
    g.lineWidth = 1.8 * s;
    poly(g, x, y, r * 0.62, 6, Math.PI / 6);
    g.stroke();
    g.fillStyle = rgba(C, 0.9);
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 6 + (k * Math.PI) / 3;
      g.beginPath();
      g.arc(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, 2.2 * s, 0, TAU);
      g.fill();
    }
    g.strokeStyle = rgba(C, 0.3);
    g.lineWidth = 1 * s;
    poly(g, x, y, r * 0.36, 6, Math.PI / 6);
    g.stroke();
  } else if (T === 'strom') {
    g.strokeStyle = rgba(C, 0.85);
    g.lineWidth = 2.4 * s;
    for (let k = 0; k < 3; k++) {
      const a0 = t * 2.6 + (k * TAU) / 3;
      g.beginPath();
      g.arc(x, y, r * 0.62, a0, a0 + 1.15);
      g.stroke();
    }
    g.strokeStyle = rgba(C, 0.45);
    g.lineWidth = 1.4 * s;
    for (let k = 0; k < 3; k++) {
      const a0 = -t * 1.8 + (k * TAU) / 3;
      g.beginPath();
      g.arc(x, y, r * 0.36, a0, a0 + 1.4);
      g.stroke();
    }
  } else if (T === 'waechter') {
    g.strokeStyle = rgba(C, 0.5);
    g.lineWidth = 1.4 * s;
    poly(g, x, y, r * 0.6, 4, 0);
    g.stroke();
    g.strokeStyle = rgba(C, 0.35);
    g.lineWidth = 1 * s;
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78);
      g.lineTo(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95);
      g.stroke();
    }
    const a = t * 1.8;
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.fillStyle = rgba(C, 0.95);
    roundRect(g, 0, -2.2 * s, r * 0.85, 4.4 * s, 2 * s);
    g.fill();
    g.fillStyle = '#07111c';
    g.beginPath();
    g.arc(0, 0, r * 0.24, 0, TAU);
    g.fill();
    g.restore();
  } else if (T === 'quelle') {
    g.strokeStyle = rgba(C, 0.5 + 0.35 * pulse);
    g.lineWidth = 1.6 * s;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 + t * 0.3;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45);
      g.lineTo(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82);
      g.stroke();
    }
    g.fillStyle = rgba(C, 0.9);
    for (let k = 0; k < 3; k++) {
      const a = t * 1.2 + (k * TAU) / 3;
      g.beginPath();
      g.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, 1.8 * s, 0, TAU);
      g.fill();
    }
  }
  g.fillStyle = rgba(C, 0.95);
  g.beginPath();
  g.arc(x, y, r * 0.2 + (own ? pulse * 1.4 * s : 0), 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.85)';
  g.beginPath();
  g.arc(x - r * 0.05, y - r * 0.05, r * 0.07, 0, TAU);
  g.fill();
}

export function drawUnit(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  ang: number,
  unit: UnitType,
  C: string,
  s: number,
): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.fillStyle = C;
  if (unit === 'sporen') {
    g.beginPath();
    g.arc(0, 0, 1.5 * s, 0, TAU);
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
  g.restore();
}

/** Small canvas icon of a node type in the player's colour (for legend and intros). */
export function typeIcon(T: NodeType, size: number, level = 1, color = '#ffc45a'): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size * 2;
  c.style.width = c.style.height = size + 'px';
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.scale(2, 2);
  g.globalCompositeOperation = 'lighter';
  glow(g, size / 2, size / 2, size * 0.62, color, 0.5);
  g.globalCompositeOperation = 'source-over';
  drawTower(g, size / 2, size / 2, size * 0.33, T, color, true, 1.2, level);
  return c;
}
