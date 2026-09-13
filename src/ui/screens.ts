import { ACHIEVEMENTS, CAMPAIGN, CHAPTERS, DIFF, FACTIONS, MINE_UNITS, SKILLS, TYPES } from '@/data';
import { computePerks } from '@/data/skills';
import { nodeIcon } from '@/render/pixi/textures';
import { fmtTime, type Game } from '@/app/game';
import {
  clearSave,
  defaultSave,
  exportCode,
  importCode,
  type Difficulty,
  type GraphicsSetting,
} from '@/app/save';
import { enterFullscreen } from '@/app/pwa';
import { $ } from './dom';
import { tip } from './hud';
import { icon, stars as starIcons } from './icons';

export type ScreenKind =
  | 'menu'
  | 'campaign'
  | 'skills'
  | 'settings'
  | 'howto'
  | 'intro'
  | 'chapter'
  | 'win'
  | 'lose'
  | 'pause'
  | 'stats';

export interface ScreenActions {
  toMenu(kind: ScreenKind): void;
  play(kind: 'campaign' | 'endless' | 'daily', index: number): void;
  resume(): void;
  restart(): void;
  next(): void;
  editor(): void;
}

export function hideScreen(): void {
  $('#screen').hidden = true;
}

export function showScreen(game: Game, kind: ScreenKind, act: ScreenActions): void {
  const card = $('#card');
  card.className = 'card';
  const save = game.save,
    pts = save.points,
    stars = game.totalStars(),
    unlocked = game.campaignUnlocked(),
    L = game.def;
  let h = '';
  if (kind === 'menu') {
    h = `<h1>Tiefenlicht</h1><p class="sub">Ein Strategiespiel um leuchtende Knoten im Abgrund</p>
      <div class="menu"><button class="primary" data-go="campaign">${icon('campaign')}Kampagne</button><button data-go="endless">${icon('endless')}Endlos</button><button data-go="daily">${icon('time')}Tages-Herausforderung ${game.dailyDone() ? '✓' : ''}${save.dailyStreak > 1 ? ` · ${save.dailyStreak} Tage` : ''}</button><button data-go="stats">${icon('trophy')}Erfolge (${save.achievements.length}/${ACHIEVEMENTS.length})</button><button data-go="skills">${icon('skills')}Fähigkeiten ${pts ? `(${pts} Punkte frei)` : ''}</button><button data-go="settings">${icon('settings')}Einstellungen</button><button data-go="howto">${icon('help')}Anleitung</button><button id="mEditor">${icon('route')}Karten-Editor</button><button id="mFs">${icon('fullscreen')}Vollbild</button></div>
      <div class="meta">${stars} von ${CAMPAIGN.length * 3} Sternen, beste Endlos-Welle ${save.endlessBest}, Schwierigkeit ${DIFF[save.difficulty].label} · v${__APP_VERSION__}</div>`;
  } else if (kind === 'campaign') {
    card.className = 'card wide seamap-card';
    const STEP = 104,
      TOP = 90;
    const height = TOP + CAMPAIGN.length * STEP + 60;
    h = `<h2>Kampagne</h2><p class="sub">${stars} Sterne gesammelt. Vom Schelf hinab in den Abgrund: Jedes Level führt tiefer. Schneller als die Zielzeit bringt drei Sterne.</p>
      <div class="seamap" style="height:${height}px">`;
    CHAPTERS.forEach((c, ci) => {
      const first = CAMPAIGN.findIndex((l) => l.ch === ci),
        count = CAMPAIGN.filter((l) => l.ch === ci).length;
      const y0 = TOP + first * STEP - 60,
        hh = count * STEP;
      h += `<div class="zone z${ci}" style="top:${y0}px;height:${hh}px"><b>Kapitel ${ci + 1}: ${c.name}</b><span>${c.desc}</span></div>`;
    });
    h += `<svg class="path" viewBox="0 0 1000 ${height}" preserveAspectRatio="none"></svg>`;
    CAMPAIGN.forEach((lv, i) => {
      const locked = i > unlocked,
        st = save.stars[i],
        bt = save.bestTimes[i];
      const x = 50 + Math.sin(i * 0.95) * 28,
        y = TOP + i * STEP;
      const cls = locked ? 'locked' : st ? 'done' : 'next';
      const side = x > 50 ? 'left' : 'right';
      h += `<button class="mnode ${cls} ${lv.boss ? 'boss' : ''} ${side}" style="left:${x}%;top:${y}px" data-play="${i}" data-x="${x}" data-y="${y}" ${locked ? 'disabled' : ''} aria-label="${i + 1}. ${lv.name}">
        <span class="num">${locked ? icon('lock') : lv.boss ? icon('trophy') : i + 1}</span>
        <span class="lbl"><b>${lv.name}</b>${st ? starIcons(st) : `<small>${locked ? 'Gesperrt' : 'Nächstes Level'}</small>`}<small>${lv.enemies} Gegner${bt ? ` · ${fmtTime(bt)}` : ''}</small></span>
      </button>`;
    });
    h += `</div><div class="actions sticky"><button data-go="menu">${icon('back')}Zurück</button><span class="meta">${unlocked + 1} von ${CAMPAIGN.length} Leveln erreicht</span></div>`;
  } else if (kind === 'skills') {
    card.className = 'card wide';
    const branches = [...new Set(SKILLS.map((s) => s.branch))];
    h = `<h2>Fähigkeiten</h2><p class="sub">${pts} Punkte verfügbar. Jeder Stern in der Kampagne und jede neue Endlos-Welle bringt einen Punkt. Alles wirkt dauerhaft.</p><div class="tree">`;
    for (const b of branches) {
      h += `<div class="branch" data-branch="${b}"><svg class="links"></svg><h3>${b}</h3>`;
      for (const sk of SKILLS.filter((s) => s.branch === b)) {
        const owned = save.spent.includes(sk.id),
          open = !sk.req || save.spent.includes(sk.req),
          can = !owned && open && pts >= sk.cost;
        const reqName = sk.req ? (SKILLS.find((s) => s.id === sk.req)?.name ?? '') : '';
        h += `<button class="sk ${owned ? 'owned' : ''}" data-skill="${sk.id}" ${can ? '' : 'disabled'}><b>${sk.name}</b><small>${sk.desc}</small><span class="cost">${owned ? 'Freigeschaltet' : open ? `${sk.cost} ${sk.cost === 1 ? 'Punkt' : 'Punkte'}` : `Braucht: ${reqName}`}</span></button>`;
      }
      h += '</div>';
    }
    h += `</div><div class="actions"><button data-go="menu">${icon('back')}Zurück</button></div>`;
  } else if (kind === 'settings') {
    h = `<h2>Einstellungen</h2>
      <div class="setrow"><span>${icon('sound')} Sound</span><button id="sSound" aria-pressed="${save.sound}">${save.sound ? 'An' : 'Aus'}</button></div>
      <div class="setrow"><label for="sMusic">Musik</label><input id="sMusic" type="range" min="0" max="1" step="0.05" value="${save.music}" aria-label="Musiklautstärke" /></div>
      <div class="setrow"><label for="sSfx">Effekte</label><input id="sSfx" type="range" min="0" max="1" step="0.05" value="${save.sfx}" aria-label="Effektlautstärke" /></div>
      <div class="setrow"><span>Vibration (Android)</span><button id="sHaptics" aria-pressed="${save.haptics}">${save.haptics ? 'An' : 'Aus'}</button></div>
      <div class="setrow"><span>Vollbild beim Levelstart (Touchgeräte)</span><button id="sFs" aria-pressed="${save.autoFs !== false}">${save.autoFs !== false ? 'An' : 'Aus'}</button></div>
      <div class="setrow"><span>Grafik <small class="meta">(${game.renderer.kind === 'pixi' ? 'WebGL' : 'Canvas'})</small></span><span>${(['auto', 'hoch', 'mittel', 'niedrig'] as GraphicsSetting[]).map((k) => `<button data-gfx="${k}" aria-pressed="${save.graphics === k}">${{ auto: 'Auto', hoch: 'Hoch', mittel: 'Mittel', niedrig: 'Niedrig' }[k]}</button>`).join(' ')}</span></div>
      <div class="setrow"><span>Schwierigkeit</span><span>${(Object.keys(DIFF) as Difficulty[]).map((k) => `<button data-diff="${k}" aria-pressed="${save.difficulty === k}">${DIFF[k].label}</button>`).join(' ')}</span></div>
      <div class="setrow" style="display:block"><span>Spielstand-Code (zum Sichern oder Übertragen)</span><textarea id="sCode" spellcheck="false">${exportCode(save)}</textarea>
      <div class="actions"><button id="sImport">Code laden</button><button id="sReset">Fortschritt löschen</button></div></div>
      <div class="actions"><button data-go="menu">Zurück</button></div>`;
  } else if (kind === 'howto') {
    h = `<h2>Anleitung</h2>
      <ul><li><b>Linien:</b> Ziehe von einem eigenen Gebäude zu einem Ziel. Die Linie bleibt, und deine Einheiten strömen laufend hinüber, bis du sie kappst. Mehr Linien pro Gebäude gibt es mit jeder Ausbaustufe (1, 2, 3).</li>
      <li><b>Kappen:</b> Quer über eine Linie wischen. Alternativ im Gebäudemenü oder per Rechtsklick auf das Gebäude.</li>
      
      <li><b>Gebäudemenü:</b> Eigenes Gebäude antippen: Ausbau bis Stufe 3 (jede Art wird anders stärker), Umbau in eine andere Art, Linien löschen.</li>
      <li><b>Hindernisse:</b> Riffbarrieren müssen durchbrochen werden (kostet Einheiten), Minen zerstören einen Teil des ersten Schwarms, der vorbeizieht. Felsen versperren Wege ganz.</li>
      <li><b>Kampf:</b> Angriffsstärke der Truppen gegen Einheiten × Verteidigung des Knotens. Bleibt etwas übrig, wechselt der Knoten die Seite.</li>
      <li><b>Truppen:</b> Jede Knotenart erzeugt eigene Truppen: Drohnen sind schnell und schwach, Panzer stark und langsam, Pfeile am schnellsten.</li>
      <li><b>Energie</b> entsteht, wenn Einheiten fallen. Damit zündest du Fähigkeiten (Tasten <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>).</li>
      <li><b>Tasten:</b> <kbd>Leertaste</kbd> Pause, <kbd>F</kbd> Tempo, <kbd>1</kbd>–<kbd>3</kbd> Fähigkeiten, <kbd>Esc</kbd> Abbrechen.</li></ul>
      <div class="actions"><button data-go="menu">Zurück</button></div>`;
  } else if (kind === 'intro') {
    h = `<h2>${L.name}</h2><p class="sub">${game.levelKind === 'campaign' ? `Kapitel ${L.ch + 1}: ${CHAPTERS[L.ch]?.name ?? ''}, Level ${game.levelIndex + 1} von ${CAMPAIGN.length}` : game.levelKind === 'daily' ? 'Heute für alle gleich' : game.levelKind === 'custom' ? 'Eigene Karte' : 'Endlos'} · ${L.enemies === 1 ? 'ein Gegner' : L.enemies + ' Gegner'} · Zielzeit ${fmtTime(L.par)}</p>`;
    if (game.levelKind === 'campaign' && game.levelIndex === 0)
      h += `<ul><li>Ziehe vom goldenen Gebäude zu einem Nachbarn: Die Linie bleibt, und deine Einheiten strömen laufend hinüber. Wische quer über die Linie, um sie zu kappen.</li><li>Fremde Knoten werden angegriffen; ist deine Stärke größer, gehören sie dir.</li><li>Nur gepunktete Linien sind Wege. Felsen trennen das Netz.</li></ul>`;
    else h += `<p>${L.text}</p>`;
    if (L.objective)
      h += `<div class="new"><div><b>${icon('target')} Sonderziel</b><span>${L.objective.label}. Gelingt das, ist das Level sofort gewonnen – oder du besiegst alle Gegner.</span></div></div>`;
    if (L.newType)
      h += `<div class="new"><div class="icon"></div><div><b>Neu: ${TYPES[L.newType].name}</b><span>${TYPES[L.newType].desc}</span></div></div>`;
    if (L.feature === 'upgrade')
      h += `<div class="new"><div class="icon" data-lv="3"></div><div><b>Neu: Ausbau</b><span>Tippe einen eigenen Knoten an und zahle Einheiten, um ihn auf Stufe 2 und 3 zu bringen: mehr Produktion, mehr Vorrat, mehr Verteidigung.</span></div></div>`;
    if (L.feature === 'split')
      h += `<div class="new"><div><b>Neu: Geteilte Routen und Reserve</b><span>Ein Gebäude hält je nach Ausbaustufe eine, zwei oder drei Linien; der Strom teilt sich gleichmäßig auf. Kappe Linien rechtzeitig, damit ein Gebäude nicht leerläuft.</span></div></div>`;
    if (L.feature === 'barrier')
      h += `<div class="new"><div><b>Neu: Riffbarrieren</b><span>Manche Verbindungen sind von einer Barriere versperrt. Truppen, die dort ankommen, verbrauchen sich beim Durchbrechen: Erst wenn die Barriere fällt, kommen die nächsten hindurch. Das gilt auch für die Gegner.</span></div></div>`;
    if (L.feature === 'mine')
      h += `<div class="new"><div><b>Neu: Minen</b><span>Minen liegen auf Verbindungen und zerstören bis zu ${MINE_UNITS} Einheiten des ersten Schwarms, der vorbeizieht. Danach sind sie verbraucht. Schicke einen kleinen Trupp voraus oder lass den Gegner sie auslösen.</span></div></div>`;
    if (L.feature === 'convert')
      h += `<div class="new"><div><b>Neu: Umbau</b><span>Im Knotenmenü kannst du eine andere Knotenart wählen. Der Knoten fällt dabei auf Stufe 1 zurück.</span></div></div>`;
    h += `<div class="actions"><button class="primary" id="go">Level starten</button><button data-go="${game.levelKind === 'campaign' ? 'campaign' : 'menu'}">Zurück</button></div>`;
  } else if (kind === 'stats') {
    card.className = 'card wide';
    const st = save.stats;
    const hours = Math.floor(st.playTime / 3600),
      mins = Math.floor((st.playTime % 3600) / 60);
    h = `<h2>Erfolge und Statistik</h2><p class="sub">${save.achievements.length} von ${ACHIEVEMENTS.length} Erfolgen freigeschaltet.</p>
      <div class="stats"><div><b>${st.gamesPlayed}</b>Level gespielt</div><div><b>${st.wins}</b>gewonnen</div><div><b>${st.captures}</b>Knoten erobert</div><div><b>${st.lost}</b>Knoten verloren</div><div><b>${st.cuts}</b>Routen gekappt</div><div><b>${hours ? `${hours} h ` : ''}${mins} min</b>Spielzeit</div><div><b>${save.dailyStreak}</b>Tage in Folge</div></div>
      <div class="achievements">${ACHIEVEMENTS.map((a) => `<div class="ach ${save.achievements.includes(a.id) ? 'on' : ''}">${icon(save.achievements.includes(a.id) ? 'trophy' : 'lock')}<div><b>${a.name}</b><small>${a.desc}</small></div></div>`).join('')}</div>
      <div class="actions"><button data-go="menu">${icon('back')}Zurück</button></div>`;
  } else if (kind === 'chapter') {
    const c = CHAPTERS[L.ch];
    h = `<p class="sub">Kapitel ${L.ch + 1}</p><h2>${c?.name ?? ''}</h2><p class="chapter-intro">${c?.intro ?? ''}</p>
      <div class="actions"><button class="primary" id="go">Weiter</button><button data-go="campaign">Zurück</button></div>`;
  } else if (kind === 'win') {
    const r = game.result ?? { stars: 1, gained: 0, bestTime: game.levelTime, newBest: false };
    h = `<h2>${r.newBest ? 'Neue Bestzeit!' : 'Der Abgrund leuchtet golden'}</h2><p class="sub">${L.name} geschafft</p>
      <div class="stats"><div><b>${starIcons(r.stars)}</b>${r.stars === 3 ? 'unter Zielzeit' : r.stars === 2 ? 'nah an der Zielzeit' : 'geschafft'}</div><div><b>${fmtTime(game.levelTime)}</b>Zeit (Ziel ${fmtTime(L.par)})</div><div><b class="${r.newBest ? 'newbest' : ''}">${fmtTime(r.bestTime)}</b>${r.newBest ? 'neuer Rekord' : 'Bestzeit'}</div><div><b>${game.state.stats.captured}</b>erobert</div><div><b>+${r.gained}</b>Punkte</div></div>
      ${game.unlocked.length ? `<div class="new"><div><b>${icon('trophy')} Erfolg freigeschaltet</b><span>${game.unlocked.map((a) => `${a.name} – ${a.desc}`).join(' · ')}</span></div></div>` : ''}
      ${game.levelKind === 'daily' ? `<p class="meta">Tages-Herausforderung geschafft. Serie: ${save.dailyStreak} Tag${save.dailyStreak === 1 ? '' : 'e'}. Morgen wartet eine neue Karte.</p>` : ''}
      <div class="actions"><button class="primary" id="next">${game.levelKind === 'campaign' ? (game.levelIndex + 1 < CAMPAIGN.length ? 'Nächstes Level' : 'Kampagne geschafft – zur Übersicht') : game.levelKind === 'custom' ? 'Zurück zum Editor' : game.levelKind === 'daily' ? 'Zum Menü' : 'Nächste Welle'}</button><button id="again">Nochmal</button>${save.points ? '<button data-go="skills">Fähigkeiten</button>' : ''}<button data-go="menu">Menü</button></div>`;
  } else if (kind === 'lose') {
    const winner = FACTIONS[game.state.nodes.find((n) => n.owner > 1)?.owner ?? 2] ?? FACTIONS[2];
    h = `<h2>Der Goldschwarm ist erloschen</h2><p class="sub">${L.name}</p>
      <p>Der <span class="swatch" style="background:${winner?.color ?? '#fff'}"></span>${winner?.name ?? ''} hat deinen letzten Knoten eingenommen. Tipp: Halte an der Front eine Reserve, bau Wächter an Kreuzungen und sammle Energie für einen Schild, wenn ein großer Schwarm anrückt.</p>
      <div class="actions"><button class="primary" id="again">Nochmal versuchen</button>${save.points ? '<button data-go="skills">Fähigkeiten</button>' : ''}<button data-go="${game.levelKind === 'campaign' ? 'campaign' : 'menu'}">Zurück</button></div>`;
  } else if (kind === 'pause') {
    h = `<h2>Pause</h2><p class="sub">${L.name}, ${fmtTime(game.levelTime)} gespielt</p><div class="actions"><button class="primary" id="go">Weiter</button><button id="again">Neu starten</button><button data-go="menu">Aufgeben</button></div>`;
  }
  card.innerHTML = h;
  if (kind === 'campaign') requestAnimationFrame(() => drawSeaPath(card, unlocked));
  if (kind === 'skills') requestAnimationFrame(() => drawSkillLinks(card, save.spent));
  if (kind === 'intro') {
    card
      .querySelectorAll<HTMLElement>('.icon')
      .forEach((e) =>
        e.replaceWith(
          nodeIcon(
            L.newType ?? 'nest',
            Math.min(3, Math.max(1, +(e.dataset.lv ?? 1))) as 1 | 2 | 3,
            '#ffc45a',
            56,
          ),
        ),
      );
  }
  card.querySelector('#go')?.addEventListener('click', () => act.resume());
  card.querySelector('#next')?.addEventListener('click', () => act.next());
  card.querySelectorAll('#again').forEach((b) => b.addEventListener('click', () => act.restart()));
  card.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) =>
    b.addEventListener('click', () => {
      game.audio.play('click');
      const g = b.dataset.go as ScreenKind | 'endless' | 'daily';
      if (g === 'endless') act.play('endless', Math.max(1, save.endlessBest + 1));
      else if (g === 'daily') act.play('daily', 0);
      else act.toMenu(g);
    }),
  );
  card.querySelectorAll<HTMLButtonElement>('[data-play]').forEach((b) =>
    b.addEventListener('click', () => {
      game.audio.play('click');
      act.play('campaign', +(b.dataset.play ?? 0));
    }),
  );
  card.querySelectorAll<HTMLButtonElement>('[data-skill]').forEach((b) =>
    b.addEventListener('click', () => {
      const sk = SKILLS.find((s) => s.id === b.dataset.skill);
      if (sk && save.points >= sk.cost && !save.spent.includes(sk.id)) {
        save.points -= sk.cost;
        save.spent.push(sk.id);
        game.state.perks = computePerks(save.spent);
        game.persist();
        game.audio.play('upgrade');
        showScreen(game, 'skills', act);
      }
    }),
  );
  card.querySelector('#mEditor')?.addEventListener('click', () => act.editor());
  card.querySelector('#mFs')?.addEventListener('click', () => {
    void enterFullscreen().then((ok) => {
      if (!ok)
        tip(
          'Vollbild wird hier nicht unterstützt. Auf dem iPhone: Teilen → „Zum Home-Bildschirm“, dann startet Tiefenlicht bildschirmfüllend.',
          6000,
        );
    });
  });
  if (kind === 'settings') {
    card.querySelector('#sFs')?.addEventListener('click', () => {
      save.autoFs = save.autoFs === false;
      game.persist();
      showScreen(game, 'settings', act);
      game.audio.play('click');
    });
    card.querySelector<HTMLInputElement>('#sMusic')?.addEventListener('input', (ev) => {
      save.music = +(ev.target as HTMLInputElement).value;
      game.audio.init();
      game.audio.music.setVolume(save.music);
      game.persist();
    });
    card.querySelector<HTMLInputElement>('#sSfx')?.addEventListener('change', (ev) => {
      save.sfx = +(ev.target as HTMLInputElement).value;
      game.audio.init();
      game.audio.setSfxVolume(save.sfx);
      game.persist();
      game.audio.play('capture');
    });
    card.querySelector('#sHaptics')?.addEventListener('click', () => {
      save.haptics = !save.haptics;
      game.persist();
      showScreen(game, 'settings', act);
      game.audio.play('click');
    });
    card.querySelector('#sSound')?.addEventListener('click', () => {
      game.audio.init();
      save.sound = !save.sound;
      game.audio.setEnabled(save.sound);
      game.persist();
      showScreen(game, 'settings', act);
      game.audio.play('click');
    });
    card.querySelectorAll<HTMLButtonElement>('[data-gfx]').forEach((b) =>
      b.addEventListener('click', () => {
        save.graphics = b.dataset.gfx as GraphicsSetting;
        game.persist();
        location.reload();
      }),
    );
    card.querySelectorAll<HTMLButtonElement>('[data-diff]').forEach((b) =>
      b.addEventListener('click', () => {
        save.difficulty = b.dataset.diff as Difficulty;
        game.state.difficulty = save.difficulty;
        game.persist();
        showScreen(game, 'settings', act);
        game.audio.play('click');
      }),
    );
    card.querySelector('#sImport')?.addEventListener('click', () => {
      const code = $<HTMLTextAreaElement>('#sCode').value;
      const imported = importCode(code);
      if (imported) {
        game.save = { ...save, ...imported };
        game.persist();
        game.audio.play('upgrade');
        showScreen(game, 'menu', act);
      } else {
        game.audio.play('error');
        tip('Der Code ist ungültig.', 2000);
      }
    });
    card.querySelector('#sReset')?.addEventListener('click', () => {
      if (confirm('Wirklich allen Fortschritt löschen?')) {
        clearSave();
        game.save = { ...defaultSave(), sound: save.sound, difficulty: save.difficulty, autoFs: save.autoFs };
        game.persist();
        showScreen(game, 'settings', act);
      }
    });
  }
  $('#screen').hidden = false;
  const first = card.querySelector<HTMLElement>('.primary');
  if (first) first.focus();
}

