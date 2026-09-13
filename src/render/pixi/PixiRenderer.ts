import {
  Application,
  BitmapFont,
  BitmapText,
  Container,
  Graphics,
  Particle,
  ParticleContainer,
  Sprite,
} from 'pixi.js';
import { AdvancedBloomFilter } from 'pixi-filters';
import { FACTIONS, PLAYER, WORLD_H, WORLD_W, type NodeType } from '@/data';
const FACTION_HEX = FACTIONS.map((f) => f.color);
import type { Barrier, GameState, Group, Mine, SimEvent, SimNode } from '@/sim/state';
import { nodeDist, nodeRadius, rangeOf } from '@/sim/stats';
import type { GraphicsQuality, Renderer, UiState } from '../renderer';
import { View } from '../view';
import {
  NODE_R,
  TEX_SCALE,
  backgroundTexture,
  detailTexture,
  dotTexture,
  glowTexture,
  platformTexture,
  ringTexture,
  rockClusterTexture,
  rotorTexture,
  shaftTexture,
  unitTexture,
  plantTexture,
  barrierTexture,
  mineTexture,
  sandTexture,
  tintedTexture,
} from './textures';
import { CausticsFilter } from './caustics';

const TAU = Math.PI * 2;
const colorNum = (hex: string): number => parseInt(hex.slice(1), 16);
const FACTION_COLORS = FACTIONS.map((f) => colorNum(f.color));
const LABEL_FONT = 'TiefenlichtLabel';
const ROTOR_SPEED: Record<NodeType, number> = {
  nest: 0.4,
  brut: 0.6,
  bastion: 0,
  strom: 2.6,
  waechter: 1.8,
  quelle: 1.2,
};

interface NodeView {
  root: Container;
  glow: Sprite;
  aura: Sprite;
  platform: Sprite;
  detail: Sprite;
  rotor: Sprite | null;
  rings: Sprite[];
  range: Graphics;
  status: Graphics;
  label: BitmapText;
  phase: number;
  flash: number;
  color: string;
  type: NodeType;
  level: number;
}
interface GroupView {
  root: Container;
  glow: Sprite;
  units: Sprite[];
  label: BitmapText;
  unit: string;
  color: string;
}
interface FxParticle {
  p: Particle;
  vx: number;
  vy: number;
  life: number;
  max: number;
}
interface Zap {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  color: number;
}
interface Mote {
  p: Particle;
  vy: number;
  ph: number;
  depth: number;
  a: number;
}

/** PixiJS (WebGL) renderer: world container under a camera, generated sprites, additive glow + bloom. */
export class PixiRenderer implements Renderer {
  readonly view = new View();
  readonly kind = 'pixi' as const;
  canvas!: HTMLCanvasElement;
  private app!: Application;
  quality: GraphicsQuality = 'hoch';
  private bloom: AdvancedBloomFilter | null = null;
  private slowFrames = 0;
  private frameSamples = 0;
  private frameTime = 0;
  /** Called when the renderer lowers its quality on its own (frame budget). */
  onQualityChange: ((q: GraphicsQuality) => void) | null = null;
  private elapsed = 0;
  // layers
  private bg = new Container();
  private bgSprite!: Sprite;
  private shafts: Sprite[] = [];
  private fogs: Sprite[] = [];
  private motes: Mote[] = [];
  private moteLayer!: ParticleContainer;
  private world = new Container();
  private rocks = new Container();
  private edges = new Graphics();
  private routes = new Graphics();
  private lights = new Container();
  private nodesLayer = new Container();
  private groupsLayer = new Container();
  private fx!: ParticleContainer;
  private zapsG = new Graphics();
  private overlay = new Container();
  private cutG = new Graphics();
  private labels = new Container();
  private dragLabel!: BitmapText;
  private dragPill = new Graphics();
  // state
  private nodeViews = new Map<number, NodeView>();
  private groupViews = new Map<number, GroupView>();
  private particles: FxParticle[] = [];
  private zaps: Zap[] = [];
  private levelFor: GameState | null = null;
  private reducedMotion = false;
  private caustics: CausticsFilter | null = null;
  private plants: { s: Sprite; ph: number; base: number }[] = [];
  private plantLayer = new Container();
  private obstacles = new Container();
  private barrierViews: { s: Sprite; hp: Graphics; ref: Barrier }[] = [];
  private mineViews: { s: Sprite; ref: Mine; ph: number }[] = [];
  private trailAcc = 0;

  static async create(canvas: HTMLCanvasElement, quality: GraphicsQuality): Promise<PixiRenderer> {
    const r = new PixiRenderer();
    r.quality = quality;
    r.reducedMotion =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const app = new Application();
    await app.init({
      canvas,
      preference: 'webgl',
      antialias: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true,
      backgroundAlpha: 1,
      background: 0x37b7d6,
      powerPreference: 'high-performance',
    });
    app.ticker.stop();
    r.app = app;
    r.canvas = canvas;
    try {
      r.build();
    } catch (err) {
      app.destroy(false, { children: true });
      throw err;
    }
    return r;
  }

