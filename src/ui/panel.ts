import { PLAYER, TYPES, UNITS, type NodeType } from '@/data';
import { clearRoutes, doConvert, doUpgrade } from '@/sim/actions';
import { capOf, convertCost, nodeRadius, routeLimit, upgradeCost, upgradePreview } from '@/sim/stats';
import { nodeIcon } from '@/render/pixi/textures';
import type { Game } from '@/app/game';
import { $ } from './dom';
import { buildLegend, tip } from './hud';
import { ICONS } from './icons';

const TAU = Math.PI * 2;
let panelConv = false;
let anchor: { id: number } | null = null;

/** Radial node menu around the selected node. Buttons sit on a ring; the info pill sits below. */
export function renderPanel(game: Game): void {
  const panel = $('#nodePanel');
  const n = game.selectedNode();
  if (!n || n.owner !== PLAYER || game.mode !== 'game' || game.demo) {
    panel.hidden = true;
    panel.innerHTML = '';
    panelConv = false;
    anchor = null;
    return;
  }
  const s = game.state;
  if (anchor?.id !== n.id) panelConv = false;
  anchor = { id: n.id };
  panel.hidden = false;
  const up = upgradeCost(s, n),
    cc = convertCost(s, n);
  const conv = s.def.types.filter((t) => t !== n.type);
  const btn = (
    cls: string,
    html: string,
    title: string,
    cost: number | null,
    disabled: boolean,
    extra = '',
  ) =>
    `<button class="rb ${cls} ${cost !== null ? 'cost' : ''}" ${cost !== null ? `data-cost="${cost}"` : ''} title="${title}" aria-label="${title}" ${disabled ? 'disabled' : ''} ${extra}>${html}</button>`;
  const items = panelConv
    ? conv.map((t) => ({
        cls: 'conv',
        html: `<span data-icon="${t}"></span>`,
        title: `Umbauen zu ${TYPES[t].name} (${cc})`,
        cost: null,
        disabled: n.units < cc,
        extra: `data-conv="${t}"`,
      }))
    : [
        {
          cls: 'up',
          html: ICONS.upgrade,
          title: n.level >= 3 ? 'Voll ausgebaut' : `Ausbauen (${up})`,
          cost: n.level >= 3 ? null : up,
          disabled: n.level >= 3 || n.units < up,
          extra: 'id="pUp"',
        },
        {
          cls: 'res',
          html: `<span style="font-size:11px;font-weight:600">${Math.round(n.reserve * 100)}%</span>`,
          title: `Reserve ${Math.round(n.reserve * 100)} % – bleibt als Verteidigung zurück`,
          cost: null,
          disabled: false,
          extra: 'id="pRes"',
        },
        {
          cls: 'cv',
          html: ICONS.convert,
          title: `Umbauen (${cc})`,
          cost: cc,
          disabled: !conv.length,
          extra: 'id="pConv"',
        },
        {
          cls: 'cl',
          html: ICONS.clear,
          title: 'Linien löschen',
          cost: null,
          disabled: !n.routes.length,
          extra: 'id="pClear"',
        },
      ];
  if (panelConv)
    items.push({
      cls: 'cv',
      html: ICONS.back,
      title: 'Zurück',
      cost: null,
      disabled: false,
      extra: 'id="pBack"',
    });
  panel.innerHTML =
    items.map((it) => btn(it.cls, it.html, it.title, it.cost, it.disabled, it.extra)).join('') +
    `<div class="info"><b>${TYPES[n.type].name}</b> · Stufe ${n.level} · ${Math.floor(n.units)}/${Math.floor(capOf(s, n))} ${UNITS[TYPES[n.type].unit].name}${` · Routen ${n.routes.length}/${routeLimit(n, s)}`}${n.level < 3 ? ` · Ausbau: ${upgradePreview(n)}` : ''}</div>`;
  panel
    .querySelectorAll<HTMLElement>('[data-icon]')
    .forEach((el) => el.replaceWith(nodeIcon(el.dataset.icon as NodeType, 1, '#ffc45a', 30)));
  positionPanel(game);
  panel.querySelector('#pUp')?.addEventListener('click', () => {
    if (game.act((st) => doUpgrade(st, n))) {
      tip(`${TYPES[n.type].name} auf Stufe ${n.level} ausgebaut.`, 2000);
      renderPanel(game);
    }
  });
  panel.querySelector('#pConv')?.addEventListener('click', () => {
    panelConv = true;
    game.audio.play('click');
    renderPanel(game);
  });
  panel.querySelector('#pBack')?.addEventListener('click', () => {
    panelConv = false;
    game.audio.play('click');
    renderPanel(game);
  });
  panel.querySelector('#pClear')?.addEventListener('click', () => {
    clearRoutes(n);
    game.audio.play('click');
    tip('Routen gelöscht.', 1500);
    renderPanel(game);
  });
  panel.querySelectorAll<HTMLButtonElement>('[data-conv]').forEach((b) =>
    b.addEventListener('click', () => {
      if (game.act((st) => doConvert(st, n, b.dataset.conv as NodeType))) {
        panelConv = false;
        tip(`Umgebaut zu ${TYPES[n.type].name}.`, 2000);
        buildLegend(game);
        renderPanel(game);
      }
    }),
  );
}

