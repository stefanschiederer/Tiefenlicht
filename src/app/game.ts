import { Synth } from '@/audio/synth';
import {
  ABILITIES,
  ABILITY_ORDER,
  CAMPAIGN,
  PLAYER,
  demoDef,
  endlessDef,
  type AbilityId,
  type LevelDef,
} from '@/data';
import { computePerks } from '@/data/skills';
import { CanvasRenderer, type UiState } from '@/render/canvas2d/renderer';
import { addRoute, launch, sendAmount, useAbility } from '@/sim/actions';
import { bfsPath } from '@/sim/graph';
import { buildLevel } from '@/sim/level';
import type { GameState, SimEvent, SimNode } from '@/sim/state';
import { abilityCost } from '@/sim/stats';
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
}

export interface GameListeners {
  onHud(): void;
  onPanel(): void;
  onTip(text: string, ms?: number): void;
  onLegend(): void;
  onAbilities(): void;
  onFinish(won: boolean, result: LevelResult | null): void;
}

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
    selected: null,
    hover: null,
    pointer: { x: 0, y: 0 },
    abilityMode: null,
    dragLabel: '',
  };
  result: LevelResult | null = null;
  readonly audio = new Synth();
  readonly renderer: CanvasRenderer;
  listeners: GameListeners;
  private demoIdle = 0;
  private hudTimer = 0;
  private lastFrame = 0;
  private dragShift = false;

  constructor(canvas: HTMLCanvasElement, listeners: GameListeners) {
    this.renderer = new CanvasRenderer(canvas);
    this.listeners = listeners;
    this.save = readSave();
    this.audio.enabled = this.save.sound;
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
  selectedNode(): SimNode | null {
    return this.ui.selected === null ? null : (this.state.nodes[this.ui.selected] ?? null);
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
    this.ui.selected = null;
    this.ui.abilityMode = null;
    this.ui.hover = null;
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
      const sel = this.selectedNode();
      if (sel && sel.owner !== PLAYER) {
        this.ui.selected = null;
        this.listeners.onPanel();
      }
    }
    this.ui.hover =
      this.mode === 'game'
        ? (this.renderer.nodeAt(this.state, this.ui.pointer.x, this.ui.pointer.y)?.id ?? null)
        : null;
    if (this.ui.drag) {
      const src = this.state.nodes[this.ui.drag.src] as SimNode;
      this.ui.dragLabel = `${sendAmount(this.state, src, this.dragShift ? 1 : this.sendMode)} Einheiten`;
    }
    this.renderer.render(this.state, this.ui, dt);
    if ((this.hudTimer += dt) > 0.25) {
      this.hudTimer = 0;
      if (this.mode === 'game') this.listeners.onHud();
    }
  }

  private handleEvents(events: SimEvent[]): void {
    for (const e of events) {
      this.renderer.onEvent(e, this.state);
      this.audio.onEvent(e, this.state);
      if (this.demo) continue;
      if (e.type === 'capture') {
        if (this.ui.selected === e.node) {
          this.ui.selected = null;
          this.listeners.onPanel();
        }
        if (e.by === PLAYER && this.state.stats.captured === 1)
          this.listeners.onTip('Erobert! Der Knoten produziert jetzt für dich.', 3000);
      } else if (e.type === 'finished') this.finish(e.won);
    }
  }

  private finish(won: boolean): void {
    if (!this.running) return;
    this.running = false;
    this.ui.abilityMode = null;
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
      this.save.points += gained;
      result = { stars: st, gained };
      this.persist();
    }
    this.result = result;
    this.listeners.onFinish(won, result);
  }

  // ---- Input actions (screen coordinates) ----
  nodeAt(px: number, py: number): SimNode | null {
    return this.renderer.nodeAt(this.state, px, py);
  }
  pointerDown(px: number, py: number, shift: boolean): 'drag' | 'ability' | 'none' {
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
    this.ui.selected = null;
    this.listeners.onPanel();
    return 'none';
  }
  pointerMove(px: number, py: number): void {
    this.ui.pointer = { x: px, y: py };
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
    if (p) for (const id of p.slice(1)) if (!path.includes(id)) path.push(id);
  }
  pointerUp(px: number, py: number): void {
    this.ui.pointer = { x: px, y: py };
    const d = this.ui.drag;
    if (!d) return;
    this.ui.drag = null;
    const src = this.state.nodes[d.src] as SimNode;
    if (d.path.length >= 2) {
      // Every drawn path sends the selected share immediately and stays as a route.
      const route = d.path.slice(1);
      const k = sendAmount(this.state, src, this.dragShift ? 1 : this.sendMode);
      const sent = launch(this.state, src, route, k, { manual: true });
      const isNew = addRoute(src, route);
      this.handleEvents(drainEvents(this.state));
      if (isNew) this.audio.play('route', 0.2);
      this.state.stats.sends++;
      const sends = this.state.stats.sends;
      if (isNew && src.routes.length > 1)
        this.listeners.onTip(
          `Route ${src.routes.length} von 3 gesetzt – der Nachschub teilt sich auf.`,
          3000,
        );
      else if (sends <= 2)
        this.listeners.onTip(
          sent
            ? `${k} Einheiten unterwegs, die Route bleibt: Der Knoten schickt jetzt laufend einen Teil seiner Produktion nach. Ziehe erneut, um sofort mehr zu schicken.`
            : 'Route gesetzt. Der Knoten schickt laufend einen Teil seiner Produktion nach.',
          3800,
        );
      else if (!sent) this.listeners.onTip('Route gesetzt, gerade keine Einheiten zum Senden.', 1500);
      this.listeners.onPanel();
      return;
    }
    this.ui.selected = this.ui.selected === src.id ? null : src.id;
    this.listeners.onPanel();
    if (this.ui.selected !== null) this.audio.play('click');
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
    this.ui.abilityMode = null;
    if (this.ui.selected !== null) {
      this.ui.selected = null;
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
