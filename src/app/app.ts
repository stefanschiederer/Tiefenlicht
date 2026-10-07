import { enemiesFor, type Enemy } from '@/game/ai';
import { KINDS, PLAYER, TEAM_COLORS, themeOf, type TowerKind } from '@/game/config';
import { levelDef } from '@/game/levels';
import {
  addLine,
  checkLine,
  createGame,
  cutLines,
  drainEvents,
  fireRockets,
  lineCost,
  radiusOf,
  step,
  strength,
} from '@/game/sim';
import type { GameState } from '@/game/state';
import { Renderer, type UiState } from '@/render/renderer';
import { kindIcon, PALETTES, towerIcon } from '@/render/sprites';
import { setSound, sfx, unlockAudio } from './audio';
import { loadSave, writeSave, type Save } from './save';
import { mapHtml, scrollToCurrent } from './map';
import { applyPendingUpdate } from './pwa';
import {
  collectDaily,
  dailyAvailable,
  isBoss,
  parTime,
  BRANCHES,
  enemyScale,
  playerBonus,
  rocketStats,
  skillUnlocked,
  starsFor,
  upgradeCost,
  UPGRADES,
  winCoinsFor,
} from './meta';
import type { UpgradeId } from './save';

const ROCKET_COOLDOWN = 5;

