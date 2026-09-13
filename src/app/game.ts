import { Synth } from '@/audio/synth';
import {
  ABILITIES,
  ABILITY_ORDER,
  CAMPAIGN,
  PLAYER,
  TYPES,
  demoDef,
  endlessDef,
  type AbilityId,
  type LevelDef,
} from '@/data';
import { computePerks } from '@/data/skills';
import type { Renderer, UiState } from '@/render/renderer';
import { addRoute, cutRoutes, launch, sendAmount, useAbility } from '@/sim/actions';
import { bfsPath } from '@/sim/graph';
import { buildLevel } from '@/sim/level';
import type { GameState, SimEvent, SimNode } from '@/sim/state';
import { abilityCost, defOf, routeLimit, strOf } from '@/sim/stats';
import { aliveFactions, drainEvents, step } from '@/sim/update';
import { readSave, writeSave, type SaveGame } from './save';
import { enterFullscreen } from './pwa';

export type LevelKind = 'campaign' | 'endless';
export type SendMode = 0.25 | 0.5 | 0.75 | 1;
export const SEND_MODES: [SendMode, string][] = [
  [0.25, '25 %'],
  [0.5, '50 %'],
  [0.75, '75 %'],
  [1, 'Alle'],
];

export interface LevelResult {
  stars: number;
  gained: number;
  /** Best time for this level after this run (seconds). */
  bestTime: number;
  newBest: boolean;
}

export interface GameListeners {
  onHud(): void;
  onPanel(): void;
  /** Called every rendered frame (cheap DOM follow-ups such as the radial menu position). */
  onFrame?(): void;
  onTip(text: string, ms?: number): void;
  onLegend(): void;
  onAbilities(): void;
  onFinish(won: boolean, result: LevelResult | null): void;
}

const DOUBLE_TAP_MS = 350;

/** Orchestrates level lifecycle, input state, save game, renderer and audio. No DOM except the canvas. */
export class Game {
  save: SaveGame;
  state: GameState;
  mode: 'menu' | 'game' = 'menu';
  levelKind: LevelKind = 'campaign';
  levelIndex = 0;
  running = false;
  paused = false;
  speed = 1;
  levelTime = 0;
  sendMode: SendMode = 0.5;
  ui: UiState = {
    drag: null,
    selected: [],
    hover: null,
    pointer: { x: 0, y: 0 },
    abilityMode: null,
    dragLabel: '',
    dragOk: null,
    cut: null,
  };
  result: LevelResult | null = null;
  readonly audio = new Synth();
  readonly renderer: Renderer;
  listeners: GameListeners;
  private demoIdle = 0;
  private hudTimer = 0;
  private lastFrame = 0;
  private dragShift = false;
  private lastTap: { id: number; at: number } | null = null;

  constructor(renderer: Renderer, listeners: GameListeners) {
    this.renderer = renderer;
    this.listeners = listeners;
    this.save = readSave();
    this.audio.enabled = this.save.sound;
    this.audio.volume = this.save.sfx;
    this.audio.music.volume = this.save.music;
    this.state = this.buildDemo();
  }

  get def(): LevelDef {
    return this.state.def;
  }
  get demo(): boolean {
    return this.state.demo;
  }
  get perks() {
    return this.state.perks;
  }
  /** The node shown in the panel: only when exactly one node is selected. */
  selectedNode(): SimNode | null {
    if (this.ui.selected.length !== 1) return null;
    return this.state.nodes[this.ui.selected[0] as number] ?? null;
  }

  persist(): void {
    writeSave(this.save);
  }
  campaignUnlocked(): number {
    let u = 0;
    while (u < CAMPAIGN.length - 1 && this.save.stars[u]) u++;
    return u;
  }
  totalStars(): number {
    return Object.values(this.save.stars).reduce((s, v) => s + v, 0);
  }
  abilityCost(id: AbilityId): number {
    return abilityCost(this.state, id);
  }
  availableAbilities(): AbilityId[] {
    return ABILITY_ORDER.filter((id) => this.perks.abilities.includes(id));
  }
  bestTime(kind: LevelKind, index: number): number | undefined {
    return (kind === 'campaign' ? this.save.bestTimes : this.save.endlessBestTimes)[index];
  }

