import { ABILITIES, ALL_TYPES, CHAPTERS, FACTIONS, PLAYER, TYPES, UNITS, type AbilityId } from '@/data';
import { typeIcon } from '@/render/canvas2d/shapes';
import { SEND_MODES, type Game } from '@/app/game';
import { $ } from './dom';
import { ICONS, icon } from './icons';

let tipTimer: ReturnType<typeof setTimeout> | undefined;
export function tip(text: string, ms = 4000): void {
  const e = $('#tip');
  e.textContent = text;
  e.classList.add('on');
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => e.classList.remove('on'), ms);
}

const ABILITY_ICON: Record<AbilityId, keyof typeof ICONS> = {
  stoss: 'stoss',
  frost: 'frost',
  schild: 'schild',
};

/** One-time setup of the static HUD buttons (icons). */
export function initHud(): void {
  $('#legendBtn').innerHTML = ICONS.legend;
  $('#speedBtn').innerHTML = ICONS.speed;
  $('#pauseBtn').innerHTML = ICONS.pause;
  $('#fsBtn').innerHTML = ICONS.fullscreen;
  for (const id of ['legendBtn', 'speedBtn', 'pauseBtn', 'fsBtn']) $('#' + id).classList.add('iconbtn');
}

export function updateHud(game: Game): void {
  if (game.mode !== 'game') return;
  const L = game.def,
    s = game.state;
  $('#levelLabel').textContent =
    game.levelKind === 'campaign'
      ? `${CHAPTERS[L.ch]?.name ?? ''}, Level ${game.levelIndex + 1}: ${L.name}`
      : `Endlos, ${L.name}`;
  const counts = FACTIONS.map((_, i) => s.nodes.filter((n) => n.owner === i).length);
  const order = [1, 2, 3, 4, 0].filter((i) => (counts[i] ?? 0) > 0);
  $('#share').innerHTML = order
    .map(
      (i) =>
        `<i style="width:${((counts[i] ?? 0) / s.nodes.length) * 100}%;background:${FACTIONS[i]?.color ?? '#fff'}" title="${FACTIONS[i]?.name ?? ''}: ${counts[i] ?? 0}"></i>`,
    )
    .join('');
  $('#energyVal').textContent = String(Math.floor(s.energy));
  $('#energyBar').style.width = s.energy + '%';
  for (const b of document.querySelectorAll<HTMLButtonElement>('#abilities button')) {
    const id = b.dataset.ab as AbilityId;
    b.disabled = s.energy < game.abilityCost(id);
    b.setAttribute('aria-pressed', String(game.ui.abilityMode === id));
  }
}

export function renderAbilities(game: Game): void {
  const box = $('#abilities');
  box.innerHTML = '';
  if (game.mode !== 'game' || game.demo) return;
  let i = 1;
  for (const id of game.availableAbilities()) {
    const A = ABILITIES[id],
      b = document.createElement('button');
    b.dataset.ab = id;
    b.title = `${A.name}: ${A.desc} (Taste ${i})`;
    b.setAttribute('aria-label', A.name);
    b.innerHTML = `<b>${ICONS[ABILITY_ICON[id]]}</b>${A.name}<small>${game.abilityCost(id)} Energie</small>`;
    b.addEventListener('click', () => game.toggleAbility(id));
    box.appendChild(b);
    i++;
  }
}

export function renderSendbar(game: Game): void {
  const bar = $('#sendbar');
  bar.querySelectorAll('button').forEach((b) => b.remove());
  for (const [m, label] of SEND_MODES) {
    const b = document.createElement('button');
    b.textContent = label;
    b.setAttribute('aria-pressed', String(game.sendMode === m));
    b.title = `Ziehen schickt sofort ${label === 'Alle' ? 'alle' : label} der verfügbaren Einheiten und legt die Route an`;
    b.addEventListener('click', () => {
      game.setSendMode(m);
      game.audio.play('click');
      renderSendbar(game);
    });
    bar.appendChild(b);
  }
}

export function buildLegend(game: Game): void {
  const box = $('#legend');
  box.innerHTML = '';
  for (const t of ALL_TYPES.filter((t) => game.state.nodes.some((n) => n.type === t))) {
    const row = document.createElement('div');
    row.className = 'lg';
    row.appendChild(typeIcon(t, 40, 1, FACTIONS[PLAYER]?.color));
    const txt = document.createElement('div');
    const u = UNITS[TYPES[t].unit];
    txt.innerHTML = `<b>${TYPES[t].name}</b><span>${TYPES[t].desc} Truppen: ${u.name} (Stärke ${u.str}, Tempo ${u.speed}).</span>`;
    row.appendChild(txt);
    box.appendChild(row);
  }
}

export function setSpeedButton(speed: number): void {
  const b = $('#speedBtn');
  b.innerHTML = ICONS.speed + (speed === 2 ? '<span style="font-size:11px">2×</span>' : '');
  b.setAttribute('aria-pressed', String(speed === 2));
  b.setAttribute('aria-label', `Tempo ${speed}×`);
}

export function setGameUi(on: boolean): void {
  $('#hud').hidden = !on;
  $('#abilities').hidden = !on;
  $('#sendbar').hidden = !on;
  if (!on) {
    $('#nodePanel').hidden = true;
    $('#legend').hidden = true;
    $('#legendBtn').setAttribute('aria-pressed', 'false');
  }
}

export { icon };