  private build(): void {
    BitmapFont.install({
      name: LABEL_FONT,
      style: {
        fontFamily: 'Avenir Next, Segoe UI, Helvetica Neue, Arial, sans-serif',
        fontSize: 28,
        fontWeight: '600',
        fill: '#ffffff',
        stroke: { color: '#04101c', width: 5 },
      },
      chars: [['a', 'z'], ['A', 'Z'], ['0', '9'], ' .,:;!?%()+-→✓✗äöüÄÖÜß×'],
      resolution: 2,
    });
    const stage = this.app.stage;
    // background (screen space)
    this.bgSprite = new Sprite(backgroundTexture());
    this.bg.addChild(this.bgSprite);
    for (let i = 0; i < 3; i++) {
      const f = new Sprite(glowTexture());
      f.anchor.set(0.5);
      f.tint = 0xffffff;
      f.alpha = 0.1;
      f.blendMode = 'add';
      this.fogs.push(f);
      this.bg.addChild(f);
    }
    for (let i = 0; i < 4; i++) {
      const s = new Sprite(shaftTexture());
      s.anchor.set(0.5, 0);
      s.tint = 0xffffff;
      s.alpha = 0.06 + i * 0.015;
      s.blendMode = 'add';
      this.shafts.push(s);
      this.bg.addChild(s);
    }
    this.moteLayer = new ParticleContainer({ dynamicProperties: { position: true, color: true } });
    this.moteLayer.blendMode = 'add';
    this.bg.addChild(this.moteLayer);
    stage.addChild(this.bg);
    if (this.quality === 'hoch' && this.app.renderer.type === 1) {
      this.caustics = new CausticsFilter(0.1);
      this.bg.filters = [this.caustics];
    }
    // world
    this.world.addChild(
      this.plantLayer,
      this.rocks,
      this.edges,
      this.routes,
      this.obstacles,
      this.lights,
      this.nodesLayer,
      this.groupsLayer,
    );
    this.fx = new ParticleContainer({ dynamicProperties: { position: true, color: true } });
    this.fx.blendMode = 'add';
    this.lights.blendMode = 'normal';
    this.world.addChild(this.fx, this.zapsG);
    stage.addChild(this.world);
    if (this.quality === 'hoch') {
      this.bloom = new AdvancedBloomFilter({
        threshold: 0.45,
        bloomScale: 0.9,
        brightness: 1.0,
        blur: 6,
        quality: 4,
      });
      this.bloom.resolution = 0.5;
      this.world.filters = [this.bloom];
    }
    // overlay (screen space)
    this.dragLabel = new BitmapText({ text: '', style: { fontFamily: LABEL_FONT, fontSize: 14 } });
    this.dragLabel.anchor.set(0.5);
    this.overlay.addChild(this.labels, this.cutG, this.dragPill, this.dragLabel);
    stage.addChild(this.overlay);
  }

  resize(width: number, height: number, insets?: Partial<View['insets']>): void {
    this.app.renderer.resize(width, height);
    this.view.resize(width, height, insets);
    this.bgSprite.width = width;
    this.bgSprite.height = height;
    this.fogs.forEach((f) => (f.width = f.height = Math.min(width, height) * 1.4));
    this.shafts.forEach((s, i) => {
      s.height = height * 1.3;
      s.width = 90 + i * 40;
      s.position.set(width * (0.15 + i * 0.22), -20);
      s.rotation = (i % 2 ? -1 : 1) * 0.12;
    });
    this.initMotes();
    this.syncCamera();
  }

  private initMotes(): void {
    this.moteLayer.removeParticles();
    this.motes = [];
    const { width: W, height: H } = this.view;
    const n = this.quality === 'hoch' ? 160 : 80;
    for (let i = 0; i < n; i++) {
      const depth = 0.3 + Math.random() * 0.7;
      const p = new Particle({
        texture: dotTexture(),
        x: Math.random() * W,
        y: Math.random() * H,
        anchorX: 0.5,
        anchorY: 0.5,
        scaleX: 0.12 * depth,
        scaleY: 0.12 * depth,
        tint: 0xaad7f5,
        alpha: 0.15 + Math.random() * 0.3 * depth,
      });
      this.moteLayer.addParticle(p);
      this.motes.push({
        p,
        vy: (4 + Math.random() * 10) * depth,
        ph: Math.random() * TAU,
        depth,
        a: p.alpha,
      });
    }
  }

  private syncCamera(): void {
    this.world.position.set(this.view.offsetX, this.view.offsetY);
    this.world.scale.set(this.view.scale);
  }