  private buildDemo(): GameState {
    const s = buildLevel(demoDef(Math.floor(Math.random() * 1e6)), {
      demo: true,
      difficulty: this.save.difficulty,
    });
    this.renderer.setLevel(s);
    return s;
  }
  startDemo(): void {
    this.mode = 'menu';
    this.state = this.buildDemo();
    this.running = true;
    this.paused = false;
    this.demoIdle = 0;
    this.resetUi();
  }
  private resetUi(): void {
    this.ui.drag = null;
    this.ui.cut = null;
    this.ui.selected = [];
    this.ui.abilityMode = null;
    this.ui.hover = null;
    this.lastTap = null;
  }

  /** Builds the level and shows the intro (caller shows the screen). */
  prepareLevel(kind: LevelKind, i: number): void {
    this.levelKind = kind;
    this.levelIndex = i;
    const def = kind === 'campaign' ? (CAMPAIGN[i] as LevelDef) : endlessDef(i);
    this.mode = 'game';
    this.buildCurrent(def);
  }
  private buildCurrent(def: LevelDef): void {
    this.state = buildLevel(def, {
      perks: computePerks(this.save.spent),
      difficulty: this.save.difficulty,
      demo: false,
    });
    this.renderer.setLevel(this.state);
    this.running = false;
    this.paused = false;
    this.levelTime = 0;
    this.result = null;
    this.resetUi();
    this.listeners.onLegend();
    this.listeners.onAbilities();
    this.listeners.onPanel();
    this.listeners.onHud();
  }
  restartLevel(): void {
    this.prepareLevel(this.levelKind, this.levelIndex);
  }
  resumePlay(): void {
    if (isTouch() && this.save.autoFs !== false) void enterFullscreen();
    this.running = true;
    this.paused = false;
    if (this.levelTime < 0.01) {
      const L = this.def;
      this.listeners.onTip(
        this.levelKind === 'campaign' && this.levelIndex === 0
          ? 'Ziehe vom goldenen Knoten zu einem Nachbarn – die Hälfte bricht auf, danach fließt Nachschub.'
          : `${L.name}: ${this.state.nodes.length} Knoten, ${L.enemies === 1 ? 'ein Gegner' : L.enemies + ' Gegner'}. Zielzeit ${fmtTime(L.par)}.`,
        4500,
      );
    }
  }
  pause(): void {
    this.paused = true;
    this.cancelGesture();
  }
  toggleSpeed(): number {
    this.speed = this.speed === 1 ? 2 : 1;
    return this.speed;
  }