function fmtTime(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function totalStars(s: { stars: number[] }): number {
  return s.stars.reduce((a, b) => a + (b || 0), 0);
}
/** Confetti burst over the current screen (DOM, so it sits above the overlay). */
function confetti(): void {
  const host = document.getElementById('screen');
  if (!host || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div');
  box.className = 'confetti';
  const colors = ['#ffd43b', '#2f86ff', '#ff4545', '#3fb52a', '#ffffff', '#a55cff'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length] as string;
    p.style.animationDelay = `${Math.random() * 0.6}s`;
    p.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
    p.style.setProperty('--rot', `${(Math.random() - 0.5) * 1440}deg`);
    box.appendChild(p);
  }
  host.appendChild(box);
  setTimeout(() => box.remove(), 3800);
}
/** Animated coin counter (+0 … +n). */
function countUp(el: HTMLElement, n: number): void {
  const t0 = performance.now();
  const tick = (t: number) => {
    const k = Math.min(1, (t - t0) / 900);
    el.textContent = `+${Math.round(n * k * (2 - k))}`;
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

type Mode = 'map' | 'start' | 'play' | 'pause' | 'win' | 'lose';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const ICON = {
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z" fill="#ffd43b" stroke="#1d2530" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#ffc21a" stroke="#1d2530" stroke-width="1.8"/><circle cx="12" cy="12" r="6.3" fill="none" stroke="#e09b00" stroke-width="1.6"/><path d="M10.6 8.5h2.6v7" fill="none" stroke="#a86b00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  shop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9l1.5-5h13L20 9z" fill="#ff6b6b" stroke="#1d2530" stroke-width="1.8" stroke-linejoin="round"/><rect x="5" y="9" width="14" height="11" rx="1.5" fill="#fff" stroke="#1d2530" stroke-width="1.8"/><rect x="10" y="13" width="4" height="7" fill="#8a5a32" stroke="#1d2530" stroke-width="1.5"/></svg>',
  chest:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="10" width="18" height="10" rx="2" fill="#c47a2c" stroke="#1d2530" stroke-width="1.8"/><path d="M3 10a9 5 0 0 1 18 0z" fill="#e0943d" stroke="#1d2530" stroke-width="1.8"/><rect x="10" y="9" width="4" height="5" rx="1" fill="#ffd43b" stroke="#1d2530" stroke-width="1.5"/><path d="M3 14h18" stroke="#8a4f17" stroke-width="1.5"/></svg>',
  army: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="#ffd3a6" stroke="#1d2530" stroke-width="1.6"/><circle cx="16" cy="8" r="3" fill="#ffd3a6" stroke="#1d2530" stroke-width="1.6"/><rect x="4" y="12" width="8" height="9" rx="3" fill="#2f86ff" stroke="#1d2530" stroke-width="1.6"/><rect x="12" y="12" width="8" height="9" rx="3" fill="#2f86ff" stroke="#1d2530" stroke-width="1.6"/></svg>',
  drill:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="#fff" stroke="#1d2530" stroke-width="1.8"/><path d="M12 13V8.5M12 13l3 2" stroke="#1d2530" stroke-width="2" stroke-linecap="round"/><rect x="10" y="2.5" width="4" height="3" rx="1" fill="#2f86ff" stroke="#1d2530" stroke-width="1.4"/></svg>',
  boots:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h6v9l6 3v5H5V3z" fill="#8a5a32" stroke="#1d2530" stroke-width="1.8" stroke-linejoin="round"/><path d="M5 17h14" stroke="#1d2530" stroke-width="1.6"/><path d="M1 9h3M0 12h4" stroke="#2f86ff" stroke-width="1.8" stroke-linecap="round"/></svg>',
  rocket:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 3.5c3 0 6 3 6 6l-7.5 7.5-6-6z" fill="#e8eef5" stroke="#1d2530" stroke-width="1.6" stroke-linejoin="round"/><circle cx="15.5" cy="8.5" r="1.8" fill="#2f86ff" stroke="#1d2530" stroke-width="1.2"/><path d="M7 11l-3 1 3 3M13 17l-1 3-3-3" fill="#ff4545" stroke="#1d2530" stroke-width="1.4" stroke-linejoin="round"/><path d="M7.5 16.5l-3 3" stroke="#ffb21a" stroke-width="2.6" stroke-linecap="round"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" fill="#8a94a3" stroke="#1d2530" stroke-width="1.6"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#1d2530" stroke-width="1.8"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="10.8" y="10" width="2.4" height="7" rx="1.2"/><circle cx="12" cy="7" r="1.5"/></svg>',
  map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" stroke="currentColor" stroke-width="2"/></svg>',
  pause:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>',
  soundOn:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  soundOff:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

const svg = (body: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const O = 'stroke="#1d2530" stroke-width="1.6" stroke-linejoin="round"';
/** One icon per skill in the skill tree. */
const SKILL_ICON: Record<UpgradeId, string> = {
  army: ICON.army,
  drill: ICON.drill,
  elite: svg(
    `<path d="M12 2l3 3-1 9h-4L9 5z" fill="#d7dde4" ${O}/><rect x="7" y="14" width="10" height="3" rx="1" fill="#ffd43b" ${O}/><rect x="10.5" y="17" width="3" height="5" rx="1" fill="#8a5a32" ${O}/>`,
  ),
  boots: ICON.boots,
  lines: svg(
    `<path d="M6 21V3" stroke="#4b3a2c" stroke-width="2.4" stroke-linecap="round"/><path d="M7 4h11l-3 4 3 4H7z" fill="#2f86ff" ${O}/>`,
  ),
  walls: svg(
    `<rect x="3" y="9" width="18" height="12" fill="#c7cdd4" ${O}/><path d="M3 9V5h3v2h3V5h3v2h3V5h3v2h3v2" fill="#c7cdd4" ${O}/><path d="M3 15h18M9 9v6M15 15v6" stroke="#1d2530" stroke-width="1.2"/>`,
  ),
  towers: svg(
    `<rect x="6" y="7" width="12" height="14" fill="#2f86ff" ${O}/><path d="M5 7V3h3v2h2V3h4v2h2V3h3v4z" fill="#2f86ff" ${O}/><path d="M12 10v6M9 13h6" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  ),
  blast: svg(
    `<circle cx="12" cy="13" r="7" fill="#3b4350" ${O}/><path d="M15 7l2-3" stroke="#8a5a32" stroke-width="2"/><path d="M17 3l1 1M19 4l-1 1" stroke="#ffb21a" stroke-width="2" stroke-linecap="round"/><circle cx="9.5" cy="11" r="1.8" fill="#fff" opacity=".6"/>`,
  ),
  workshop: svg(
    `<path d="M4 20l7-7M13 11l3-3 4 4-3 3z" fill="#c7cdd4" ${O}/><path d="M4 20l-1 1" stroke="#1d2530" stroke-width="2"/><circle cx="8" cy="7" r="4" fill="none" stroke="#8a94a3" stroke-width="2.4"/>`,
  ),
  cluster: svg(
    `<circle cx="12" cy="12" r="4" fill="#ff8a3d" ${O}/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" stroke="#ffb21a" stroke-width="2" stroke-linecap="round"/>`,
  ),
  loot: svg(
    `<rect x="3" y="10" width="18" height="10" rx="2" fill="#c47a2c" ${O}/><path d="M3 10a9 5 0 0 1 18 0z" fill="#e0943d" ${O}/><circle cx="8" cy="7" r="2.5" fill="#ffc21a" ${O}/><circle cx="15" cy="6" r="2.5" fill="#ffc21a" ${O}/>`,
  ),
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
  private rocketArmed = false;
  private rocketCool = 0;

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
    const def = levelDef(n);
    def.player = playerBonus(this.save);
    def.enemyGrowth = (def.enemyGrowth ?? 1) * enemyScale(this.save);
    this.state = createGame(def);
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
    this.rocketArmed = false;
    this.rocketCool = 0;
    this.updateRocketBtn();
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
      const n = this.state.def.n,
        secs = this.state.time;
      const first = n >= this.save.level;
      const stars = starsFor(this.state.def, secs);
      const prevStars = this.save.stars[n - 1] ?? 0;
      const prevTime = this.save.times[n - 1] ?? 0;
      const coins = winCoinsFor(this.save, n, stars, first);
      this.save.level = Math.max(this.save.level, n + 1);
      this.save.stars[n - 1] = Math.max(prevStars, stars);
      const newBest = !prevTime || secs < prevTime;
      if (newBest) this.save.times[n - 1] = Math.round(secs);
      this.save.coins += coins;
      writeSave(this.save);
      confetti();
      const starHtml = [1, 2, 3]
        .map(
          (i) =>
            `<span class="star ${i <= stars ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.25}s">${ICON.star}</span>`,
        )
        .join('');
      this.setScreen(
        `<div class="banner win">${isBoss(n) ? 'Boss besiegt!' : 'Gewonnen!'}</div>
         <div class="stars-big">${starHtml}</div>
         <div class="sub">Level ${n} in ${fmtTime(secs)}${newBest && prevTime ? ' · neue Bestzeit!' : ''}</div>
         <div class="reward">${ICON.coin}<b id="coinCount">+0</b></div>
         ${stars < 3 ? `<div class="hint3">3 Sterne unter ${fmtTime(parTime(this.state.def))}</div>` : ''}
         <button class="big green" id="next">Weiter</button>`,
      );
      countUp($('coinCount'), coins);
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
    el.style.background = '';
    el.hidden = html === null;
    el.className = `screen ${this.mode}`;
    $('panel').innerHTML = html ?? '';
  }

  showStart(): void {
    this.mode = 'start';
    $('hud').hidden = true;
    this.setScreen(
      `<div class="logo">Burgensturm</div>
       <div class="start-bottom">
         ${this.newKindCard()}
         <div class="level-big">Level ${this.state.def.n}</div>
         <div class="goal">${this.startGoal()}</div>
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
      `<div class="map-top"><div><div class="map-title">Burgensturm</div><div class="map-tag">Erobere alle roten Türme!</div>
         <div class="wallet"><span class="pill">${ICON.coin}<b>${this.save.coins}</b></span><span class="pill">${ICON.star}<b>${totalStars(this.save)}</b></span></div></div>
         <div class="map-buttons"><button class="round" id="info" aria-label="Anleitung">${ICON.info}</button>
         <button class="round" id="sound" aria-label="Ton">${this.save.sound ? ICON.soundOn : ICON.soundOff}</button></div></div>
       <div class="map" id="map">${mapHtml(cur, Math.min(window.innerWidth, 560), this.save.stars)}</div>
       <div class="map-bottom">
         <button class="side-btn" id="shop" aria-label="Skills">${ICON.shop}<span>Skills</span></button>
         <button class="big green" id="playCur">Level ${cur}</button>
         <button class="side-btn${dailyAvailable(this.save, new Date()) ? ' glow' : ''}" id="daily" aria-label="Tagesbonus">${ICON.chest}<span>Bonus</span></button>
       </div>`,
    );
    $('screen').className = 'screen map-screen';
    // the area beside the map takes the colour of the current world
    $('screen').style.background = PALETTES[themeOf(cur).id].outer;
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
    $('shop').addEventListener('click', () => {
      sfx.tap();
      this.showShop();
    });
    $('daily').addEventListener('click', () => this.showDaily());
  }

  /** Daily bonus chest: coins grow with the streak of days in a row (up to day 7). */
  private showDaily(): void {
    sfx.tap();
    const now = new Date();
    if (!dailyAvailable(this.save, now)) {
      this.setScreen(
        `<div class="card-box"><div class="chest-big">${ICON.chest}</div><h2>Tagesbonus</h2>
         <p>Heute schon abgeholt. Komm morgen wieder, dann wird er größer!</p><p class="streak">Serie: ${this.save.streak} ${this.save.streak === 1 ? 'Tag' : 'Tage'}</p>
         <button class="big green" id="ok">Super</button></div>`,
      );
    } else {
      const reward = collectDaily(this.save, now);
      writeSave(this.save);
      sfx.win();
      confetti();
      const days = [1, 2, 3, 4, 5, 6, 7]
        .map(
          (d) =>
            `<span class="day${d <= this.save.streak ? ' got' : ''}"><small>Tag ${d}</small>${40 * d}</span>`,
        )
        .join('');
      this.setScreen(
        `<div class="card-box"><div class="chest-big open">${ICON.chest}</div><h2>Tagesbonus</h2>
         <div class="reward">${ICON.coin}<b id="coinCount">+0</b></div>
         <div class="days">${days}</div>
         <p class="streak">${this.save.streak} ${this.save.streak === 1 ? 'Tag' : 'Tage'} in Folge. Morgen gibt es mehr!</p>
         <button class="big green" id="ok">Einsammeln</button></div>`,
      );
      countUp($('coinCount'), reward);
    }
    $('screen').className = 'screen popup';
    $('ok').addEventListener('click', () => {
      sfx.tap();
      this.showMap();
    });
  }

  /** Skill tree: five branches, each skill unlocks the next; bought with coins. */
  private showShop(): void {
    const cols = BRANCHES.map((br) => {
      const nodes = UPGRADES.filter((u) => u.branch === br)
        .map((u, i) => {
          const lvl = this.save.upgrades[u.id],
            max = lvl >= u.max,
            open = skillUnlocked(this.save, u),
            cost = upgradeCost(lvl, u.price),
            can = open && !max && this.save.coins >= cost;
          const pips = Array.from({ length: u.max }, (_, k) => `<i class="${k < lvl ? 'on' : ''}"></i>`).join(
            '',
          );
          const reqName = u.req ? (UPGRADES.find((x) => x.id === u.req?.id)?.name ?? '') : '';
          return `${i ? '<div class="link' + (open ? ' on' : '') + '"></div>' : ''}
          <div class="skill${open ? '' : ' locked'}${max ? ' maxed' : ''}">
            <div class="skill-icon">${SKILL_ICON[u.id]}</div>
            <div class="upg-text"><b>${u.name}</b>
              <span>${open ? `${lvl ? u.desc(lvl) : 'Noch nicht gelernt'}${max ? '' : ` → ${u.desc(lvl + 1)}`}` : `Braucht ${reqName} Stufe ${u.req?.lvl ?? 1}`}</span>
              <div class="pips">${pips}</div></div>
            <button class="buy ${can ? '' : 'off'}" data-up="${u.id}" ${max || !open ? 'disabled' : ''}>${max ? 'Max' : open ? `${ICON.coin}${cost}` : ICON.lock}</button>
          </div>`;
        })
        .join('');
      return `<div class="branch"><h3>${br}</h3>${nodes}</div>`;
    }).join('');
    this.setScreen(
      `<div class="card-box shop"><h2>Skills</h2><div class="wallet center"><span class="pill">${ICON.coin}<b>${this.save.coins}</b></span></div>
       <p>Dauerhafte Verbesserungen. Jeder Skill schaltet den nächsten in seinem Zweig frei. Münzen gibt es für Siege, Sterne und den Tagesbonus.</p>
       <div class="tree">${cols}</div><button class="big green" id="ok">Zur Karte</button></div>`,
    );
    $('screen').className = 'screen popup';
    $('panel')
      .querySelectorAll<HTMLButtonElement>('button.buy')
      .forEach((b) =>
        b.addEventListener('click', () => {
          const id = b.dataset.up as UpgradeId;
          const u = UPGRADES.find((x) => x.id === id);
          if (!u) return;
          const cost = upgradeCost(this.save.upgrades[id], u.price);
          if (this.save.coins < cost) {
            sfx.error();
            b.classList.remove('shake');
            void b.offsetWidth;
            b.classList.add('shake');
            return;
          }
          this.save.coins -= cost;
          this.save.upgrades[id]++;
          writeSave(this.save);
          sfx.capture(true);
          const y = $('screen').scrollTop;
          this.showShop();
          $('screen').scrollTop = y;
        }),
      );
    $('ok').addEventListener('click', () => {
      sfx.tap();
      this.showMap();
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
        <p class="lead">Burgensturm ist ein Strategiespiel um Türme. Du bist <b class="blue">Blau</b>, der Gegner ist <b class="red">Rot</b>, graue Türme gehören noch niemandem. Erobere alle roten Türme, dann hast du das Level gewonnen.</p>
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

  /** Star goal line on the start screen. */
  private startGoal(): string {
    const n = this.state.def.n;
    const got = this.save.stars[n - 1] ?? 0;
    const stars = [1, 2, 3]
      .map((i) => `<span class="star small ${i <= got ? 'on' : ''}">${ICON.star}</span>`)
      .join('');
    return `${stars}<span>3 Sterne: unter ${fmtTime(parTime(this.state.def))}${isBoss(n) ? ' · Boss-Level, doppelte Münzen' : ''}</span>`;
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
    $('rocketBtn').addEventListener('click', () => this.toggleRocket());
  }

  /** Rocket button: arm (then tap an enemy tower) or disarm; costs coins when fired. */
  private toggleRocket(): void {
    if (this.mode !== 'play') return;
    const { cost } = rocketStats(this.save);
    if (this.rocketArmed) {
      this.rocketArmed = false;
      this.tip('', 0);
    } else if (this.rocketCool > 0) {
      sfx.error();
      return;
    } else if (this.save.coins < cost) {
      sfx.error();
      this.tip(`Zu wenig Münzen: Der Raketenschwarm kostet ${cost}.`, 2.5);
      return;
    } else {
      this.rocketArmed = true;
      sfx.tap();
      this.tip('Raketenschwarm bereit: Tippe auf einen gegnerischen Turm.', 0);
    }
    this.updateRocketBtn();
  }

  private fireRocketAt(id: number): void {
    const st = rocketStats(this.save);
    if (this.save.coins < st.cost || !fireRockets(this.state, id, st.damage, st.splash)) {
      sfx.error();
      return;
    }
    this.save.coins -= st.cost;
    writeSave(this.save);
    this.rocketArmed = false;
    this.rocketCool = ROCKET_COOLDOWN;
    this.tip('', 0);
    sfx.rocket();
    this.updateRocketBtn();
  }

  private updateRocketBtn(): void {
    const b = $<HTMLButtonElement>('rocketBtn');
    const { cost } = rocketStats(this.save);
    b.classList.toggle('armed', this.rocketArmed);
    b.classList.toggle('poor', this.save.coins < cost);
    b.style.setProperty('--cd', String(Math.max(0, this.rocketCool / ROCKET_COOLDOWN)));
    b.innerHTML = `${ICON.rocket}<span>${ICON.coin}${cost}</span><small>${this.save.coins}</small>`;
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
        else if (e.type === 'rocket' || e.type === 'wallbreak') sfx.boom();
        else if (e.type === 'end') this.finish(e.result);
      }
      this.updateBar();
      if (this.rocketCool > 0) {
        this.rocketCool = Math.max(0, this.rocketCool - dt);
        this.updateRocketBtn();
      }
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
      if (this.rocketArmed) {
        this.pointerId = null;
        const t = id !== null ? this.state.towers[id] : undefined;
        if (t && t.owner >= 2) this.fireRocketAt(t.id);
        else {
          this.rocketArmed = false;
          this.tip('', 0);
          this.updateRocketBtn();
        }
        return;
      }
      if (
        id !== null &&
        this.state.towers[id]?.owner === PLAYER &&
        this.state.towers[id]?.kind === 'cannon'
      ) {
        this.pointerId = null;
        sfx.error();
        this.tip('Kanonentürme verteidigen nur und ziehen keine Linien.', 2.5);
        return;
      }
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
        d.cost = d.target !== null ? lineCost(this.state, d.src, d.target) : undefined;
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
        else if (r === 'poor')
          this.tip(`Zu wenig Soldaten: Diese Linie kostet ${lineCost(this.state, d.src, d.target)}.`, 2.5);
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
