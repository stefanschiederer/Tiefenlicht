import { TEAM_COLORS, TEAM_DARK, WALL_T } from '@/game/config';
import { levelOf, radiusOf, tower, troopPos } from '@/game/sim';
import type { GameEvent, GameState, Line } from '@/game/state';
import { drawGround, drawWall, towerSprite, troopSprite } from './sprites';
import { View } from './view';

export interface UiState {
  /** Line being drawn: source tower and pointer (screen px). */
  drag: { src: number; px: number; py: number; target: number | null; ok: boolean } | null;
  /** Swipe trail for cutting (screen px, newest last). */
  cut: { x: number; y: number; t: number }[];
  /** Tutorial hand from one tower to another. */
  hint: { from: number; to: number } | null;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

const TAU = Math.PI * 2;

export class Renderer {
  readonly view = new View();
  private g: CanvasRenderingContext2D;
  private ground: HTMLCanvasElement | null = null;
  private groundKey = '';
  private dpr = 1;
  private time = 0;
  private particles: Particle[] = [];
  /** Per-tower pop animation after a capture. */
  private pop = new Map<number, number>();
  private rings: { x: number; y: number; t: number; color: string }[] = [];

  constructor(readonly canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d') as CanvasRenderingContext2D;
  }

  resize(w: number, h: number): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.view.resize(w, h);
    this.groundKey = '';
  }

  /** Visual reactions to simulation events. */
  onEvents(s: GameState, events: GameEvent[]): void {
    const v = this.view;
    for (const e of events) {
      if (e.type === 'capture') {
        const t = e.tower;
        this.pop.set(t.id, 1);
        this.burst(v.sx(t.x, t.y), v.sy(t.x, t.y), TEAM_COLORS[t.owner] ?? '#fff', 26);
        this.rings.push({
          x: v.sx(t.x, t.y),
          y: v.sy(t.x, t.y),
          t: 0,
          color: TEAM_COLORS[t.owner] ?? '#fff',
        });
      } else if (e.type === 'hit') {
        const t = e.tower;
        if (Math.random() < 0.5) this.burst(v.sx(t.x, t.y), v.sy(t.x, t.y) - 10, '#ffffff', 2);
      } else if (e.type === 'clash') {
        this.burst(v.sx(e.x, e.y), v.sy(e.x, e.y), '#ffffff', 4);
      } else if (e.type === 'cut') {
        this.burst(v.sx(e.x, e.y), v.sy(e.x, e.y), '#ffffff', 10);
      }
    }
    void s;
  }