/** Places the ring buttons around the node's current screen position (called every frame). */
export function positionPanel(game: Game): void {
  const panel = $('#nodePanel');
  if (panel.hidden || !anchor) return;
  const n = game.state.nodes[anchor.id];
  if (!n) return;
  const v = game.renderer.view;
  const cx = v.sx(n.x),
    cy = v.sy(n.y),
    r = nodeRadius(n) * v.nodeScale * v.scale;
  const ring = Math.max(58, r + 40);
  const buttons = panel.querySelectorAll<HTMLElement>('.rb');
  const k = buttons.length;
  // Full circle starting top-left, clockwise; keep every button inside the viewport.
  const clampX = (x: number) => Math.max(26, Math.min(v.width - 26, x)),
    bottomLimit = v.height - (v.height < 500 ? 78 : 96),
    clampY = (y: number) => Math.max(v.insets.top + 26, Math.min(bottomLimit, y));
  buttons.forEach((b, i) => {
    const a = -Math.PI * 0.75 + (i * TAU) / Math.max(k, 1);
    b.style.left = `${clampX(cx + Math.cos(a) * ring)}px`;
    b.style.top = `${clampY(cy + Math.sin(a) * ring)}px`;
  });
  const info = panel.querySelector<HTMLElement>('.info');
  if (info) {
    const w = info.offsetWidth || 160;
    info.style.left = `${Math.max(w / 2 + 8, Math.min(v.width - w / 2 - 8, cx))}px`;
    const below = cy + ring + 12;
    info.style.top = `${below > bottomLimit - 10 ? cy - ring - 34 : below}px`;
  }
}

/** Refreshes the info pill and button states in place (no rebuild, so animations are not restarted). */
export function updatePanel(game: Game): void {
  const panel = $('#nodePanel');
  const n = game.selectedNode();
  if (panel.hidden || !n || !anchor || anchor.id !== n.id) {
    renderPanel(game);
    return;
  }
  const s = game.state;
  const info = panel.querySelector<HTMLElement>('.info');
  if (info)
    info.innerHTML = `<b>${TYPES[n.type].name}</b> · Stufe ${n.level} · ${Math.floor(n.units)}/${Math.floor(capOf(s, n))} ${UNITS[TYPES[n.type].unit].name}${` · Routen ${n.routes.length}/${routeLimit(n, s)}`}${n.level < 3 ? ` · Ausbau: ${upgradePreview(n)}` : ''}`;
  const up = panel.querySelector<HTMLButtonElement>('#pUp');
  if (up) up.disabled = n.level >= 3 || n.units < upgradeCost(s, n);
  const cl = panel.querySelector<HTMLButtonElement>('#pClear');
  if (cl) cl.disabled = !n.routes.length;
  const cc = convertCost(s, n);
  panel.querySelectorAll<HTMLButtonElement>('[data-conv]').forEach((b) => (b.disabled = n.units < cc));
}