  /** Called from the rAF loop with the timestamp. */
  frame(now: number): void {
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000) || 0;
    this.lastFrame = now;
    if (this.running && !this.paused) {
      for (let i = 0; i < this.speed; i++) {
        step(this.state, dt);
        if (!this.demo) this.levelTime += dt;
        this.handleEvents(drainEvents(this.state));
        if (this.state.over) break;
      }
      if (this.demo && aliveFactions(this.state).size <= 1) {
        this.demoIdle += dt;
        if (this.demoIdle > 4) this.startDemo();
      }
      // Drop drag/selection on nodes we lost
      const d = this.ui.drag;
      if (d && (this.state.nodes[d.src] as SimNode).owner !== PLAYER) this.ui.drag = null;
      const lost = this.ui.selected.filter((id) => (this.state.nodes[id] as SimNode).owner !== PLAYER);
      if (lost.length) {
        this.ui.selected = this.ui.selected.filter((id) => !lost.includes(id));
        this.listeners.onPanel();
      }
    }
    this.ui.hover =
      this.mode === 'game'
        ? (this.renderer.view.nodeAt(this.state, this.ui.pointer.x, this.ui.pointer.y)?.id ?? null)
        : null;
    if (this.ui.drag) this.updateDragPreview();
    this.renderer.render(this.state, this.ui, dt);
    this.listeners.onFrame?.();
    this.audio.music.update(dt);
    if ((this.hudTimer += dt) > 0.25) {
      this.hudTimer = 0;
      if (this.mode === 'game') this.listeners.onHud();
      this.audio.music.setIntensity(this.threatLevel());
    }
  }

  /** 0..1: how much fighting is going on around the player (drives the adaptive music). */
  private threatLevel(): number {
    if (this.mode !== 'game' || this.demo || !this.running || this.paused) return 0.12;
    const s = this.state;
    let incoming = 0,
      own = 0;
    for (const g of s.groups) {
      if (g.owner === PLAYER) own += g.n;
      else if ((s.nodes[g.to] as SimNode).owner === PLAYER) incoming += g.n;
    }
    const share = s.nodes.filter((n) => n.owner === PLAYER).length / Math.max(1, s.nodes.length);
    return Math.min(1, 0.15 + incoming / 30 + own / 60 + (share < 0.25 ? 0.25 : 0));
  }

  /** Nodes a drag from `src` would send from: the whole selection if src belongs to it. */
  private dragSources(src: number): SimNode[] {
    const ids = this.ui.selected.includes(src) ? this.ui.selected : [src];
    return ids.map((id) => this.state.nodes[id] as SimNode).filter((n) => n.owner === PLAYER);
  }

  /** Attack preview at the pointer: units on the way, target defence, and whether it succeeds. */
  private updateDragPreview(): void {
    const d = this.ui.drag;
    if (!d) return;
    const frac = this.dragShift ? 1 : this.sendMode;
    const sources = this.dragSources(d.src);
    let units = 0,
      pw = 0;
    for (const n of sources) {
      const k = sendAmount(this.state, n, frac);
      units += k;
      pw += k * strOf(this.state, { unit: TYPES[n.type].unit, owner: n.owner });
    }
    const target =
      d.path.length >= 2 ? (this.state.nodes[d.path[d.path.length - 1] as number] as SimNode) : null;
    if (!target) {
      this.ui.dragLabel =
        sources.length > 1 ? `${units} Einheiten aus ${sources.length} Knoten` : `${units} Einheiten`;
      this.ui.dragOk = null;
      return;
    }
    if (target.owner === PLAYER) {
      this.ui.dragLabel = `${units} → ${TYPES[target.type].name} verstärken`;
      this.ui.dragOk = null;
      return;
    }
    const effDef = target.units * defOf(this.state, target);
    const ok = pw > effDef;
    this.ui.dragLabel = `${units} → ${TYPES[target.type].name}: ${Math.round(pw)} gegen ${Math.ceil(effDef)} ${ok ? '✓' : '✗'}`;
    this.ui.dragOk = ok;
  }

  private handleEvents(events: SimEvent[]): void {
    for (const e of events) {
      this.renderer.onEvent(e, this.state);
      this.audio.onEvent(e, this.state);
      if (this.demo) continue;
      if (e.type === 'capture') {
        if (this.ui.selected.includes(e.node)) {
          this.ui.selected = this.ui.selected.filter((id) => id !== e.node);
          this.listeners.onPanel();
        }
        if (e.by === PLAYER) {
          if (this.save.haptics) vibrate(25);
          if (this.state.stats.captured === 1)
            this.listeners.onTip('Erobert! Der Knoten produziert jetzt für dich.', 3000);
        } else if (e.prev === PLAYER && this.save.haptics) vibrate([40, 40, 40]);
      } else if (e.type === 'surrender') {
        this.listeners.onTip('Ein Gegner gibt auf.', 2500);
      } else if (e.type === 'finished') this.finish(e.won);
    }
  }

  private finish(won: boolean): void {
    if (!this.running) return;
    this.running = false;
    this.ui.abilityMode = null;
    this.cancelGesture();
    const L = this.def;
    let result: LevelResult | null = null;
    if (won) {
      const st = this.levelTime <= L.par ? 3 : this.levelTime <= L.par * 1.6 ? 2 : 1;
      let gained = 0;
      if (this.levelKind === 'campaign') {
        const prev = this.save.stars[this.levelIndex] ?? 0;
        if (st > prev) {
          gained = st - prev;
          this.save.stars[this.levelIndex] = st;
        }
      } else if (this.levelIndex > this.save.endlessBest) {
        gained = 1;
        this.save.endlessBest = this.levelIndex;
      }
      const times = this.levelKind === 'campaign' ? this.save.bestTimes : this.save.endlessBestTimes;
      const prevBest = times[this.levelIndex];
      const newBest = prevBest === undefined || this.levelTime < prevBest;
      if (newBest) times[this.levelIndex] = this.levelTime;
      this.save.points += gained;
      result = { stars: st, gained, bestTime: times[this.levelIndex] ?? this.levelTime, newBest };
      this.persist();
      if (this.save.haptics) vibrate([60, 60, 120]);
    } else if (this.save.haptics) vibrate(200);
    this.result = result;
    this.listeners.onFinish(won, result);
  }

  // ---- Input actions (screen coordinates) ----
  nodeAt(px: number, py: number): SimNode | null {
    return this.renderer.view.nodeAt(this.state, px, py);
  }
  pointerDown(px: number, py: number, shift: boolean): 'drag' | 'ability' | 'cut' | 'none' {
    this.ui.pointer = { x: px, y: py };
    if (this.mode !== 'game' || !this.running || this.paused) return 'none';
    const hit = this.nodeAt(px, py);
    if (this.ui.abilityMode) {
      if (hit && useAbility(this.state, this.ui.abilityMode, hit)) {
        this.handleEvents(drainEvents(this.state));
        this.ui.abilityMode = null;
        this.listeners.onHud();
      } else {
        this.audio.play('error');
        this.listeners.onTip('Kein gültiges Ziel für diese Fähigkeit.', 1800);
      }
      return 'ability';
    }
    if (hit && hit.owner === PLAYER) {
      this.ui.drag = { src: hit.id, path: [hit.id] };
      this.dragShift = shift;
      return 'drag';
    }
    if (this.ui.selected.length) {
      this.ui.selected = [];
      this.listeners.onPanel();
    }
    // Swiping across a route (starting on empty space or a foreign node) cuts it, Tentacle-Wars style.
    this.ui.cut = [{ x: px, y: py }];
    return 'cut';
  }
  pointerMove(px: number, py: number): void {
    this.ui.pointer = { x: px, y: py };
    if (this.ui.cut) {
      const trail = this.ui.cut,
        last = trail[trail.length - 1] as { x: number; y: number };
      if (Math.hypot(px - last.x, py - last.y) < 3) return;
      trail.push({ x: px, y: py });
      if (trail.length > 60) trail.shift();
      const v = this.renderer.view;
      const sources = cutRoutes(this.state, v.wx(last.x), v.wy(last.y), v.wx(px), v.wy(py), 10 / v.scale);
      if (sources.length) {
        this.state.events.push({ type: 'cut', sources, x: v.wx(px), y: v.wy(py) });
        this.handleEvents(drainEvents(this.state));
        this.listeners.onTip('Route gekappt.', 1200);
        this.listeners.onPanel();
      }
      return;
    }
    const d = this.ui.drag;
    if (!d) return;
    const hit = this.nodeAt(px, py);
    if (!hit) return;
    const path = d.path,
      lastId = path[path.length - 1] as number;
    if (hit.id === lastId) return;
    const idx = path.indexOf(hit.id);
    if (idx >= 0) {
      path.length = idx + 1;
      return;
    }
    const p = bfsPath(this.state.adj, lastId, hit.id);
    if (!p) return;
    // Append the shortest continuation; if it revisits a node already on the path, backtrack to it so
    // every consecutive pair on the path stays an actual edge.
    for (const id of p.slice(1)) {
      const at = path.indexOf(id);
      if (at >= 0) path.length = at + 1;
      else path.push(id);
    }
  }
  pointerUp(px: number, py: number): void {
    this.ui.pointer = { x: px, y: py };
    this.ui.cut = null;
    const d = this.ui.drag;
    if (!d) return;
    this.ui.drag = null;
    if (this.mode !== 'game' || !this.running || this.paused) return;
    const src = this.state.nodes[d.src] as SimNode;
    if (d.path.length >= 2) {
      this.sendAlong(src, d.path);
      return;
    }
    this.tap(src);
  }

  /** Tap on an own node: select / toggle in a multi-selection; double tap selects all own nodes. */
  private tap(n: SimNode): void {
    const now = performance.now();
    const dbl = this.lastTap && this.lastTap.id === n.id && now - this.lastTap.at < DOUBLE_TAP_MS;
    this.lastTap = { id: n.id, at: now };
    if (dbl) {
      this.ui.selected = this.state.nodes.filter((m) => m.owner === PLAYER).map((m) => m.id);
      this.listeners.onTip(
        `Alle ${this.ui.selected.length} eigenen Knoten gewählt. Ziehe von einem davon, um von allen zu schicken.`,
        3000,
      );
      this.audio.play('route', 0.1);
    } else if (this.ui.selected.includes(n.id)) {
      this.ui.selected = this.ui.selected.filter((id) => id !== n.id);
    } else {
      this.ui.selected = [...this.ui.selected, n.id];
      if (this.ui.selected.length === 2)
        this.listeners.onTip(
          'Zwei Knoten gewählt. Ziehen schickt von beiden. Tippe weitere an oder doppeltippe für alle.',
          3000,
        );
      this.audio.play('click');
    }
    this.listeners.onPanel();
  }

  /** Every drawn path sends the selected share from all sources immediately and stays as a route. */
  private sendAlong(src: SimNode, path: number[]): void {
    const target = path[path.length - 1] as number;
    const frac = this.dragShift ? 1 : this.sendMode;
    const sources = this.dragSources(src.id);
    let sentUnits = 0,
      newRoutes = 0,
      multiRoute = false;
    for (const n of sources) {
      const route =
        n.id === src.id ? path.slice(1) : (bfsPath(this.state.adj, n.id, target)?.slice(1) ?? null);
      if (!route || !route.length) continue;
      const k = sendAmount(this.state, n, frac);
      const g = launch(this.state, n, route, k, { manual: true });
      if (g) sentUnits += g.n;
      if (addRoute(n, route, routeLimit(n))) newRoutes++;
      if (n.routes.length > 1) multiRoute = true;
    }
    this.handleEvents(drainEvents(this.state));
    if (newRoutes) this.audio.play('route', 0.2);
    this.state.stats.sends++;
    const sends = this.state.stats.sends;
    if (sources.length > 1)
      this.listeners.onTip(
        `${sentUnits} Einheiten aus ${sources.length} Knoten unterwegs, Routen gesetzt.`,
        2500,
      );
    else if (newRoutes && multiRoute)
      this.listeners.onTip(`Route ${src.routes.length} von 3 gesetzt – der Nachschub teilt sich auf.`, 3000);
    else if (sends <= 2)
      this.listeners.onTip(
        sentUnits
          ? `${sentUnits} Einheiten unterwegs, die Route bleibt und schickt laufend Nachschub. Erneut ziehen schickt sofort mehr, quer über die Linie wischen löscht die Route.`
          : 'Route gesetzt: Der Knoten schickt laufend einen Teil seiner Produktion nach. Quer über die Linie wischen löscht sie.',
        3800,
      );
    else if (!sentUnits) this.listeners.onTip('Route gesetzt, gerade keine Einheiten zum Senden.', 1500);
    this.listeners.onPanel();
  }

  /** Camera: zoom around a screen point (wheel / pinch). */
  zoomAt(px: number, py: number, factor: number): void {
    this.renderer.view.zoomAt(px, py, factor);
    this.listeners.onPanel();
  }
  panBy(dx: number, dy: number): void {
    this.renderer.view.panBy(dx, dy);
  }
  /** Cancels any drag/cut in progress (e.g. when a second finger lands). */
  cancelGesture(): void {
    this.ui.drag = null;
    this.ui.cut = null;
  }
  clearRoutesAt(px: number, py: number): boolean {
    const hit = this.nodeAt(px, py);
    if (hit && hit.owner === PLAYER && hit.routes.length) {
      hit.routes = [];
      this.listeners.onTip('Routen gelöscht.', 1500);
      this.listeners.onPanel();
      return true;
    }
    return false;
  }
  cancel(): void {
    this.ui.drag = null;
    this.ui.cut = null;
    this.ui.abilityMode = null;
    if (this.ui.selected.length) {
      this.ui.selected = [];
      this.listeners.onPanel();
    }
    this.listeners.onHud();
  }
  setSendMode(m: SendMode): void {
    this.sendMode = m;
  }
  toggleAbility(id: AbilityId): void {
    if (this.ui.abilityMode === id) this.ui.abilityMode = null;
    else if (this.state.energy >= this.abilityCost(id)) {
      this.ui.abilityMode = id;
      this.listeners.onTip(
        `${ABILITIES[id].name}: ${ABILITIES[id].target === 'own' ? 'Wähle einen eigenen Knoten.' : 'Wähle einen fremden Knoten.'}`,
        3000,
      );
    } else {
      this.audio.play('error');
      this.listeners.onTip(
        `Nicht genug Energie für ${ABILITIES[id].name}. Energie entsteht, wenn Einheiten fallen.`,
        2500,
      );
    }
    this.listeners.onHud();
  }
  /** Runs a sim mutation from the UI and flushes its events. */
  act<T>(fn: (s: GameState) => T): T {
    const r = fn(this.state);
    this.handleEvents(drainEvents(this.state));
    return r;
  }
}

export const isTouch = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches;
export const fmtTime = (t: number): string =>
  `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
export const starStr = (n: number): string => '★'.repeat(n) + '☆'.repeat(3 - n);
/** Haptic feedback where supported (Android Chrome); silently ignored elsewhere. */
export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function')
      navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
