import { CAMPAIGN, CHAPTERS, DIFF, FACTIONS, SKILLS, TYPES } from '@/data';
import { computePerks } from '@/data/skills';
import { typeIcon } from '@/render/canvas2d/shapes';
import { fmtTime, starStr, type Game } from '@/app/game';
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

export type ScreenKind =
  'menu' | 'campaign' | 'skills' | 'settings' | 'howto' | 'intro' | 'win' | 'lose' | 'pause';

export interface ScreenActions {
  toMenu(kind: ScreenKind): void;
  play(kind: 'campaign' | 'endless', index: number): void;
  resume(): void;
  restart(): void;
  next(): void;
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
  const levelBtn = (i: number) => {
    const lv = CAMPAIGN[i];
    if (!lv) return '';
    const locked = i > unlocked;
    const st = save.stars[i];
    const bt = save.bestTimes[i];
    return `<button class="lv ${locked ? 'locked' : ''}" data-play="${i}" ${locked ? 'disabled' : ''}><b>${i + 1}. ${lv.name}</b><small>${st ? `<span class="stars">${starStr(st)}</span>` : locked ? 'Gesperrt' : 'Offen'} · ${lv.enemies} Gegner${bt ? ` · ${fmtTime(bt)}` : ''}</small></button>`;
  };
  let h = '';
  if (kind === 'menu') {
    h = `<h1>Tiefenlicht</h1><p class="sub">Ein Strategiespiel um leuchtende Knoten im Abgrund</p>
      <div class="menu"><button class="primary" data-go="campaign">Kampagne</button><button data-go="endless">Endlos</button><button data-go="skills">Fähigkeiten ${pts ? `(${pts} Punkte frei)` : ''}</button><button data-go="settings">Einstellungen</button><button data-go="howto">Anleitung</button><button id="mFs">Vollbild</button></div>
      <div class="meta">${stars} von ${CAMPAIGN.length * 3} Sternen, beste Endlos-Welle ${save.endlessBest}, Schwierigkeit ${DIFF[save.difficulty].label} · v${__APP_VERSION__}</div>`;
  } else if (kind === 'campaign') {
    card.className = 'card wide';
    h = `<h2>Kampagne</h2><p class="sub">${stars} Sterne gesammelt. Schneller als die Zielzeit bringt drei Sterne, Sterne werden zu Fähigkeitspunkten.</p>`;
    CHAPTERS.forEach((c, ci) => {
      h += `<div class="chapter"><h3>Kapitel ${ci + 1}: ${c.name} <span class="meta">${c.desc}</span></h3><div class="lvgrid">${CAMPAIGN.map((l, i) => (l.ch === ci ? levelBtn(i) : '')).join('')}</div></div>`;
    });
    h += `<div class="actions"><button data-go="menu">Zurück</button></div>`;
  } else if (kind === 'skills') {
    card.className = 'card wide';
    const branches = [...new Set(SKILLS.map((s) => s.branch))];
    h = `<h2>Fähigkeiten</h2><p class="sub">${pts} Punkte verfügbar. Jeder Stern in der Kampagne und jede neue Endlos-Welle bringt einen Punkt. Alles wirkt dauerhaft.</p><div class="tree">`;
    for (const b of branches) {
      h += `<div class="branch"><h3>${b}</h3>`;
      for (const sk of SKILLS.filter((s) => s.branch === b)) {
        const owned = save.spent.includes(sk.id),
          open = !sk.req || save.spent.includes(sk.req),
          can = !owned && open && pts >= sk.cost;
        const reqName = sk.req ? (SKILLS.find((s) => s.id === sk.req)?.name ?? '') : '';
        h += `<button class="sk ${owned ? 'owned' : ''}" data-skill="${sk.id}" ${can ? '' : 'disabled'}><b>${sk.name}</b><small>${sk.desc}</small><span class="cost">${owned ? 'Freigeschaltet' : open ? `${sk.cost} ${sk.cost === 1 ? 'Punkt' : 'Punkte'}` : `Braucht: ${reqName}`}</span></button>`;
      }
      h += '</div>';
    }
    h += `</div><div class="actions"><button data-go="menu">Zurück</button></div>`;
  } else if (kind === 'settings') {
    h = `<h2>Einstellungen</h2>
      <div class="setrow"><span>Sound</span><button id="sSound" aria-pressed="${save.sound}">${save.sound ? 'An' : 'Aus'}</button></div>
      <div class="setrow"><span>Vollbild beim Levelstart (Touchgeräte)</span><button id="sFs" aria-pressed="${save.autoFs !== false}">${save.autoFs !== false ? 'An' : 'Aus'}</button></div>
      <div class="setrow"><span>Grafik <small class="meta">(${game.renderer.kind === 'pixi' ? 'WebGL' : 'Canvas'})</small></span><span>${(['auto', 'hoch', 'mittel', 'niedrig'] as GraphicsSetting[]).map((k) => `<button data-gfx="${k}" aria-pressed="${save.graphics === k}">${{ auto: 'Auto', hoch: 'Hoch', mittel: 'Mittel', niedrig: 'Niedrig' }[k]}</button>`).join(' ')}</span></div>
      <div class="setrow"><span>Schwierigkeit</span><span>${(Object.keys(DIFF) as Difficulty[]).map((k) => `<button data-diff="${k}" aria-pressed="${save.difficulty === k}">${DIFF[k].label}</button>`).join(' ')}</span></div>
      <div class="setrow" style="display:block"><span>Spielstand-Code (zum Sichern oder Übertragen)</span><textarea id="sCode" spellcheck="false">${exportCode(save)}</textarea>
      <div class="actions"><button id="sImport">Code laden</button><button id="sReset">Fortschritt löschen</button></div></div>
      <div class="actions"><button data-go="menu">Zurück</button></div>`;
  } else if (kind === 'howto') {
    h = `<h2>Anleitung</h2>
      <ul><li><b>Senden:</b> Ziehe von einem eigenen Knoten über verbundene Knoten. Sofort geht die Hälfte der verfügbaren Einheiten los, und die Route bleibt bestehen: Der Knoten schickt danach laufend einen Teil seiner Produktion nach und wächst trotzdem weiter. Ziehe erneut, um sofort wieder die Hälfte zu schicken. Unten links (oder <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd>) wählst du 25 bis 100 %, <kbd>Shift</kbd> + Ziehen schickt alles.</li>
      <li><b>Routen:</b> Eine Route schickt laufend einen Teil der Produktion nach (in kleinen Paketen), der Knoten wächst trotzdem weiter; ein voller Knoten schickt alles. Bis zu drei Routen je Knoten teilen den Nachschub. <b>Löschen:</b> Quer über die Linie wischen, im Knotenmenü einzeln entfernen, oder Rechtsklick auf den Knoten für alle.</li>
      <li><b>Vorschau:</b> Beim Ziehen steht am Zeiger, wie viele Einheiten losgehen und ob sie die Verteidigung des Ziels schlagen (✓ oder ✗).</li>
      <li><b>Mehrfachauswahl:</b> Eigene Knoten antippen, um sie zu sammeln; Doppeltipp wählt alle eigenen. Ziehen von einem gewählten Knoten schickt von allen. Tipp ins Leere hebt die Auswahl auf.</li>
      <li><b>Knotenmenü:</b> Einen einzelnen eigenen Knoten antippen: Ausbau bis Stufe 3, Reserve, Umbau in eine andere Art, Routen verwalten.</li>
      <li><b>Kampf:</b> Angriffsstärke der Truppen gegen Einheiten × Verteidigung des Knotens. Bleibt etwas übrig, wechselt der Knoten die Seite.</li>
      <li><b>Truppen:</b> Jede Knotenart erzeugt eigene Truppen: Drohnen sind schnell und schwach, Panzer stark und langsam, Pfeile am schnellsten.</li>
      <li><b>Energie</b> entsteht, wenn Einheiten fallen. Damit zündest du Fähigkeiten (Tasten <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>).</li>
      <li><b>Tasten:</b> <kbd>Leertaste</kbd> Pause, <kbd>F</kbd> Tempo, <kbd>Esc</kbd> Abbrechen.</li></ul>
      <div class="actions"><button data-go="menu">Zurück</button></div>`;
  } else if (kind === 'intro') {
    h = `<h2>${L.name}</h2><p class="sub">${game.levelKind === 'campaign' ? `Kapitel ${L.ch + 1}: ${CHAPTERS[L.ch]?.name ?? ''}, Level ${game.levelIndex + 1} von ${CAMPAIGN.length}` : 'Endlos'} · ${L.enemies === 1 ? 'ein Gegner' : L.enemies + ' Gegner'} · Zielzeit ${fmtTime(L.par)}</p>`;
    if (game.levelKind === 'campaign' && game.levelIndex === 0)
      h += `<ul><li>Ziehe vom goldenen Knoten zu einem Nachbarn: Die Hälfte deiner Einheiten bricht sofort auf, und die Route bleibt – ein Teil des Nachwuchses fließt laufend weiter. Ziehe erneut, um sofort mehr zu schicken.</li><li>Fremde Knoten werden angegriffen; ist deine Stärke größer, gehören sie dir.</li><li>Nur gepunktete Linien sind Wege. Felsen trennen das Netz.</li></ul>`;
    else h += `<p>${L.text}</p>`;
    if (L.newType)
      h += `<div class="new"><div class="icon"></div><div><b>Neu: ${TYPES[L.newType].name}</b><span>${TYPES[L.newType].desc}</span></div></div>`;
    if (L.feature === 'upgrade')
      h += `<div class="new"><div class="icon" data-lv="3"></div><div><b>Neu: Ausbau</b><span>Tippe einen eigenen Knoten an und zahle Einheiten, um ihn auf Stufe 2 und 3 zu bringen: mehr Produktion, mehr Vorrat, mehr Verteidigung.</span></div></div>`;
    if (L.feature === 'split')
      h += `<div class="new"><div><b>Neu: Geteilte Routen und Reserve</b><span>Ziehe mehrere Routen von einem Knoten (bis zu drei); der Nachschub wird aufgeteilt. Ein voller Knoten schickt seine ganze Produktion weiter. Im Knotenmenü legst du eine Reserve fest, die zur Verteidigung bleibt und nie abfließt. Mit Shift + Ziehen schickst du sofort alles.</span></div></div>`;
    if (L.feature === 'convert')
      h += `<div class="new"><div><b>Neu: Umbau</b><span>Im Knotenmenü kannst du eine andere Knotenart wählen. Der Knoten fällt dabei auf Stufe 1 zurück.</span></div></div>`;
    h += `<div class="actions"><button class="primary" id="go">Level starten</button><button data-go="${game.levelKind === 'campaign' ? 'campaign' : 'menu'}">Zurück</button></div>`;
  } else if (kind === 'win') {
    const r = game.result ?? { stars: 1, gained: 0, bestTime: game.levelTime, newBest: false };
    h = `<h2>${r.newBest ? 'Neue Bestzeit!' : 'Der Abgrund leuchtet golden'}</h2><p class="sub">${L.name} geschafft</p>
      <div class="stats"><div><b class="stars">${starStr(r.stars)}</b>${r.stars === 3 ? 'unter Zielzeit' : r.stars === 2 ? 'nah an der Zielzeit' : 'geschafft'}</div><div><b>${fmtTime(game.levelTime)}</b>Zeit (Ziel ${fmtTime(L.par)})</div><div><b>${fmtTime(r.bestTime)}</b>${r.newBest ? 'neuer Rekord' : 'Bestzeit'}</div><div><b>${game.state.stats.captured}</b>erobert</div><div><b>+${r.gained}</b>Punkte</div></div>
      <div class="actions"><button class="primary" id="next">${game.levelKind === 'campaign' ? (game.levelIndex + 1 < CAMPAIGN.length ? 'Nächstes Level' : 'Kampagne geschafft – zur Übersicht') : 'Nächste Welle'}</button><button id="again">Nochmal</button>${save.points ? '<button data-go="skills">Fähigkeiten</button>' : ''}<button data-go="menu">Menü</button></div>`;
  } else if (kind === 'lose') {
    const winner = FACTIONS[game.state.nodes.find((n) => n.owner > 1)?.owner ?? 2] ?? FACTIONS[2];
    h = `<h2>Der Goldschwarm ist erloschen</h2><p class="sub">${L.name}</p>
      <p>Der <span class="swatch" style="background:${winner?.color ?? '#fff'}"></span>${winner?.name ?? ''} hat deinen letzten Knoten eingenommen. Tipp: Halte an der Front eine Reserve, bau Wächter an Kreuzungen und sammle Energie für einen Schild, wenn ein großer Schwarm anrückt.</p>
      <div class="actions"><button class="primary" id="again">Nochmal versuchen</button>${save.points ? '<button data-go="skills">Fähigkeiten</button>' : ''}<button data-go="${game.levelKind === 'campaign' ? 'campaign' : 'menu'}">Zurück</button></div>`;
  } else if (kind === 'pause') {
    h = `<h2>Pause</h2><p class="sub">${L.name}, ${fmtTime(game.levelTime)} gespielt</p><div class="actions"><button class="primary" id="go">Weiter</button><button id="again">Neu starten</button><button data-go="menu">Aufgeben</button></div>`;
  }
  card.innerHTML = h;
  if (kind === 'intro') {
    card
      .querySelectorAll<HTMLElement>('.icon')
      .forEach((e) => e.replaceWith(typeIcon(L.newType ?? 'nest', 56, +(e.dataset.lv ?? 1))));
  }
  card.querySelector('#go')?.addEventListener('click', () => act.resume());
  card.querySelector('#next')?.addEventListener('click', () => act.next());
  card.querySelectorAll('#again').forEach((b) => b.addEventListener('click', () => act.restart()));
  card.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) =>
    b.addEventListener('click', () => {
      game.audio.play('click');
      const g = b.dataset.go as ScreenKind | 'endless';
      if (g === 'endless') act.play('endless', Math.max(1, save.endlessBest + 1));
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