  setLevel(state: GameState): void {
    this.levelFor = state;
    for (const v of this.nodeViews.values()) v.root.destroy({ children: true });
    for (const v of this.groupViews.values()) v.root.destroy({ children: true });
    this.nodeViews.clear();
    this.groupViews.clear();
    this.lights.removeChildren().forEach((c) => c.destroy());
    this.labels.removeChildren().forEach((c) => c.destroy());
    this.rocks.removeChildren().forEach((c) => c.destroy({ texture: true, textureSource: true }));
    this.fx.removeParticles();
    this.particles = [];
    this.zaps = [];
    this.view.resetCamera();
    this.syncCamera();
    // rocks
    const clusters = new Map<number, typeof state.rocks>();
    for (const r of state.rocks) {
      if (!clusters.has(r.c)) clusters.set(r.c, []);
      clusters.get(r.c)?.push(r);
    }
    for (const [c, cl] of clusters) {
      const t = rockClusterTexture(cl, state.def.seed * 31 + c);
      const s = new Sprite(t.texture);
      s.position.set(t.x, t.y);
      s.width = t.w;
      s.height = t.h;
      this.rocks.addChild(s);
    }
    // edges: dotted paths; blocked edges as faint red dashes
    const g = this.edges.clear();
    for (const [a, b] of state.blocked) {
      const na = state.nodes[a] as SimNode,
        nb = state.nodes[b] as SimNode;
      dashed(g, na.x, na.y, nb.x, nb.y, 4, 12, 0);
      g.stroke({ width: 2, color: 0xff4f7d, alpha: 0.45, cap: 'round' });
    }
    for (const [a, b] of state.edges) {
      const na = state.nodes[a] as SimNode,
        nb = state.nodes[b] as SimNode;
      const len = Math.hypot(nb.x - na.x, nb.y - na.y),
        n = Math.max(2, Math.round(len / 11));
      for (let i = 1; i < n; i++) {
        const t = i / n;
        g.circle(na.x + (nb.x - na.x) * t, na.y + (nb.y - na.y) * t, 2.2);
      }
    }
    g.fill({ color: 0xffffff, alpha: 0.75 });
    // border flora: kelp and corals along the bottom, sea fans on the sides (world space, behind everything)
    this.plantLayer.removeChildren().forEach((c) => c.destroy());
    this.plants = [];
    {
      // sand floor strip along the bottom of the world
      const sand = new Sprite(sandTexture());
      sand.anchor.set(0, 0);
      sand.position.set(-200, WORLD_H - 60);
      sand.width = WORLD_W + 400;
      sand.height = 160;
      this.plantLayer.addChild(sand);
    }
    if (this.quality !== 'niedrig') {
      let seed = state.def.seed * 17 + 5;
      const rand = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
      const place = (
        x: number,
        y: number,
        kind: 'fan' | 'kelp' | 'brain' | 'tube',
        scale: number,
        flip: boolean,
      ) => {
        const sp = new Sprite(plantTexture(kind, Math.floor(rand() * 1000)));
        sp.anchor.set(0.5, 1);
        sp.position.set(x, y);
        sp.scale.set(scale * (flip ? -1 : 1), scale);
        sp.alpha = 0.95;
        this.plantLayer.addChild(sp);
        this.plants.push({ s: sp, ph: rand() * TAU, base: sp.rotation });
      };
      for (let x = 30; x < WORLD_W; x += 70 + rand() * 90) {
        const r = rand();
        const kind = r < 0.35 ? 'kelp' : r < 0.6 ? 'fan' : r < 0.8 ? 'brain' : 'tube';
        place(x, WORLD_H - 10 + rand() * 24, kind, 0.5 + rand() * 0.5, rand() < 0.5);
      }
      for (let y = 120; y < WORLD_H - 60; y += 140 + rand() * 120) {
        place(-10 + rand() * 30, y, 'fan', 0.4 + rand() * 0.4, false);
        place(WORLD_W + 10 - rand() * 30, y + 60, 'fan', 0.4 + rand() * 0.4, true);
      }
    }
    // obstacles
    this.obstacles.removeChildren().forEach((c) => c.destroy());
    this.barrierViews = [];
    this.mineViews = [];
    for (const b of state.barriers) {
      const na = state.nodes[b.a] as SimNode,
        nb = state.nodes[b.b] as SimNode;
      const sp = new Sprite(barrierTexture());
      sp.anchor.set(0.5);
      sp.position.set(b.x, b.y);
      sp.rotation = Math.atan2(nb.y - na.y, nb.x - na.x);
      sp.scale.set(0.6);
      const hp = new Graphics();
      this.obstacles.addChild(sp, hp);
      this.barrierViews.push({ s: sp, hp, ref: b });
    }
    for (const m of state.mines) {
      const sp = new Sprite(mineTexture());
      sp.anchor.set(0.5);
      sp.position.set(m.x, m.y);
      sp.scale.set(0.7);
      this.obstacles.addChild(sp);
      this.mineViews.push({ s: sp, ref: m, ph: Math.random() * TAU });
    }
    // nodes
    for (const n of state.nodes) this.nodeViews.set(n.id, this.makeNodeView(n));
  }

