import { FACTIONS, PLAYER, type AbilityId } from '@/data';
import type { GameState, SimEvent, SimNode, Group } from '@/sim/state';
import { nodeDist, nodeRadius, rangeOf } from '@/sim/stats';
import { View } from '../view';
import { TAU, drawTower, drawUnit, glow, pill, poly, rgba } from './shapes';

/** Transient UI state the renderer needs (owned by the app). */
export interface UiState {
  drag: { src: number; path: number[] } | null;
  selected: number[];
  hover: number | null;
  pointer: { x: number; y: number };
  abilityMode: AbilityId | null;
  /** Label shown at the pointer while dragging. */
  dragLabel: string;
  /** Attack preview verdict while dragging onto a foreign node (null = no verdict). */
  dragOk: boolean | null;
  /** Swipe trail (screen coords) while cutting routes. */
  cut: { x: number; y: number }[] | null;
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
interface Zap {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  color: string;
}
interface Mote {
  x: number;
  y: number;
  r: number;
  vy: number;
  ph: number;
  a: number;
}

/** Canvas 2D renderer: reads the sim state, owns all purely visual state (particles, glows, motes). */
export class CanvasRenderer {
  readonly view = new View();
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private staticLayer: HTMLCanvasElement | null = null;
  private staticFor: GameState | null = null;
  private motes: Mote[] = [];
  private particles: Particle[] = [];
  private zaps: Zap[] = [];
  private flash = new Map<number, number>();
  private pulse = new Map<number, number>();
  private elapsed = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  }