  private burst(x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU,
        sp = 40 + Math.random() * 160;
      const life = 0.35 + Math.random() * 0.4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life,
        max: life,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  render(s: GameState, ui: UiState, dt: number): void {
    this.time += dt;
    const g = this.g,
      v = this.view;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // ground (cached per level and size)
    const key = `${v.w}x${v.h}:${v.rot}:${s.def.n}`;
    if (key !== this.groundKey || !this.ground) {
      this.groundKey = key;
      const c = this.ground ?? document.createElement('canvas');
      c.width = this.canvas.width;
      c.height = this.canvas.height;
      const gg = c.getContext('2d') as CanvasRenderingContext2D;
      gg.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      drawGround(gg, v.w, v.h, v.field(), s.def.n);
      for (const w of s.walls)
        drawWall(gg, v.sx(w.x1, w.y1), v.sy(w.x1, w.y1), v.sx(w.x2, w.y2), v.sy(w.x2, w.y2), WALL_T * v.k);
      this.ground = c;
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.ground, 0, 0);
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.drawLines(s);
    if (ui.drag) this.drawDrag(s, ui.drag);
    this.drawScene(s);
    this.drawEffects(dt);
    this.drawCut(ui);
    if (ui.hint) this.drawHint(s, ui.hint);
  }

  /* ------------------------------------------------------------------ lines */
  private lineWidth(): number {
    return Math.max(7, 15 * this.view.k);
  }

  private drawLines(s: GameState): void {
    const g = this.g,
      v = this.view,
      lw = this.lineWidth();
    for (const l of s.lines) {
      const A = tower(s, l.src),
        B = tower(s, l.dst);
      let ax = v.sx(A.x, A.y),
        ay = v.sy(A.x, A.y),
        bx = v.sx(B.x, B.y),
        by = v.sy(B.x, B.y);
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const ux = (bx - ax) / len,
        uy = (by - ay) / len;
      // two opposing lines on the same pair sit side by side
      if (s.lines.some((o) => o.src === l.dst && o.dst === l.src)) {
        const off = lw * 0.55;
        ax += -uy * off;
        ay += ux * off;
        bx += -uy * off;
        by += ux * off;
      }
      const grow = Math.min(1, l.age / 0.22);
      const ex = ax + (bx - ax) * grow,
        ey = ay + (by - ay) * grow;
      this.lineBody(ax, ay, ex, ey, l, lw);
    }
    void g;
  }

  private lineBody(ax: number, ay: number, bx: number, by: number, l: Pick<Line, 'owner'>, lw: number): void {
    const g = this.g;
    const col = TEAM_COLORS[l.owner] ?? '#fff',
      dark = TEAM_DARK[l.owner] ?? '#333';
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(20,40,20,0.25)';
    g.lineWidth = lw + 5;
    g.beginPath();
    g.moveTo(ax, ay + 2);
    g.lineTo(bx, by + 2);
    g.stroke();
    g.strokeStyle = dark;
    g.lineWidth = lw + 3;
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(bx, by);
    g.stroke();
    g.strokeStyle = col;
    g.lineWidth = lw;
    g.stroke();
    // moving chevrons towards the target
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 4) return;
    const ux = (bx - ax) / len,
      uy = (by - ay) / len;
    const gap = lw * 2.2,
      sz = lw * 0.36;
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = Math.max(2, lw * 0.22);
    const off = (this.time * lw * 3) % gap;
    for (let d = off + lw; d < len - lw * 0.5; d += gap) {
      const cx = ax + ux * d,
        cy = ay + uy * d;
      g.beginPath();
      g.moveTo(cx - ux * sz - uy * sz, cy - uy * sz + ux * sz);
      g.lineTo(cx, cy);
      g.lineTo(cx - ux * sz + uy * sz, cy - uy * sz - ux * sz);
      g.stroke();
    }
  }

  private drawDrag(s: GameState, d: NonNullable<UiState['drag']>): void {
    const v = this.view,
      A = tower(s, d.src);
    const ax = v.sx(A.x, A.y),
      ay = v.sy(A.x, A.y);
    let bx = d.px,
      by = d.py;
    if (d.target !== null) {
      const B = tower(s, d.target);
      bx = v.sx(B.x, B.y);
      by = v.sy(B.x, B.y);
    }
    const lw = this.lineWidth();
    if (d.target !== null && !d.ok) {
      const g = this.g;
      g.strokeStyle = 'rgba(255,60,60,0.8)';
      g.lineWidth = lw;
      g.setLineDash([lw, lw]);
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.stroke();
      g.setLineDash([]);
    } else {
      this.g.globalAlpha = 0.75;
      this.lineBody(ax, ay, bx, by, { owner: A.owner }, lw);
      this.g.globalAlpha = 1;
    }
  }

