import { PLAYER, TYPES, UNITS, type NodeType } from '@/data';
import { clearRoutes, cycleReserve, doConvert, doUpgrade, removeRoute } from '@/sim/actions';
import { capOf, convertCost, nodeRadius, upgradeCost } from '@/sim/stats';
import type { SimNode } from '@/sim/state';
import type { Game } from '@/app/game';
import { $ } from './dom';
import { buildLegend, tip } from './hud';

let panelConv = false;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function renderPanel(game: Game): void {
  const panel = $('#nodePanel');
  const n = game.selectedNode();
  if (!n || n.owner !== PLAYER || game.mode !== 'game' || game.demo) {
    panel.hidden = true;
    panelConv = false;
    return;
  }
  const s = game.state,
    v = game.renderer.view;
  panel.hidden = false;
  const conv = s.def.types.filter((t) => t !== n.type);
  const up = upgradeCost(s, n),
    cc = convertCost(s, n);
  panel.innerHTML = `<h4>${TYPES[n.type].name} <span>Stufe ${n.level}</span></h4>
    <div class="m">${Math.floor(n.units)} / ${Math.floor(capOf(s, n))} Einheiten, erzeugt ${UNITS[TYPES[n.type].unit].name}</div>
    <div class="row"><button id="pUp" ${n.level >= 3 || n.units < up ? 'disabled' : ''}>${n.level >= 3 ? 'Voll ausgebaut' : `Ausbauen (${up})`}</button><button id="pRes" title="Diese Menge bleibt als Verteidigung zurück">Reserve ${Math.round(n.reserve * 100)} %</button></div>
    <div class="row"><button id="pConv" aria-pressed="${panelConv}" ${conv.length ? '' : 'disabled'}>Umbauen (${cc})</button><button id="pClear" ${n.routes.length ? '' : 'disabled'}>Routen löschen</button></div>
    ${panelConv ? `<div class="conv">${conv.map((t) => `<button data-conv="${t}" ${n.units < cc ? 'disabled' : ''} title="${TYPES[t].desc}">${TYPES[t].name}</button>`).join('')}</div>` : ''}
    <div class="routes">${n.routes
      .map((r, i) => {
        const target = s.nodes[r[r.length - 1] as number] as SimNode;
        return `<div><span>Route ${i + 1}: ${TYPES[target.type].name}, ${r.length} ${r.length === 1 ? 'Schritt' : 'Schritte'}</span><button data-rm="${i}" title="Route entfernen">×</button></div>`;
      })
      .join('')}</div>`;
  const px = v.sx(n.x),
    py = v.sy(n.y),
    r = nodeRadius(n) * v.scale;
  panel.style.left = clamp(px + r + 14, 8, v.width - 244) + 'px';
  panel.style.top = clamp(py - 40, 60, v.height - 250) + 'px';
  $('#pUp').addEventListener('click', () => {
    if (game.act((st) => doUpgrade(st, n))) {
      tip(`${TYPES[n.type].name} auf Stufe ${n.level} ausgebaut.`, 2000);
      renderPanel(game);
    }
  });
  $('#pRes').addEventListener('click', () => {
    cycleReserve(n);
    game.audio.play('click');
    renderPanel(game);
  });
  $('#pConv').addEventListener('click', () => {
    panelConv = !panelConv;
    game.audio.play('click');
    renderPanel(game);
  });
  $('#pClear').addEventListener('click', () => {
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
  panel.querySelectorAll<HTMLButtonElement>('[data-rm]').forEach((b) =>
    b.addEventListener('click', () => {
      removeRoute(n, +(b.dataset.rm ?? 0));
      game.audio.play('click');
      renderPanel(game);
    }),
  );
}