  private makeNodeView(n: SimNode): NodeView {
    const root = new Container();
    root.position.set(n.x, n.y);
    const glow = new Sprite(glowTexture());
    glow.anchor.set(0.5);
    glow.blendMode = 'add';
    const aura = new Sprite(glowTexture());
    aura.anchor.set(0.5);
    aura.blendMode = 'add';
    aura.visible = false;
    const platform = new Sprite(platformTexture(n.type, n.level));
    platform.anchor.set(0.5);
    const detail = new Sprite(detailTexture(n.type, n.level));
    detail.anchor.set(0.5);
    const rt = rotorTexture(n.type, n.level);
    const rotor = rt ? new Sprite(rt) : null;
    if (rotor) rotor.anchor.set(0.5);
    const rings = [0, 1].map(() => {
      const s = new Sprite(ringTexture());
      s.anchor.set(0.5);
      s.visible = false;
      return s;
    });
    const range = new Graphics();
    const status = new Graphics();
    this.lights.addChild(glow, aura);
    root.addChild(
      range,
      platform,
      detail,
      ...(rotor ? [rotor] : []),
      rings[0] as Sprite,
      rings[1] as Sprite,
      status,
    );
    this.nodesLayer.addChild(root);
    const label = new BitmapText({ text: '0', style: { fontFamily: LABEL_FONT, fontSize: 13 } });
    label.anchor.set(0.5);
    this.labels.addChild(label);
    return {
      root,
      glow,
      aura,
      platform,
      detail,
      rotor,
      rings,
      range,
      status,
      label,
      phase: Math.random() * TAU,
      flash: 0,
      color: '',
      type: n.type,
      level: n.level,
    };
  }

  onEvent(e: SimEvent, state: GameState): void {
    switch (e.type) {
      case 'capture': {
        const nv = this.nodeViews.get(e.node);
        if (nv) nv.flash = 1;
        this.burst(e.x, e.y, FACTION_COLORS[e.by] ?? 0xffffff, 34);
        break;
      }
      case 'clash':
        this.sparks(e.x, e.y, FACTION_COLORS[e.a] ?? 0xffffff, FACTION_COLORS[e.b] ?? null, e.k);
        break;
      case 'zap': {
        const n = state.nodes[e.node] as SimNode;
        this.zaps.push({
          x1: e.x1,
          y1: e.y1,
          x2: e.x2,
          y2: e.y2,
          life: 0.18,
          color: FACTION_COLORS[n.owner] ?? 0xffffff,
        });
        this.sparks(e.x2, e.y2, FACTION_COLORS[e.target] ?? 0xffffff, null, e.killed);
        break;
      }
      case 'upgrade':
      case 'convert': {
        const n = state.nodes[e.node] as SimNode;
        const nv = this.nodeViews.get(e.node);
        if (nv) {
          nv.flash = 0.7;
          this.rebuildNode(n);
          const nv2 = this.nodeViews.get(e.node);
          if (nv2) nv2.flash = 0.7;
        }
        this.burst(n.x, n.y, FACTION_COLORS[n.owner] ?? 0xffffff, 16);
        break;
      }
      case 'cut':
        this.sparks(e.x, e.y, 0xffffff, FACTION_COLORS[PLAYER] ?? null, 8);
        break;
      case 'barrier':
        this.sparks(e.x, e.y, 0xff9ac0, FACTION_COLORS[e.owner] ?? null, 6);
        if (e.broken) this.burst(e.x, e.y, 0xff9ac0, 26);
        break;
      case 'mine':
        this.burst(e.x, e.y, 0xff5a6e, 30);
        break;
      case 'ability': {
        const n = state.nodes[e.node] as SimNode;
        this.burst(n.x, n.y, e.id === 'stoss' ? 0xffffff : 0x9fe4ff, e.id === 'frost' ? 30 : 22);
        break;
      }
      default:
        break;
    }
  }

  private rebuildNode(n: SimNode): void {
    const old = this.nodeViews.get(n.id);
    if (!old) return;
    old.root.destroy({ children: true });
    old.glow.destroy();
    old.aura.destroy();
    old.label.destroy();
    this.nodeViews.set(n.id, this.makeNodeView(n));
  }