  /* ------------------------------------------------------------------ towers and troops */
  private drawScene(s: GameState): void {
    const g = this.g,
      v = this.view;
    type Item = { y: number; draw: () => void };
    const items: Item[] = [];
    const troopH = Math.max(13, Math.min(24, 30 * v.k));
    for (const u of s.troops) {
      const p = troopPos(s, u);
      const x = v.sx(p.x, p.y),
        y = v.sy(p.x, p.y);
      const B = tower(s, u.dst);
      const dirX = v.sx(B.x, B.y) - v.sx(u.x0, u.y0);
      items.push({
        y,
        draw: () => {
          const sp = troopSprite(u.owner);
          const k = troopH / sp.top;
          const bob = Math.abs(Math.sin(this.time * 14 + u.id)) * 2.2;
          g.save();
          g.translate(x, y - bob);
          if (dirX < 0) g.scale(-1, 1);
          g.drawImage(sp.c, -sp.ax * k, -sp.ay * k, sp.c.width * k, sp.c.height * k);
          g.restore();
        },
      });
    }
    for (const t of s.towers) {
      const x = v.sx(t.x, t.y),
        y = v.sy(t.x, t.y);
      items.push({
        y: y + 1,
        draw: () => {
          const lvl = levelOf(t);
          const sp = towerSprite(t.owner, lvl);
          const pop = this.pop.get(t.id) ?? 0;
          const k = ((radiusOf(t) * v.k * 1.18) / sp.r) * (1 + pop * 0.25);
          const ay = y + radiusOf(t) * v.k * 0.35;
          g.drawImage(sp.c, x - sp.ax * k, ay - sp.ay * k, sp.c.width * k, sp.c.height * k);
          // troop count
          const fs = Math.max(15, Math.min(30, radiusOf(t) * v.k * 0.78));
          const ty = ay - sp.top * k - fs * 0.25;
          g.font = `800 ${fs}px "Baloo 2", "Arial Black", sans-serif`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.lineJoin = 'round';
          g.lineWidth = fs * 0.22;
          g.strokeStyle = '#1d2530';
          const txt = String(Math.floor(t.troops));
          g.strokeText(txt, x, ty);
          g.fillStyle = '#ffffff';
          g.fillText(txt, x, ty);
        },
      });
    }
    items.sort((a, b) => a.y - b.y).forEach((it) => it.draw());
  }

  private drawEffects(dt: number): void {
    const g = this.g;
    for (const [id, p] of this.pop) {
      const n = p - dt * 3;
      if (n <= 0) this.pop.delete(id);
      else this.pop.set(id, n);
    }
    this.rings = this.rings.filter((r) => (r.t += dt) < 0.5);
    for (const r of this.rings) {
      g.strokeStyle = r.color;
      g.globalAlpha = 1 - r.t / 0.5;
      g.lineWidth = 5;
      g.beginPath();
      g.ellipse(r.x, r.y, 20 + r.t * 160, (20 + r.t * 160) * 0.5, 0, 0, TAU);
      g.stroke();
    }
    g.globalAlpha = 1;
    this.particles = this.particles.filter((p) => (p.life -= dt) > 0);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      g.globalAlpha = p.life / p.max;
      g.fillStyle = p.color;
      g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    g.globalAlpha = 1;
  }

  private drawCut(ui: UiState): void {
    const pts = ui.cut;
    if (pts.length < 2) return;
    const g = this.g;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const [w, c] of [
      [9, 'rgba(255,255,255,0.35)'],
      [4, 'rgba(255,255,255,0.95)'],
    ] as const) {
      g.strokeStyle = c;
      g.lineWidth = w;
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.stroke();
    }
  }

  private drawHint(s: GameState, h: NonNullable<UiState['hint']>): void {
    const v = this.view,
      A = tower(s, h.from),
      B = tower(s, h.to);
    const ax = v.sx(A.x, A.y),
      ay = v.sy(A.x, A.y),
      bx = v.sx(B.x, B.y),
      by = v.sy(B.x, B.y);
    const cyc = (this.time % 1.8) / 1.8;
    const k = Math.min(1, Math.max(0, (cyc - 0.15) / 0.65));
    const e = k * k * (3 - 2 * k);
    const x = ax + (bx - ax) * e,
      y = ay + (by - ay) * e;
    const g = this.g;
    g.globalAlpha = cyc < 0.9 ? 1 : 1 - (cyc - 0.9) / 0.1;
    g.setLineDash([8, 8]);
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(x, y);
    g.stroke();
    g.setLineDash([]);
    // hand: a finger pointing up with the tip at (x, y)
    g.save();
    g.translate(x, y);
    g.rotate(-0.35);
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#1d2530';
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(-7, -4, 14, 34, 7);
    g.fill();
    g.stroke();
    g.beginPath();
    g.roundRect(-12, 18, 30, 30, 10);
    g.fill();
    g.stroke();
    g.restore();
    g.globalAlpha = 1;
  }
}