  resize(width: number, height: number, insets?: Partial<View['insets']>): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.ceil(width * this.dpr);
    this.canvas.height = Math.ceil(height * this.dpr);
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.view.resize(width, height, insets);
    this.initMotes();
    this.staticLayer = null;
  }

  /** Call when a new level starts. */
  setLevel(state: GameState): void {
    this.particles = [];
    this.zaps = [];
    this.flash.clear();
    this.pulse.clear();
    for (const n of state.nodes) this.pulse.set(n.id, Math.random() * TAU);
    this.staticLayer = null;
    this.staticFor = state;
  }

  /** Screen-space hit test with touch slop. */
  nodeAt(state: GameState, px: number, py: number): SimNode | null {
    const v = this.view;
    for (const n of state.nodes) {
      const r = Math.max(nodeRadius(n) * v.scale + 16 * v.S, 24);
      if (Math.hypot(v.sx(n.x) - px, v.sy(n.y) - py) <= r) return n;
    }
    return null;
  }

  onEvent(e: SimEvent, state: GameState): void {
    const v = this.view;
    switch (e.type) {
      case 'capture':
        this.flash.set(e.node, 1);
        this.burst(v.sx(e.x), v.sy(e.y), FACTIONS[e.by]?.color ?? '#fff', 30);
        break;
      case 'clash':
        this.sparks(v.sx(e.x), v.sy(e.y), FACTIONS[e.a]?.color ?? '#fff', FACTIONS[e.b]?.color ?? null, e.k);
        break;
      case 'zap': {
        const n = state.nodes[e.node] as SimNode;
        this.zaps.push({
          x1: v.sx(e.x1),
          y1: v.sy(e.y1),
          x2: v.sx(e.x2),
          y2: v.sy(e.y2),
          life: 0.16,
          color: FACTIONS[n.owner]?.color ?? '#fff',
        });
        this.sparks(v.sx(e.x2), v.sy(e.y2), FACTIONS[e.target]?.color ?? '#fff', null, e.killed);
        break;
      }
      case 'upgrade':
      case 'convert': {
        const n = state.nodes[e.node] as SimNode;
        this.flash.set(e.node, 0.6);
        this.burst(v.sx(n.x), v.sy(n.y), FACTIONS[n.owner]?.color ?? '#fff', 14);
        break;
      }
      case 'cut':
        this.sparks(v.sx(e.x), v.sy(e.y), '#ffffff', FACTIONS[PLAYER]?.color ?? null, 8);
        break;
      case 'ability': {
        const n = state.nodes[e.node] as SimNode;
        if (e.id === 'stoss') this.burst(v.sx(n.x), v.sy(n.y), '#ffffff', 26);
        if (e.id === 'frost') this.burst(v.sx(n.x), v.sy(n.y), '#9fe4ff', 30);
        if (e.id === 'schild') this.burst(v.sx(n.x), v.sy(n.y), '#9fe4ff', 16);
        break;
      }
      default:
        break;
    }
  }

  private burst(x: number, y: number, color: string, k: number): void {
    const S = this.view.S;
    for (let i = 0; i < k; i++) {
      const a = Math.random() * TAU,
        sp = (50 + Math.random() * 140) * S,
        life = 0.5 + Math.random() * 0.6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life,
        max: life,
        color,
        size: (1.4 + Math.random() * 2.2) * S,
      });
    }
    if (this.particles.length > 700) this.particles.splice(0, this.particles.length - 700);
  }
  private sparks(x: number, y: number, c1: string, c2: string | null, k: number): void {
    const S = this.view.S;
    k = Math.min(10, 2 + Math.ceil(k / 2));
    for (let i = 0; i < k; i++) {
      const a = Math.random() * TAU,
        sp = (25 + Math.random() * 80) * S,
        life = 0.25 + Math.random() * 0.35;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8 * S,
        y: y + (Math.random() - 0.5) * 8 * S,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life,
        max: life,
        color: c2 && Math.random() < 0.5 ? c2 : c1,
        size: (0.9 + Math.random() * 1.4) * S,
      });
    }
    if (this.particles.length > 700) this.particles.splice(0, this.particles.length - 700);
  }

  private initMotes(): void {
    const { width: W, height: H } = this.view;
    this.motes = [];
    for (let i = 0; i < 120; i++) {
      this.motes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.6 + Math.random() * 1.6,
        vy: 4 + Math.random() * 10,
        ph: Math.random() * TAU,
        a: 0.15 + Math.random() * 0.3,
      });
    }
  }

  private buildStatic(state: GameState): void {
    const v = this.view,
      W = v.width,
      H = v.height,
      S = v.S;
    const c = document.createElement('canvas');
    c.width = Math.ceil(W * this.dpr);
    c.height = Math.ceil(H * this.dpr);
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#081527');
    bg.addColorStop(1, '#03080f');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    const lg = g.createRadialGradient(W * 0.5, -H * 0.25, 0, W * 0.5, -H * 0.25, H * 1.05);
    lg.addColorStop(0, 'rgba(70,130,180,.22)');
    lg.addColorStop(1, 'rgba(70,130,180,0)');
    g.fillStyle = lg;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) {
      const x = Math.random() * W,
        y = Math.random() * H,
        r = (0.25 + Math.random() * 0.35) * Math.max(W, H);
      const fg = g.createRadialGradient(x, y, 0, x, y, r);
      fg.addColorStop(0, 'rgba(30,80,120,.10)');
      fg.addColorStop(1, 'rgba(30,80,120,0)');
      g.fillStyle = fg;
      g.fillRect(0, 0, W, H);
    }
    // Blocked connections: faint broken lines so the obstacle reads as "there would be a way".
    g.setLineDash([3, 10 * S]);
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(200,120,120,.22)';
    g.lineCap = 'round';
    for (const [a, b] of state.blocked) {
      const na = state.nodes[a] as SimNode,
        nb = state.nodes[b] as SimNode;
      g.beginPath();
      g.moveTo(v.sx(na.x), v.sy(na.y));
      g.lineTo(v.sx(nb.x), v.sy(nb.y));
      g.stroke();
    }
    g.setLineDash([2, 8 * S]);
    g.lineWidth = 1.5;
    g.strokeStyle = 'rgba(140,200,235,.3)';
    for (const [a, b] of state.edges) {
      const na = state.nodes[a] as SimNode,
        nb = state.nodes[b] as SimNode;
      g.beginPath();
      g.moveTo(v.sx(na.x), v.sy(na.y));
      g.lineTo(v.sx(nb.x), v.sy(nb.y));
      g.stroke();
    }
    g.setLineDash([]);
    const clusters: Record<number, { x: number; y: number; r: number }[]> = {};
    for (const r of state.rocks)
      (clusters[r.c] = clusters[r.c] || []).push({ x: v.sx(r.x), y: v.sy(r.y), r: r.r * v.scale });
    const unionPath = (cl: { x: number; y: number; r: number }[], pad: number) => {
      g.beginPath();
      for (const p of cl) {
        g.moveTo(p.x + p.r + pad, p.y);
        g.arc(p.x, p.y, p.r + pad, 0, TAU);
      }
    };
    for (const cl of Object.values(clusters)) {
      const cx = cl.reduce((s, p) => s + p.x, 0) / cl.length,
        cy = cl.reduce((s, p) => s + p.y, 0) / cl.length,
        ext = Math.max(...cl.map((p) => Math.hypot(p.x - cx, p.y - cy) + p.r));
      g.save();
      g.shadowColor = 'rgba(0,0,0,.8)';
      g.shadowBlur = 30 * S;
      g.fillStyle = '#07111c';
      unionPath(cl, 5);
      g.fill();
      g.restore();
      g.fillStyle = 'rgba(120,175,210,.2)';
      unionPath(cl, 2.5);
      g.fill();
      const rg = g.createRadialGradient(cx - ext * 0.35, cy - ext * 0.4, ext * 0.05, cx, cy, ext);
      rg.addColorStop(0, '#152c44');
      rg.addColorStop(1, '#091522');
      g.fillStyle = rg;
      unionPath(cl, 0);
      g.fill();
      g.save();
      unionPath(cl, 0);
      g.clip();
      for (const p of cl) {
        for (let i = 0; i < 16; i++) {
          const a = Math.random() * TAU,
            d = Math.random() * p.r * 0.95;
          g.fillStyle = Math.random() < 0.7 ? 'rgba(0,0,0,.22)' : 'rgba(150,200,230,.07)';
          g.beginPath();
          g.arc(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 1.5 + Math.random() * 4, 0, TAU);
          g.fill();
        }
      }
      g.restore();
    }
    const vg = g.createRadialGradient(
      W / 2,
      H / 2,
      Math.min(W, H) * 0.3,
      W / 2,
      H / 2,
      Math.max(W, H) * 0.72,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.55)');
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);
    this.staticLayer = c;
    this.staticFor = state;
  }

  private drawAmbient(dt: number): void {
    const ctx = this.ctx,
      { width: W, height: H } = this.view,
      t = this.elapsed;
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++)
      glow(
        ctx,
        W * (0.5 + 0.32 * Math.sin(t * 0.06 + k * 2.1)),
        H * (0.45 + 0.3 * Math.cos(t * 0.045 + k * 1.7)),
        Math.min(W, H) * 0.55,
        '#2f7fb3',
        0.08,
      );
    ctx.globalCompositeOperation = 'source-over';
    for (const m of this.motes) {
      m.y -= m.vy * dt;
      m.x += Math.sin(t * 0.5 + m.ph) * 6 * dt;
      if (m.y < -4) {
        m.y = H + 4;
        m.x = Math.random() * W;
      }
      ctx.fillStyle = `rgba(170,215,245,${m.a})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, TAU);
      ctx.fill();
    }
  }

  private polyline(state: GameState, ids: readonly number[]): void {
    const ctx = this.ctx,
      v = this.view;
    ctx.beginPath();
    ids.forEach((id, i) => {
      const n = state.nodes[id] as SimNode;
      if (i) ctx.lineTo(v.sx(n.x), v.sy(n.y));
      else ctx.moveTo(v.sx(n.x), v.sy(n.y));
    });
  }
  private drawPath(state: GameState, ids: readonly number[], color: string, alpha: number, offset = 0): void {
    if (ids.length < 2) return;
    const ctx = this.ctx,
      v = this.view,
      S = v.S;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(color, 0.2);
    ctx.lineWidth = 9 * S;
    this.polyline(state, ids);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = rgba(color, 0.9);
    ctx.lineWidth = 2 * S;
    ctx.setLineDash([10 * S, 9 * S]);
    ctx.lineDashOffset = -this.elapsed * 46 * S + offset;
    this.polyline(state, ids);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    for (let i = 0; i < ids.length - 1; i++) {
      const a = state.nodes[ids[i] as number] as SimNode,
        b = state.nodes[ids[i + 1] as number] as SimNode;
      const ax = v.sx(a.x),
        ay = v.sy(a.y),
        bx = v.sx(b.x),
        by = v.sy(b.y);
      const ang = Math.atan2(by - ay, bx - ax),
        mx = ax + (bx - ax) * 0.58,
        my = ay + (by - ay) * 0.58,
        s = 6 * S;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(s, 0);
      ctx.lineTo(-s * 0.8, s * 0.8);
      ctx.lineTo(-s * 0.3, 0);
      ctx.lineTo(-s * 0.8, -s * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  private drawRoutes(state: GameState, ui: UiState): void {
    const C = FACTIONS[PLAYER]?.color ?? '#fff',
      ctx = this.ctx,
      v = this.view,
      S = v.S;
    if (!state.demo)
      for (const n of state.nodes)
        if (n.owner === PLAYER) n.routes.forEach((r, i) => this.drawPath(state, [n.id, ...r], C, 1, i * 6));
    if (ui.drag) {
      this.drawPath(state, ui.drag.path, C, 0.75);
      const lastN = state.nodes[ui.drag.path[ui.drag.path.length - 1] as number] as SimNode;
      if (ui.hover === null) {
        ctx.save();
        ctx.strokeStyle = rgba(C, 0.45);
        ctx.lineWidth = 1.5 * S;
        ctx.setLineDash([4 * S, 6 * S]);
        ctx.beginPath();
        ctx.moveTo(v.sx(lastN.x), v.sy(lastN.y));
        ctx.lineTo(ui.pointer.x, ui.pointer.y);
        ctx.stroke();
        ctx.restore();
      }
      pill(
        ctx,
        ui.dragLabel,
        ui.pointer.x,
        ui.pointer.y - 26 * S,
        Math.round(12 * S),
        ui.dragOk === null ? C : ui.dragOk ? '#8ff0a4' : '#ff7b8f',
      );
    }
    if (ui.cut && ui.cut.length > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 2 * S;
      ctx.beginPath();
      ui.cut.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      ctx.stroke();
      ctx.restore();
    }
  }
  private drawNode(state: GameState, n: SimNode, ui: UiState): void {
    const ctx = this.ctx,
      v = this.view,
      S = v.S;
    const x = v.sx(n.x),
      y = v.sy(n.y),
      r = nodeRadius(n) * v.scale,
      C = FACTIONS[n.owner]?.color ?? '#fff',
      own = n.owner > 0,
      ph = this.pulse.get(n.id) ?? 0,
      pulse = 0.5 + 0.5 * Math.sin(this.elapsed * 2 + ph);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, r * (own ? 2.6 : 2.0), C, own ? 0.5 + 0.15 * pulse : 0.28);
    if (n.type === 'quelle' && own) glow(ctx, x, y, r * 3.6, C, 0.12 + 0.12 * pulse);
    if (n.type === 'waechter' && own) {
      ctx.strokeStyle = rgba(C, 0.14);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 7]);
      ctx.beginPath();
      ctx.arc(x, y, rangeOf(state, n) * v.scale, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalCompositeOperation = 'source-over';
    drawTower(ctx, x, y, r, n.type, C, own, this.elapsed + ph, n.level);
    if (n.frozen > 0) {
      ctx.strokeStyle = `rgba(170,230,255,${0.5 + 0.3 * pulse})`;
      ctx.lineWidth = 2 * S;
      poly(ctx, x, y, r * 1.12, 6, this.elapsed * 0.4);
      ctx.stroke();
      ctx.fillStyle = 'rgba(170,230,255,.18)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(220,245,255,.9)';
      for (let k = 0; k < 6; k++) {
        const a = (k * TAU) / 6 + this.elapsed * 0.4;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r * 1.12, y + Math.sin(a) * r * 1.12, 1.6 * S, 0, TAU);
        ctx.fill();
      }
    }
    if (n.shield > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(160,230,255,${0.6 + 0.3 * pulse})`;
      ctx.lineWidth = 2.5 * S;
      poly(ctx, x, y, r * 1.3, 6, -this.elapsed * 0.8);
      ctx.stroke();
      glow(ctx, x, y, r * 2.2, '#9fe4ff', 0.3);
      ctx.globalCompositeOperation = 'source-over';
    }
    const fl = this.flash.get(n.id) ?? 0;
    if (fl > 0) {
      ctx.globalAlpha = fl;
      ctx.strokeStyle = C;
      ctx.lineWidth = 3 * S;
      ctx.beginPath();
      ctx.arc(x, y, r + (1 - fl) * 46 * S, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const dragEnd = ui.drag ? (ui.drag.path[ui.drag.path.length - 1] as number) : null;
    if (ui.selected.includes(n.id) || (ui.drag && ui.drag.src === n.id)) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.6 * S;
      ctx.setLineDash([6 * S, 5 * S]);
      ctx.lineDashOffset = -this.elapsed * 18;
      ctx.beginPath();
      ctx.arc(x, y, r + 9 * S, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    } else if (
      (dragEnd !== null && dragEnd !== n.id && ui.hover === n.id) ||
      (ui.abilityMode && ui.hover === n.id)
    ) {
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2 * S;
      ctx.beginPath();
      ctx.arc(x, y, r + 9 * S, 0, TAU);
      ctx.stroke();
    }
  }
  private drawGroup(state: GameState, g: Group): void {
    const ctx = this.ctx,
      v = this.view,
      S = v.S;
    const C = FACTIONS[g.owner]?.color ?? '#fff',
      a = state.nodes[g.from] as SimNode,
      b = state.nodes[g.to] as SimNode,
      U = g.unit;
    const gx = v.sx(g.x),
      gy = v.sy(g.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x),
      dx = Math.cos(ang),
      dy = Math.sin(ang),
      nx = -dy,
      ny = dx;
    const big = U === 'panzer' || U === 'stachel',
      gap = (big ? 7.5 : 5.5) * S,
      n = Math.max(1, Math.round(g.n)),
      count = Math.min(n, big ? 14 : 18),
      traveled = g.t * nodeDist(a, b) * v.scale + nodeRadius(a) * v.scale * 0.5;
    glow(ctx, gx, gy, (10 + Math.min(g.n, 40) * 0.4) * S, C, 0.55);
    for (let i = 0; i < count; i++) {
      const back = i * gap;
      if (back > traveled) break;
      const wob =
        U === 'drohnen'
          ? Math.sin(this.elapsed * 14 + i * 1.9) * 2.4 * S
          : U === 'pfeile'
            ? 0
            : Math.sin(this.elapsed * 9 + i * 1.9) * 1.4 * S;
      const lane = (((i * 7) % 5) - 2) * (big ? 3.4 : 2.6) * S + wob;
      ctx.globalAlpha = 0.95 - i * 0.035;
      drawUnit(ctx, gx - dx * back + nx * lane, gy - dy * back + ny * lane, ang, U, C, S);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(gx + dx * 2 * S, gy + dy * 2 * S, 1.6 * S, 0, TAU);
    ctx.fill();
  }
  private drawEffects(dt: number): void {
    const ctx = this.ctx,
      S = this.view.S;
    const damp = Math.pow(0.05, dt);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= damp;
      p.vy *= damp;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const z of this.zaps) z.life -= dt;
    this.zaps = this.zaps.filter((z) => z.life > 0);
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const z of this.zaps) {
      const a = z.life / 0.16,
        mx = (z.x1 + z.x2) / 2 + (Math.random() - 0.5) * 12 * S,
        my = (z.y1 + z.y2) / 2 + (Math.random() - 0.5) * 12 * S;
      ctx.strokeStyle = rgba(z.color, a);
      ctx.lineWidth = 2.2 * S;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(z.x1, z.y1);
      ctx.lineTo(mx, my);
      ctx.lineTo(z.x2, z.y2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${a * 0.8})`;
      ctx.lineWidth = 0.9 * S;
      ctx.stroke();
      glow(ctx, z.x2, z.y2, 14 * S, z.color, a);
    }
  }

  /** Draws one frame. `dt` is wall-clock seconds (effects keep animating while paused). */
  render(state: GameState, ui: UiState, dt: number): void {
    this.elapsed += dt;
    for (const [id, f] of this.flash) {
      const nf = f - dt * 1.4;
      if (nf <= 0) this.flash.delete(id);
      else this.flash.set(id, nf);
    }
    if (!this.staticLayer || this.staticFor !== state) this.buildStatic(state);
    const ctx = this.ctx,
      v = this.view,
      S = v.S;
    ctx.drawImage(this.staticLayer as HTMLCanvasElement, 0, 0, v.width, v.height);
    this.drawAmbient(dt);
    this.drawRoutes(state, ui);
    for (const n of state.nodes) this.drawNode(state, n, ui);
    ctx.globalCompositeOperation = 'lighter';
    for (const g of state.groups) this.drawGroup(state, g);
    this.drawEffects(dt);
    ctx.globalCompositeOperation = 'source-over';
    for (const n of state.nodes) {
      pill(
        ctx,
        String(Math.floor(n.units)),
        v.sx(n.x),
        v.sy(n.y) + nodeRadius(n) * v.scale + 11 * S,
        Math.round(12 * S),
        n.owner === PLAYER && !state.demo ? '#fff' : 'rgba(255,255,255,.85)',
      );
    }
    for (const g of state.groups) {
      if (g.n < 1.5) continue;
      const a = state.nodes[g.from] as SimNode,
        b = state.nodes[g.to] as SimNode,
        ang = Math.atan2(b.y - a.y, b.x - a.x);
      pill(
        ctx,
        String(Math.round(g.n)),
        v.sx(g.x) - Math.sin(ang) * 14 * S,
        v.sy(g.y) + Math.cos(ang) * 14 * S,
        Math.round(10 * S),
      );
    }
  }
}
