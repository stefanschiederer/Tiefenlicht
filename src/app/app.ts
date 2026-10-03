import { enemiesFor, type Enemy } from '@/game/ai';
import { KINDS, PLAYER, TEAM_COLORS, type TowerKind } from '@/game/config';
import { levelDef } from '@/game/levels';
import { addLine, checkLine, createGame, cutLines, drainEvents, radiusOf, step, strength } from '@/game/sim';
import type { GameState } from '@/game/state';
import { Renderer, type UiState } from '@/render/renderer';
import { kindIcon, towerIcon } from '@/render/sprites';
import { setSound, sfx, unlockAudio } from './audio';
import { loadSave, writeSave, type Save } from './save';
import { mapHtml, scrollToCurrent } from './map';
import { applyPendingUpdate } from './pwa';

type Mode = 'map' | 'start' | 'play' | 'pause' | 'win' | 'lose';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const ICON = {
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="10.8" y="10" width="2.4" height="7" rx="1.2"/><circle cx="12" cy="7" r="1.5"/></svg>',
  map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" stroke="currentColor" stroke-width="2"/></svg>',
  pause:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>',
  soundOn:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  soundOff:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

/** Game session: level lifecycle, main loop, input and the few screens (start, pause, win, lose). */
export class App {
  save: Save = loadSave();
  mode: Mode = 'start';
  state!: GameState;
  enemies: Enemy[] = [];
  readonly renderer: Renderer;
  readonly ui: UiState = { drag: null, cut: [], hint: null };
  private pointerId: number | null = null;
  private cutLast: { x: number; y: number } | null = null;
  private last = 0;
  private acc = 0;
  private drewLine = false;
  private tipTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    setSound(this.save.sound);
    this.bindInput(canvas);
    this.bindHud();
    const onResize = () => this.renderer.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    onResize();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'play') this.showPause();
    });
    this.loadLevel(this.save.level);
    this.showMap();
    requestAnimationFrame((t) => this.frame(t));
  }

  /* ------------------------------------------------------------------ level lifecycle */
  loadLevel(n: number): void {
    this.state = createGame(levelDef(n));
    this.enemies = enemiesFor(this.state);
    this.ui.drag = null;
    this.ui.cut = [];
    this.drewLine = false;
    this.ui.hint = n === 1 ? { from: 0, to: 1 } : null;
    $('levelLabel').textContent = `Level ${n}`;
    this.updateBar();
  }

  private play(): void {
    unlockAudio();
    sfx.tap();
    this.setScreen(null);
    this.mode = 'play';
    $('hud').hidden = false;
    const n = this.state.def.n;
    if (n === 1) this.tip('Ziehe von deinem blauen Turm zu einem anderen Turm.', 0);
    else if (n === 2) this.tip('Große Türme halten mehr Linien: ab 10 Soldaten zwei, ab 25 drei.', 6);
    else if (n === 3) this.tip('Wische quer über eine Linie, um sie zu kappen.', 7);
    else this.tip('', 0);
  }

  private tip(text: string, seconds: number): void {
    const el = $('tip');
    el.textContent = text;
    el.classList.toggle('on', !!text);
    this.tipTimer = seconds;
  }

  private finish(result: 'win' | 'lose'): void {
    this.mode = result;
    this.ui.drag = null;
    this.tip('', 0);
    if (result === 'win') {
      sfx.win();
      this.save.level = Math.max(this.save.level, this.state.def.n + 1);
      writeSave(this.save);
      this.setScreen(
        `<div class="banner win">Gewonnen!</div><div class="sub">Level ${this.state.def.n} geschafft</div>
         <button class="big green" id="next">Weiter</button>`,
      );
      $('next').addEventListener('click', () => {
        sfx.tap();
        this.loadLevel(this.save.level);
        this.showMap();
      });
    } else {
      sfx.lose();
      this.setScreen(
        `<div class="banner lose">Verloren</div><div class="sub">Level ${this.state.def.n}</div>
         <button class="big green" id="again">Nochmal</button>
         <button class="big blue" id="toMap">Karte</button>`,
      );
      $('toMap').addEventListener('click', () => {
        sfx.tap();
        this.showMap();
      });
      $('again').addEventListener('click', () => {
        sfx.tap();
        this.loadLevel(this.state.def.n);
        this.play();
      });
    }
  }

  /* ------------------------------------------------------------------ screens */
  private setScreen(html: string | null): void {
    const el = $('screen');
    el.hidden = html === null;
    el.className = `screen ${this.mode}`;
    $('panel').innerHTML = html ?? '';
  }

  showStart(): void {
    this.mode = 'start';
    $('hud').hidden = true;
    this.setScreen(
      `<div class="logo">Tiefenlicht</div>
       <div class="start-bottom">
         ${this.newKindCard()}
         <div class="level-big">Level ${this.state.def.n}</div>
         <button class="big green" id="play">Spielen</button>
       </div>
       <button class="round sound" id="sound" aria-label="Ton">${this.save.sound ? ICON.soundOn : ICON.soundOff}</button>
       <button class="round back" id="back" aria-label="Karte">${ICON.map}</button>`,
    );
    $('screen').className = 'screen start';
    $('back').addEventListener('click', () => {
      sfx.tap();
      this.showMap();
    });
    $('play').addEventListener('click', () => this.play());
    $('sound').addEventListener('click', () => {
      this.toggleSound();
      $('sound').innerHTML = this.save.sound ? ICON.soundOn : ICON.soundOff;
    });
  }

  /** Campaign map: a road through the worlds; tap a reached level to open it. */
  showMap(): void {
    this.mode = 'map';
    this.ui.drag = null;
    this.tip('', 0);
    $('hud').hidden = true;
    const cur = this.save.level;
    this.setScreen(
      `<div class="map-top"><div><div class="map-title">Tiefenlicht</div><div class="map-tag">Erobere alle roten Türme!</div></div>
         <div class="map-buttons"><button class="round" id="info" aria-label="Anleitung">${ICON.info}</button>
         <button class="round" id="sound" aria-label="Ton">${this.save.sound ? ICON.soundOn : ICON.soundOff}</button></div></div>
       <div class="map" id="map">${mapHtml(cur, Math.min(window.innerWidth, 560))}</div>
       <div class="map-bottom"><button class="big green" id="playCur">Level ${cur}</button></div>`,
    );
    $('screen').className = 'screen map-screen';
    const map = $('map');
    scrollToCurrent(map);
    map.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button.lvl');
      if (!b || b.disabled) return;
      sfx.tap();
      this.loadLevel(Number(b.dataset.lv));
      this.showStart();
    });
    // a downloaded update is installed here, between levels (the save game stays in localStorage)
    applyPendingUpdate();
    $('playCur').addEventListener('click', () => {
      sfx.tap();
      this.loadLevel(cur);
      this.showStart();
    });
    $('sound').addEventListener('click', () => {
      this.toggleSound();
      $('sound').innerHTML = this.save.sound ? ICON.soundOn : ICON.soundOff;
    });
    $('info').addEventListener('click', () => {
      sfx.tap();
      this.showGuide();
    });
  }

  /** Rules and all tower kinds (opened from the map). */
  showGuide(): void {
    this.mode = 'map';
    const kinds = (Object.keys(KINDS) as TowerKind[]).map((k) => {
      const d = KINDS[k];
      const locked = d.from > this.save.level;
      return `<div class="kind${locked ? ' locked' : ''}"><img src="${towerIcon(1, 2, k)}" alt="" />
        <div><b>${d.name}</b> <small>${d.from > 1 ? `ab Level ${d.from}` : 'von Anfang an'}</small><span>${d.desc}</span></div></div>`;
    });
    this.setScreen(
      `<div class="guide">
        <h2>So geht's</h2>
        <p class="lead">Tiefenlicht ist ein Strategiespiel um Türme. Du bist <b class="blue">Blau</b>, der Gegner ist <b class="red">Rot</b>, graue Türme gehören noch niemandem. Erobere alle roten Türme, dann hast du das Level gewonnen.</p>
        <ul>
          <li><b>Linie ziehen:</b> Wische von einem blauen Turm zu einem anderen Turm. Deine Soldaten marschieren dann ununterbrochen hinüber.</li>
          <li><b>Erobern:</b> Jeder Soldat zieht einem fremden Turm einen ab. Fällt die Zahl unter null, gehört der Turm dir. Eigene Türme werden verstärkt.</li>
          <li><b>Wachsen:</b> Deine Türme bilden laufend Soldaten aus. Ab 10 Soldaten halten sie 2 Linien, ab 25 Soldaten 3 Linien.</li>
          <li><b>Kappen:</b> Wische quer über eine eigene Linie. Soldaten vor dem Schnitt laufen heim, die anderen marschieren weiter.</li>
          <li><b>Kämpfe:</b> Treffen sich Soldaten verschiedener Farben auf einer Strecke, kämpfen sie eins gegen eins.</li>
          <li><b>Mauern</b> und andere Türme versperren den direkten Weg.</li>
        </ul>
        <h3>Türme</h3>
        <div class="kinds">${kinds.join('')}</div>
        <button class="big green" id="guideBack">Zur Karte</button>
      </div>`,
    );
    $('screen').className = 'screen guide-screen';
    $('guideBack').addEventListener('click', () => {
      sfx.tap();
      this.showMap();
    });
  }

  /** "Neu" card on the start screen of the level that introduces a tower kind. */
  private newKindCard(): string {
    const n = this.state.def.n;
    const kind = (Object.keys(KINDS) as TowerKind[]).find((k) => k !== 'tower' && KINDS[k].from === n);
    if (!kind) return '';
    const url = kindIcon(kind);
    return `<div class="new-card"><img src="${url}" alt="" /><div><b>Neu: ${KINDS[kind].name}</b><span>${KINDS[kind].desc}</span></div></div>`;
  }

  private showPause(): void {
    if (this.mode !== 'play') return;
    this.mode = 'pause';
    this.ui.drag = null;
    this.setScreen(
      `<div class="banner">Pause</div>
       <button class="big green" id="resume">Weiter</button>
       <button class="big blue" id="restart">Neu starten</button>
       <button class="big blue" id="snd">${this.save.sound ? 'Ton aus' : 'Ton an'}</button>
       <button class="big blue" id="toMap">Karte</button>`,
    );
    $('toMap').addEventListener('click', () => {
      sfx.tap();
      this.showMap();
    });
    $('resume').addEventListener('click', () => {
      sfx.tap();
      this.setScreen(null);
      this.mode = 'play';
    });
    $('restart').addEventListener('click', () => {
      sfx.tap();
      this.loadLevel(this.state.def.n);
      this.play();
    });
    $('snd').addEventListener('click', () => {
      this.toggleSound();
      $('snd').textContent = this.save.sound ? 'Ton aus' : 'Ton an';
    });
  }

  private toggleSound(): void {
    this.save.sound = !this.save.sound;
    setSound(this.save.sound);
    writeSave(this.save);
    unlockAudio();
    sfx.tap();
  }

  private bindHud(): void {
    $('pauseBtn').innerHTML = ICON.pause;
    $('pauseBtn').addEventListener('click', () => this.showPause());
  }

  private updateBar(): void {
    const st = strength(this.state);
    const total = st.reduce((a, b) => a + b, 0) || 1;
    const bar = $('bar');
    bar.innerHTML = st
      .map((v, o) =>
        o === 0 || v <= 0 ? '' : `<i style="flex:${v / total};background:${TEAM_COLORS[o]}"></i>`,
      )
      .join('');
  }

  /* ------------------------------------------------------------------ loop */
  private frame(now: number): void {
    const dt = Math.min(0.1, (now - (this.last || now)) / 1000);
    this.last = now;
    if (this.mode === 'play') {
      this.acc += dt;
      const h = 1 / 60;
      while (this.acc >= h) {
        this.acc -= h;
        for (const e of this.enemies) e.update(this.state, h);
        step(this.state, h);
      }
      const events = drainEvents(this.state);
      this.renderer.onEvents(this.state, events);
      for (const e of events) {
        if (e.type === 'capture') sfx.capture(e.tower.owner === PLAYER);
        else if (e.type === 'hit') sfx.hit();
        else if (e.type === 'end') this.finish(e.result);
      }
      this.updateBar();
      if (this.tipTimer > 0) {
        this.tipTimer -= dt;
        if (this.tipTimer <= 0) this.tip('', 0);
      }
    } else this.acc = 0;
    const cutAge = 0.18;
    this.ui.cut = this.ui.cut.filter((p) => now / 1000 - p.t < cutAge);
    this.renderer.render(this.state, this.ui, dt);
    requestAnimationFrame((t) => this.frame(t));
  }

  /* ------------------------------------------------------------------ input */
  towerAt(px: number, py: number): number | null {
    const v = this.renderer.view;
    let best: number | null = null,
      bestD = Infinity;
    for (const t of this.state.towers) {
      const x = v.sx(t.x, t.y),
        y = v.sy(t.x, t.y) - radiusOf(t) * v.k * 0.4;
      const d = Math.hypot(px - x, py - y);
      const r = Math.max(radiusOf(t) * v.k * 1.35, 30);
      if (d < r && d < bestD) {
        best = t.id;
        bestD = d;
      }
    }
    return best;
  }

  private bindInput(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'play' || this.pointerId !== null) return;
      this.pointerId = e.pointerId;
      canvas.setPointerCapture?.(e.pointerId);
      unlockAudio();
      const id = this.towerAt(e.offsetX, e.offsetY);
      if (id !== null && this.state.towers[id]?.owner === PLAYER) {
        this.ui.drag = { src: id, px: e.offsetX, py: e.offsetY, target: null, ok: false };
      } else {
        this.cutLast = { x: e.offsetX, y: e.offsetY };
        this.ui.cut = [{ x: e.offsetX, y: e.offsetY, t: performance.now() / 1000 }];
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.pointerId || this.mode !== 'play') return;
      const d = this.ui.drag;
      if (d) {
        d.px = e.offsetX;
        d.py = e.offsetY;
        const tgt = this.towerAt(e.offsetX, e.offsetY);
        d.target = tgt !== null && tgt !== d.src ? tgt : null;
        d.ok = d.target !== null && this.canDraw(d.src, d.target);
      } else if (this.cutLast) {
        const v = this.renderer.view;
        const a = v.toWorld(this.cutLast.x, this.cutLast.y),
          b = v.toWorld(e.offsetX, e.offsetY);
        if (cutLines(this.state, PLAYER, a.x, a.y, b.x, b.y)) sfx.cut();
        this.cutLast = { x: e.offsetX, y: e.offsetY };
        this.ui.cut.push({ x: e.offsetX, y: e.offsetY, t: performance.now() / 1000 });
      }
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.cutLast = null;
      const d = this.ui.drag;
      this.ui.drag = null;
      if (!d || d.target === null || this.mode !== 'play') return;
      const r = addLine(this.state, d.src, d.target, PLAYER);
      if (r === 'ok') {
        sfx.line();
        if (!this.drewLine) {
          this.drewLine = true;
          this.ui.hint = null;
          if (this.state.def.n === 1) this.tip('Super! Erobere alle roten Türme.', 4);
        }
      } else if (r !== 'exists') {
        sfx.error();
        if (r === 'full') this.tip('Dieser Turm hat keine freie Linie. Mehr Soldaten = mehr Linien.', 3);
        else if (r === 'blocked') this.tip('Der Weg ist versperrt.', 2);
      }
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  private canDraw(a: number, b: number): boolean {
    const r = checkLine(this.state, a, b, PLAYER);
    if (r === 'ok') return true;
    // drawing back over an own line reverses it
    return this.state.lines.some((l) => l.src === b && l.dst === a && l.owner === PLAYER) && r !== 'blocked';
  }
}