/** Draws the winding descent path through all campaign levels and scrolls to the next one. */
function drawSeaPath(card: HTMLElement, unlocked: number): void {
  const map = card.querySelector<HTMLElement>('.seamap');
  const svg = map?.querySelector<SVGSVGElement>('svg.path');
  if (!map || !svg) return;
  const nodes = [...map.querySelectorAll<HTMLElement>('.mnode')].map((el) => ({
    x: (+(el.dataset.x ?? 50) / 100) * 1000,
    y: +(el.dataset.y ?? 0),
    idx: +(el.dataset.play ?? 0),
  }));
  svg.innerHTML = '';
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i] as { x: number; y: number; idx: number },
      b = nodes[i + 1] as { x: number; y: number; idx: number };
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const my = (a.y + b.y) / 2;
    path.setAttribute('d', `M${a.x},${a.y} C${a.x},${my} ${b.x},${my} ${b.x},${b.y}`);
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    if (b.idx <= unlocked) path.setAttribute('class', 'done');
    svg.appendChild(path);
  }
  const next = map.querySelector<HTMLElement>('.mnode.next');
  if (next) next.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
}

/** Draws prerequisite lines between skills of a branch. */
function drawSkillLinks(card: HTMLElement, spent: readonly string[]): void {
  card.querySelectorAll<HTMLElement>('.branch').forEach((branch) => {
    const svg = branch.querySelector<SVGSVGElement>('svg.links');
    if (!svg) return;
    svg.innerHTML = '';
    const br = branch.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${br.width} ${br.height}`);
    const pos = new Map<string, { x: number; y: number; bottom: number; top: number }>();
    branch.querySelectorAll<HTMLElement>('.sk').forEach((el) => {
      const r = el.getBoundingClientRect();
      pos.set(el.dataset.skill ?? '', {
        x: r.left + r.width / 2 - br.left,
        y: r.top + r.height / 2 - br.top,
        top: r.top - br.top,
        bottom: r.bottom - br.top,
      });
    });
    for (const sk of SKILLS) {
      if (!sk.req) continue;
      const a = pos.get(sk.req),
        b = pos.get(sk.id);
      if (!a || !b) continue;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(a.x));
      line.setAttribute('y1', String(a.bottom));
      line.setAttribute('x2', String(b.x));
      line.setAttribute('y2', String(b.top));
      if (spent.includes(sk.id)) line.setAttribute('class', 'owned');
      svg.appendChild(line);
    }
  });
}
