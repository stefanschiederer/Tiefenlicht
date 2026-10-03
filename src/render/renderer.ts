import { CANNON_RANGE, TEAM_COLORS, TEAM_DARK, WALL_T, themeOf } from '@/game/config';
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
  /** Soft round puff (dust) instead of a square spark. */
  round?: boolean;
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
  /** Cannon aim angle (screen radians) and recoil per tower. */
  private aim = new Map<number, { a: number; kick: number }>();
  private shots: { x1: number; y1: number; x2: number; y2: number; t: number }[] = [];
  /** Hit wobble per tower (1 → 0). */
  private shake = new Map<number, number>();
  private dustAcc = 0;
  private bolts: { x1: number; y1: number; x2: number; y2: number; t: number }[] = [];

  constructor(readonly canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d') as CanvasRenderingContext2D;
  }

  resize(w: number, h: number): void {
    this.dpr = Math.min(3, window.devicePixelRatio || 1);
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
        this.shake.set(t.id, 1);
        if (Math.random() < 0.5) this.burst(v.sx(t.x, t.y), v.sy(t.x, t.y) - 10, '#ffffff', 2);
      } else if (e.type === 'shot') {
        const t = e.tower;
        const sp = towerSprite(t.owner, levelOf(t), t.kind);
        const k = (radiusOf(t) * v.k * 1.18) / sp.r;
        const gx = v.sx(t.x, t.y),
          gy = v.sy(t.x, t.y) + radiusOf(t) * v.k * 0.35 - (sp.gun ?? 0) * k;
        const tx = v.sx(e.x, e.y),
          ty = v.sy(e.x, e.y);
        this.aim.set(t.id, { a: Math.atan2(ty - gy, tx - gx), kick: 1 });
        this.shots.push({ x1: gx, y1: gy, x2: tx, y2: ty, t: 0 });
        this.burst(tx, ty - 6, '#555c66', 6);
        this.burst(tx, ty - 6, '#ffd166', 3);
      } else if (e.type === 'zap') {
        const m = e.tower,
          t = e.target;
        const sp = towerSprite(m.owner, levelOf(m), m.kind);
        const k = (radiusOf(m) * v.k * 1.18) / sp.r;
        const x1 = v.sx(m.x, m.y),
          y1 = v.sy(m.x, m.y) + radiusOf(m) * v.k * 0.35 - (sp.gun ?? 0) * k;
        const x2 = v.sx(t.x, t.y),
          y2 = v.sy(t.x, t.y) - radiusOf(t) * v.k * 0.6;
        this.bolts.push({ x1, y1, x2, y2, t: 0 });
        this.burst(x2, y2, '#c79bff', 18);
        this.burst(x2, y2, '#ffffff', 8);
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
      const avoid = s.towers.map((t) => ({
        x: v.sx(t.x, t.y),
        y: v.sy(t.x, t.y),
        r: radiusOf(t) * v.k * 1.6,
      }));
      drawGround(gg, v.w, v.h, v.playArea(), s.def.n, themeOf(s.def.n).id, avoid);
      for (const w of s.walls)
        drawWall(gg, v.sx(w.x1, w.y1), v.sy(w.x1, w.y1), v.sx(w.x2, w.y2), v.sy(w.x2, w.y2), WALL_T * v.k);
      this.ground = c;
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.ground, 0, 0);
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.drawClouds();
    this.drawSelection(s, ui);
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
  /** Slow cloud shadows drifting over the battlefield. */
  private drawClouds(): void {
    const g = this.g,
      v = this.view;
    const span = v.w + 600;
    for (let i = 0; i < 3; i++) {
      const x = ((this.time * (14 + i * 5) + i * 420) % span) - 300,
        y = v.h * (0.22 + i * 0.3) + Math.sin(this.time * 0.1 + i) * 30;
      const r = 150 + i * 40;
      const grd = g.createRadialGradient(x, y, r * 0.2, x, y, r);
      grd.addColorStop(0, 'rgba(10,30,10,0.10)');
      grd.addColorStop(1, 'rgba(10,30,10,0)');
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(x, y, r * 1.5, r * 0.8, 0, 0, TAU);
      g.fill();
    }
  }

  /** Glow under the tower a line is dragged from and under the hovered target. */
  private drawSelection(s: GameState, ui: UiState): void {
    const d = ui.drag;
    if (!d) return;
    const g = this.g,
      v = this.view;
    const glow = (id: number, color: string) => {
      const t = tower(s, id);
      const x = v.sx(t.x, t.y),
        y = v.sy(t.x, t.y) + radiusOf(t) * v.k * 0.35;
      const r = radiusOf(t) * v.k * (1.7 + 0.12 * Math.sin(this.time * 8));
      const grd = g.createRadialGradient(x, y, r * 0.3, x, y, r);
      grd.addColorStop(0, color);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(x, y, r, r * 0.55, 0, 0, TAU);
      g.fill();
    };
    glow(d.src, 'rgba(255,255,255,0.85)');
    if (d.target !== null) glow(d.target, d.ok ? 'rgba(120,255,120,0.85)' : 'rgba(255,80,80,0.8)');
  }

  private drawScene(s: GameState): void {
    const g = this.g,
      v = this.view;
    // dust kicked up by marching troops
    this.dustAcc += 1;
    const dust = this.dustAcc % 6 === 0;
    type Item = { y: number; draw: () => void };
    const items: Item[] = [];
    const troopH = Math.max(17, Math.min(28, 38 * v.k));
    for (const u of s.troops) {
      const p = troopPos(s, u);
      const x = v.sx(p.x, p.y),
        y = v.sy(p.x, p.y);
      const B = tower(s, u.dst);
      const dirX = v.sx(B.x, B.y) - v.sx(u.x0, u.y0);
      if (dust && Math.random() < 0.35)
        this.particles.push({
          x: x - Math.sign(dirX) * 6,
          y: y - 2,
          vx: -Math.sign(dirX) * 12,
          vy: -10,
          life: 0.5,
          max: 0.5,
          color: 'rgba(240,230,200,0.8)',
          size: 5 + Math.random() * 4,
          round: true,
        });
      items.push({
        y,
        draw: () => {
          const rider = u.speed > 1.2;
          const sp = troopSprite(u.owner, rider);
          const k = (troopH * (rider ? 1.25 : 1)) / sp.top;
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
          const sp = towerSprite(t.owner, lvl, t.kind);
          const pop = this.pop.get(t.id) ?? 0;
          const sh = this.shake.get(t.id) ?? 0;
          const k = ((radiusOf(t) * v.k * 1.18) / sp.r) * (1 + pop * 0.25);
          const ay = y + radiusOf(t) * v.k * 0.35;
          if (t.kind === 'cannon') {
            // range ring on the ground
            g.setLineDash([6, 8]);
            g.strokeStyle = t.owner ? (TEAM_COLORS[t.owner] ?? '#fff') : 'rgba(255,255,255,0.8)';
            g.globalAlpha = 0.45;
            g.lineWidth = 2.5;
            g.beginPath();
            g.arc(x, y, CANNON_RANGE * v.k, 0, TAU);
            g.stroke();
            g.setLineDash([]);
            g.globalAlpha = 1;
          }
          if (sh > 0) {
            // squash and wobble when hit
            const wob = Math.sin(this.time * 70 + t.id) * sh * 2.5,
              sq = 1 - sh * 0.07;
            g.drawImage(sp.c, x - sp.ax * k + wob, ay - sp.ay * k * sq, sp.c.width * k, sp.c.height * k * sq);
          } else g.drawImage(sp.c, x - sp.ax * k, ay - sp.ay * k, sp.c.width * k, sp.c.height * k);
          if (t.kind === 'cannon') this.drawBarrel(t.id, t.owner, x, ay - (sp.gun ?? 0) * k, k);
          // troop count, drawn after all towers so no tower hides it
          const fs = Math.max(18, Math.min(32, radiusOf(t) * v.k * 0.9));
          labels.push({ x, y: ay - sp.top * k - fs * 0.25, fs, txt: String(Math.floor(t.troops)) });
        },
      });
    }
    const labels: { x: number; y: number; fs: number; txt: string }[] = [];
    items.sort((a, b) => a.y - b.y).forEach((it) => it.draw());
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    for (const l of labels) {
      g.font = `800 ${l.fs}px "Baloo 2", "Arial Black", sans-serif`;
      g.lineWidth = l.fs * 0.24;
      g.strokeStyle = '#1d2530';
      g.strokeText(l.txt, l.x, l.y);
      g.fillStyle = '#ffffff';
      g.fillText(l.txt, l.x, l.y);
    }
  }

  /** Cannon barrel turned towards its last target, with a short recoil. */
  private drawBarrel(id: number, owner: number, x: number, y: number, k: number): void {
    const g = this.g;
    const st = this.aim.get(id) ?? { a: owner === 1 ? -Math.PI * 0.3 : -Math.PI * 0.7, kick: 0 };
    const len = 46 * k * (1 - st.kick * 0.25),
      w = 16 * k;
    g.save();
    g.translate(x, y);
    g.rotate(st.a);
    g.fillStyle = '#2e343d';
    g.strokeStyle = '#1d2530';
    g.lineWidth = 3 * k;
    g.beginPath();
    g.roundRect(-w * 0.3, -w / 2, len, w, w * 0.35);
    g.fill();
    g.stroke();
    g.fillStyle = '#4a525e';
    g.beginPath();
    g.roundRect(len - w * 0.5, -w * 0.62, w * 0.5, w * 1.24, 3 * k);
    g.fill();
    g.stroke();
    g.restore();
    g.fillStyle = '#3b4350';
    g.strokeStyle = '#1d2530';
    g.lineWidth = 3 * k;
    g.beginPath();
    g.arc(x, y, 11 * k, 0, TAU);
    g.fill();
    g.stroke();
  }

  private drawEffects(dt: number): void {
    const g = this.g;
    for (const [id, v] of this.shake) {
      const n = v - dt * 6;
      if (n <= 0) this.shake.delete(id);
      else this.shake.set(id, n);
    }
    for (const st of this.aim.values()) st.kick = Math.max(0, st.kick - dt * 5);
    this.bolts = this.bolts.filter((b) => (b.t += dt) < 0.4);
    for (const b of this.bolts) {
      // jagged lightning, re-randomised each frame
      const n = 8;
      const pts: [number, number][] = [[b.x1, b.y1]];
      const nx = -(b.y2 - b.y1),
        ny = b.x2 - b.x1,
        nl = Math.hypot(nx, ny) || 1;
      for (let i = 1; i < n; i++) {
        const f = i / n,
          off = (Math.random() - 0.5) * 26;
        pts.push([b.x1 + (b.x2 - b.x1) * f + (nx / nl) * off, b.y1 + (b.y2 - b.y1) * f + (ny / nl) * off]);
      }
      pts.push([b.x2, b.y2]);
      g.globalAlpha = 1 - b.t / 0.4;
      for (const [w, c] of [
        [9, 'rgba(165,92,255,0.55)'],
        [3, '#ffffff'],
      ] as const) {
        g.strokeStyle = c;
        g.lineWidth = w;
        g.lineJoin = 'round';
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.stroke();
      }
      g.globalAlpha = 1;
    }
    this.shots = this.shots.filter((sh) => (sh.t += dt) < 0.15);
    for (const sh of this.shots) {
      const p = sh.t / 0.15;
      g.fillStyle = '#1d2530';
      g.beginPath();
      g.arc(sh.x1 + (sh.x2 - sh.x1) * p, sh.y1 + (sh.y2 - sh.y1) * p, 4, 0, TAU);
      g.fill();
      if (p < 0.4) {
        g.fillStyle = '#ffd166';
        g.beginPath();
        g.arc(sh.x1, sh.y1, 9 * (1 - p), 0, TAU);
        g.fill();
      }
    }
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
      if (!p.round) p.vy += 300 * dt;
      g.globalAlpha = p.life / p.max;
      g.fillStyle = p.color;
      if (p.round) {
        g.beginPath();
        g.arc(p.x, p.y, p.size * (1.4 - (p.life / p.max) * 0.6), 0, TAU);
        g.fill();
      } else g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
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