  private spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    color: number,
    size: number,
  ): void {
    if (this.particles.length > 900) {
      const old = this.particles.shift();
      if (old) this.fx.removeParticle(old.p);
    }
    const p = new Particle({
      texture: dotTexture(),
      x,
      y,
      anchorX: 0.5,
      anchorY: 0.5,
      scaleX: size / 8,
      scaleY: size / 8,
      tint: color,
      alpha: 1,
    });
    this.fx.addParticle(p);
    this.particles.push({ p, vx, vy, life, max: life });
  }
  private burst(x: number, y: number, color: number, k: number): void {
    for (let i = 0; i < k; i++) {
      const a = Math.random() * TAU,
        sp = 50 + Math.random() * 140,
        life = 0.5 + Math.random() * 0.6;
      this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, life, color, 1.6 + Math.random() * 2.4);
    }
  }
  private sparks(x: number, y: number, c1: number, c2: number | null, k: number): void {
    k = Math.min(10, 2 + Math.ceil(k / 2));
    for (let i = 0; i < k; i++) {
      const a = Math.random() * TAU,
        sp = 25 + Math.random() * 80,
        life = 0.25 + Math.random() * 0.35;
      this.spawn(
        x + (Math.random() - 0.5) * 8,
        y + (Math.random() - 0.5) * 8,
        Math.cos(a) * sp,
        Math.sin(a) * sp,
        life,
        c2 !== null && Math.random() < 0.5 ? c2 : c1,
        1 + Math.random() * 1.6,
      );
    }
  }

  private updateBackground(dt: number): void {
    const { width: W, height: H } = this.view,
      t = this.elapsed;
    this.fogs.forEach((f, k) =>
      f.position.set(
        W * (0.5 + 0.32 * Math.sin(t * 0.06 + k * 2.1)),
        H * (0.45 + 0.3 * Math.cos(t * 0.045 + k * 1.7)),
      ),
    );
    this.shafts.forEach((s, i) => {
      s.alpha = 0.05 + 0.04 * (0.5 + 0.5 * Math.sin(t * 0.25 + i * 1.3));
      s.skew.x = 0.05 * Math.sin(t * 0.1 + i);
    });
    // parallax: motes drift with a fraction of the camera offset
    const px = (this.view.cx - WORLD_W / 2) * this.view.scale,
      py = (this.view.cy - WORLD_H / 2) * this.view.scale;
    for (const m of this.motes) {
      m.p.y -= m.vy * dt;
      m.p.x += Math.sin(t * 0.5 + m.ph) * 6 * dt;
      if (m.p.y < -6) {
        m.p.y = H + 6;
        m.p.x = Math.random() * W;
      }
      this.moteLayer.update();
      m.p.x -= px * 0.002 * m.depth * dt;
      m.p.y -= py * 0.002 * m.depth * dt;
      m.p.alpha = m.a * (0.7 + 0.3 * Math.sin(t * 1.3 + m.ph));
    }
    this.moteLayer.update();
  }

  private updateNodes(state: GameState, ui: UiState, dt: number): void {
    const t = this.elapsed;
    const dragEnd = ui.drag ? (ui.drag.path[ui.drag.path.length - 1] as number) : null;
    for (const n of state.nodes) {
      const nv = this.nodeViews.get(n.id);
      if (!nv) continue;
      const r = nodeRadius(n) * this.view.nodeScale,
        k = r / NODE_R / TEX_SCALE,
        C = FACTION_COLORS[n.owner] ?? 0xffffff,
        own = n.owner > 0,
        pulse = 0.5 + 0.5 * Math.sin(t * 2 + nv.phase),
        breathe = this.reducedMotion ? 1 : 1 + 0.02 * Math.sin(t * 1.6 + nv.phase);
      nv.flash = Math.max(0, nv.flash - dt * 1.4);
      nv.root.scale.set(k * breathe * (1 + nv.flash * nv.flash * 0.18));
      const hex = FACTION_HEX[n.owner] ?? '#ffffff';
      if (nv.color !== hex) {
        // Pre-tinted textures instead of runtime tint (identical on WebGL and the canvas fallback).
        nv.color = hex;
        nv.detail.texture = tintedTexture(detailTexture(n.type, n.level), hex);
        const rt = rotorTexture(n.type, n.level);
        if (nv.rotor && rt) nv.rotor.texture = tintedTexture(rt, hex);
        const ring = tintedTexture(ringTexture(), hex);
        nv.rings.forEach((rs) => (rs.texture = ring));
        nv.glow.texture = tintedTexture(glowTexture(), hex);
        nv.aura.texture = nv.glow.texture;
      }
      nv.detail.alpha = 1;
      nv.platform.alpha = 1;
      if (nv.rotor && !this.reducedMotion) nv.rotor.rotation = t * ROTOR_SPEED[n.type] + nv.phase;
      nv.rings.forEach((rs, i) => {
        rs.visible = n.level > i + 1;
        rs.alpha = 0.6;
        rs.scale.set(1 + i * 0.07);
      });
      // glows are off in the lagoon theme (they wash out on bright water)
      nv.glow.visible = false;
      nv.glow.position.set(n.x, n.y);
      nv.glow.width = nv.glow.height = r * (own ? 3.6 : 2.6);
      nv.glow.alpha = own ? 0.35 + 0.1 * pulse : 0.12;
      nv.aura.visible = false;
      if (nv.aura.visible) {
        nv.aura.position.set(n.x, n.y);
        nv.aura.width = nv.aura.height = r * 7.2;
        nv.aura.alpha = 0.1 + 0.1 * pulse;
      }
      // range ring for towers (in root space, unscaled by k: draw in world units / root scale)
      const rg = nv.range.clear();
      if (n.type === 'waechter' && own) {
        rg.circle(0, 0, rangeOf(state, n) / (k * breathe));
        rg.stroke({ width: 1 / k, color: C, alpha: 0.16 });
      }
      // status: frozen / shield / flash / selection — drawn in root space (radius NODE_R*TEX_SCALE = node radius)
      const R = NODE_R * TEX_SCALE;
      const sg = nv.status.clear();
      if (n.frozen > 0) {
        polygon(sg, 0, 0, R * 1.12, 6, t * 0.4);
        sg.stroke({ width: 3, color: 0xaae6ff, alpha: 0.5 + 0.3 * pulse });
        sg.circle(0, 0, R).fill({ color: 0xaae6ff, alpha: 0.18 });
      }
      if (n.shield > 0) {
        polygon(sg, 0, 0, R * 1.3, 6, -t * 0.8);
        sg.stroke({ width: 3.5, color: 0xa0e6ff, alpha: 0.6 + 0.3 * pulse });
      }
      if (nv.flash > 0) {
        sg.circle(0, 0, R + (1 - nv.flash) * 60);
        sg.stroke({ width: 4, color: C, alpha: nv.flash });
      }
      const selected = ui.selected.includes(n.id) || (ui.drag && ui.drag.src === n.id);
      if (selected) {
        dashedCircle(sg, R + 12, 14, -t * 24);
        sg.stroke({ width: 3, color: 0x10324a, alpha: 0.9 });
      } else if (
        (dragEnd !== null && dragEnd !== n.id && ui.hover === n.id) ||
        (ui.abilityMode && ui.hover === n.id)
      ) {
        sg.circle(0, 0, R + 12);
        sg.stroke({ width: 3, color: 0x10324a, alpha: 0.7 });
      }
      // label (screen space)
      nv.label.text = String(Math.floor(n.units));
      nv.label.position.set(this.view.sx(n.x), this.view.sy(n.y) + r * this.view.scale + 11 * this.view.S);
      nv.label.scale.set(this.view.S * 0.95);
      nv.label.alpha = n.owner === PLAYER && !state.demo ? 1 : 0.85;
    }
  }

  private updateGroups(state: GameState): void {
    const t = this.elapsed;
    const seen = new Set<number>();
    for (const g of state.groups) {
      seen.add(g.id);
      let gv = this.groupViews.get(g.id);
      if (!gv || gv.unit !== g.unit) {
        if (gv) {
          gv.root.destroy({ children: true });
          gv.glow.destroy();
          gv.label.destroy();
        }
        gv = this.makeGroupView(g);
        this.groupViews.set(g.id, gv);
      }
      const a = state.nodes[g.from] as SimNode,
        b = state.nodes[g.to] as SimNode;
      const hex = FACTION_HEX[g.owner] ?? '#ffffff';
      if (gv.color !== hex) {
        gv.color = hex;
        const ut = tintedTexture(unitTexture(g.unit), hex);
        for (const u of gv.units) u.texture = ut;
        gv.glow.texture = tintedTexture(glowTexture(), hex);
      }
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      gv.root.position.set(g.x, g.y);
      gv.root.rotation = ang;
      const big = g.unit === 'panzer' || g.unit === 'stachel',
        gap = big ? 8 : 6,
        n = Math.max(1, Math.round(g.n)),
        count = Math.min(n, big ? 14 : 18),
        traveled = g.t * nodeDist(a, b) + nodeRadius(a) * this.view.nodeScale * 0.5;
      const us = this.view.nodeScale;
      gv.root.scale.set(us);
      gv.units.forEach((u, i) => {
        const back = i * gap;
        const visible = i < count && back <= traveled;
        u.visible = visible;
        if (!visible) return;
        const wob = this.reducedMotion
          ? 0
          : g.unit === 'drohnen'
            ? Math.sin(t * 14 + i * 1.9) * 2.4
            : g.unit === 'pfeile'
              ? 0
              : Math.sin(t * 9 + i * 1.9) * 1.4;
        const lane = (((i * 7) % 5) - 2) * (big ? 3.4 : 2.6) + wob;
        u.position.set(-back / us, lane / us);
        u.alpha = 0.95 - i * 0.03;
      });
      gv.glow.visible = false;
      gv.glow.position.set(g.x, g.y);
      gv.glow.width = gv.glow.height = (10 + Math.min(g.n, 40) * 0.4) * 2.2 * us;
      gv.glow.alpha = g.n >= 3 ? 0.35 : 0.2;
      gv.label.visible = g.n >= 3;
      if (gv.label.visible) {
        gv.label.text = String(Math.round(g.n));
        gv.label.position.set(
          this.view.sx(g.x) - Math.sin(ang) * 14 * this.view.S,
          this.view.sy(g.y) + Math.cos(ang) * 14 * this.view.S,
        );
        gv.label.scale.set(this.view.S * 0.8);
      }
    }
    for (const [id, gv] of this.groupViews) {
      if (seen.has(id)) continue;
      gv.root.destroy({ children: true });
      gv.glow.destroy();
      gv.label.destroy();
      this.groupViews.delete(id);
    }
  }
  private makeGroupView(g: Group): GroupView {
    const root = new Container();
    const tex = unitTexture(g.unit);
    const units: Sprite[] = [];
    for (let i = 0; i < 18; i++) {
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      s.scale.set(0.42);
      s.visible = false;
      units.push(s);
      root.addChild(s);
    }
    const glow = new Sprite(glowTexture());
    glow.anchor.set(0.5);
    glow.blendMode = 'add';
    this.lights.addChild(glow);
    this.groupsLayer.addChild(root);
    const label = new BitmapText({ text: '', style: { fontFamily: LABEL_FONT, fontSize: 11 } });
    label.anchor.set(0.5);
    this.labels.addChild(label);
    return { root, glow, units, label, unit: g.unit, color: '' };
  }

  private updateRoutes(state: GameState, ui: UiState): void {
    const g = this.routes.clear();
    const off = -this.elapsed * 46;
    const drawPath = (ids: readonly number[], alpha: number, offset: number, C: number) => {
      if (ids.length < 2) return;
      for (let i = 0; i < ids.length - 1; i++) {
        const a = state.nodes[ids[i] as number] as SimNode,
          b = state.nodes[ids[i + 1] as number] as SimNode;
        g.moveTo(a.x, a.y).lineTo(b.x, b.y);
      }
      g.stroke({ width: 7, color: 0x10324a, alpha: 0.25 * alpha, cap: 'round', join: 'round' });
      for (let i = 0; i < ids.length - 1; i++) {
        const a = state.nodes[ids[i] as number] as SimNode,
          b = state.nodes[ids[i + 1] as number] as SimNode;
        dashed(g, a.x, a.y, b.x, b.y, 10, 9, off + offset);
      }
      g.stroke({ width: 3, color: C, alpha: 0.95 * alpha, cap: 'round' });
      for (let i = 0; i < ids.length - 1; i++) {
        const a = state.nodes[ids[i] as number] as SimNode,
          b = state.nodes[ids[i + 1] as number] as SimNode;
        const ang = Math.atan2(b.y - a.y, b.x - a.x),
          mx = a.x + (b.x - a.x) * 0.58,
          my = a.y + (b.y - a.y) * 0.58,
          s = 6;
        const px = (dx: number, dy: number) =>
          [
            mx + dx * Math.cos(ang) - dy * Math.sin(ang),
            my + dx * Math.sin(ang) + dy * Math.cos(ang),
          ] as const;
        const p0 = px(s, 0),
          p1 = px(-s * 0.8, s * 0.8),
          p2 = px(-s * 0.3, 0),
          p3 = px(-s * 0.8, -s * 0.8);
        g.moveTo(p0[0], p0[1])
          .lineTo(p1[0], p1[1])
          .lineTo(p2[0], p2[1])
          .lineTo(p3[0], p3[1])
          .closePath()
          .fill({ color: C, alpha });
      }
    };
    const PC = FACTION_COLORS[PLAYER] ?? 0xffffff;
    for (const n of state.nodes) {
      if (n.owner === 0) continue;
      const mine = n.owner === PLAYER && !state.demo;
      n.routes.forEach((r, i) =>
        drawPath([n.id, ...r], mine ? 1 : 0.55, i * 6, FACTION_COLORS[n.owner] ?? 0xffffff),
      );
    }
    if (ui.drag) {
      drawPath(ui.drag.path, 0.75, 0, PC);
      const lastN = state.nodes[ui.drag.path[ui.drag.path.length - 1] as number] as SimNode;
      if (ui.hover === null) {
        dashed(g, lastN.x, lastN.y, this.view.wx(ui.pointer.x), this.view.wy(ui.pointer.y), 4, 6, 0);
        g.stroke({ width: 1.5, color: PC, alpha: 0.45 });
      }
    }
  }

  private updateOverlay(ui: UiState): void {
    const v = this.view,
      S = v.S;
    const cg = this.cutG.clear();
    if (ui.cut && ui.cut.length > 1) {
      ui.cut.forEach((q, i) => (i ? cg.lineTo(q.x, q.y) : cg.moveTo(q.x, q.y)));
      cg.stroke({ width: 3 * S, color: 0x10324a, alpha: 0.7, cap: 'round', join: 'round' });
    }
    const pg = this.dragPill.clear();
    if (ui.drag) {
      this.dragLabel.text = ui.dragLabel;
      this.dragLabel.scale.set(S);
      this.dragLabel.tint =
        ui.dragOk === null ? (FACTION_COLORS[PLAYER] ?? 0xffffff) : ui.dragOk ? 0x8ff0a4 : 0xff7b8f;
      this.dragLabel.visible = true;
      const x = ui.pointer.x,
        y = ui.pointer.y - 28 * S;
      this.dragLabel.position.set(x, y);
      const w = this.dragLabel.width + 16 * S,
        h = this.dragLabel.height + 8 * S;
      pg.roundRect(x - w / 2, y - h / 2, w, h, h / 2).fill({ color: 0xffffff, alpha: 0.9 });
    } else this.dragLabel.visible = false;
  }

  /** Faint trail particles behind moving groups (high quality only). */
  private updateTrails(state: GameState, dt: number): void {
    if (this.quality !== 'hoch' || this.reducedMotion) return;
    this.trailAcc += dt;
    if (this.trailAcc < 0.06) return;
    this.trailAcc = 0;
    for (const g of state.groups) {
      if (g.n < 1) continue;
      const C = FACTION_COLORS[g.owner] ?? 0xffffff;
      this.spawn(
        g.x + (Math.random() - 0.5) * 4,
        g.y + (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        0.35 + Math.random() * 0.25,
        C,
        0.8 + Math.min(g.n, 20) * 0.04,
      );
    }
  }

  private updateEffects(dt: number): void {
    const damp = Math.pow(0.05, dt);
    const alive: FxParticle[] = [];
    for (const f of this.particles) {
      f.life -= dt;
      if (f.life <= 0) {
        this.fx.removeParticle(f.p);
        continue;
      }
      f.p.x += f.vx * dt;
      f.p.y += f.vy * dt;
      f.vx *= damp;
      f.vy *= damp;
      f.p.alpha = Math.max(0, f.life / f.max);
      alive.push(f);
    }
    this.particles = alive;
    this.fx.update();
    const zg = this.zapsG.clear();
    const keep: Zap[] = [];
    for (const z of this.zaps) {
      z.life -= dt;
      if (z.life <= 0) continue;
      keep.push(z);
      const a = z.life / 0.18;
      // branched bolt: main path with two random kinks plus a short side branch
      const mx = (z.x1 + z.x2) / 2 + (Math.random() - 0.5) * 14,
        my = (z.y1 + z.y2) / 2 + (Math.random() - 0.5) * 14;
      const qx = (z.x1 + mx) / 2 + (Math.random() - 0.5) * 8,
        qy = (z.y1 + my) / 2 + (Math.random() - 0.5) * 8;
      zg.moveTo(z.x1, z.y1).lineTo(qx, qy).lineTo(mx, my).lineTo(z.x2, z.y2);
      zg.stroke({ width: 2.4, color: z.color, alpha: a, cap: 'round', join: 'round' });
      zg.moveTo(z.x1, z.y1).lineTo(qx, qy).lineTo(mx, my).lineTo(z.x2, z.y2);
      zg.stroke({ width: 0.9, color: 0xffffff, alpha: a * 0.85, cap: 'round' });
      const bx = mx + (Math.random() - 0.5) * 24,
        by = my + (Math.random() - 0.5) * 24;
      zg.moveTo(mx, my).lineTo(bx, by);
      zg.stroke({ width: 1.2, color: z.color, alpha: a * 0.7, cap: 'round' });
    }
    this.zaps = keep;
  }

  /** Lowers or raises the effect level at runtime. */
  setQuality(q: GraphicsQuality): void {
    if (q === this.quality || q === 'niedrig') return;
    this.quality = q;
    this.world.filters = q === 'hoch' && this.bloom ? [this.bloom] : null;
    this.bg.filters = q === 'hoch' && this.caustics ? [this.caustics] : null;
    this.initMotes();
  }

  /** Frame budget: if rendering stays above ~28 ms per frame for two seconds on 'hoch', drop to 'mittel'. */
  private watchFrameBudget(dt: number): void {
    if (this.quality !== 'hoch') return;
    this.frameTime += dt;
    this.frameSamples++;
    if (this.frameTime < 2) return;
    const avg = this.frameTime / this.frameSamples;
    this.frameTime = 0;
    this.frameSamples = 0;
    if (avg > 0.028) this.slowFrames++;
    else this.slowFrames = 0;
    if (this.slowFrames >= 2) {
      this.setQuality('mittel');
      this.onQualityChange?.('mittel');
    }
  }

  render(state: GameState, ui: UiState, dt: number): void {
    this.elapsed += dt;
    this.watchFrameBudget(dt);
    if (this.levelFor !== state) this.setLevel(state);
    this.syncCamera();
    if (this.caustics) this.caustics.time = this.elapsed;
    if (!this.reducedMotion)
      for (const p of this.plants) p.s.rotation = p.base + Math.sin(this.elapsed * 0.6 + p.ph) * 0.06;
    this.updateTrails(state, dt);
    this.updateBackground(dt);
    this.updateRoutes(state, ui);
    this.updateNodes(state, ui, dt);
    this.updateGroups(state);
    this.updateEffects(dt);
    this.updateOverlay(ui);
    this.app.render();
  }

  destroy(): void {
    this.app.destroy(false, { children: true });
  }
}

function dashed(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash: number,
  gap: number,
  offset: number,
): void {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 0.001) return;
  const ux = (x2 - x1) / len,
    uy = (y2 - y1) / len,
    period = dash + gap;
  let s = ((offset % period) + period) % period;
  s = s === 0 ? 0 : s - period;
  for (; s < len; s += period) {
    const a = Math.max(0, s),
      b = Math.min(len, s + dash);
    if (b <= a) continue;
    g.moveTo(x1 + ux * a, y1 + uy * a).lineTo(x1 + ux * b, y1 + uy * b);
  }
}
function dashedCircle(g: Graphics, r: number, dash: number, offset: number): void {
  const circ = TAU * r,
    n = Math.max(6, Math.round(circ / (dash * 2)));
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU + offset / r,
      a1 = a0 + (dash / circ) * TAU;
    g.moveTo(Math.cos(a0) * r, Math.sin(a0) * r).arc(0, 0, r, a0, a1);
  }
}
function polygon(g: Graphics, x: number, y: number, r: number, sides: number, rot: number): void {
  for (let k = 0; k < sides; k++) {
    const a = rot + (k * TAU) / sides;
    if (k) g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  g.closePath();
}
