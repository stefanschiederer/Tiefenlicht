import { PLAYER } from '@/data';
import type { SimNode } from '@/sim/state';
import type { Game } from './game';

/**
 * Guided hints for the first campaign level: an animated arrow from the player's node to a neighbour
 * until the first send, then a hint on the first captured node to open its menu / upgrade.
 */
export class Tutorial {
  private root: HTMLElement;
  private step: 0 | 1 | 2 | 3 = 0;
  private timer = 0;

  constructor(private game: Game) {
    this.root = document.getElementById('tutorial') as HTMLElement;
  }

  private active(): boolean {
    const g = this.game;
    return (
      g.mode === 'game' &&
      g.levelKind === 'campaign' &&
      g.levelIndex === 0 &&
      g.running &&
      !g.paused &&
      g.save.stats.wins === 0
    );
  }

  /** Called every frame. */
  update(dt: number): void {
    if (!this.active()) {
      this.root.innerHTML = '';
      return;
    }
    const g = this.game,
      s = g.state,
      v = g.renderer.view;
    const me = s.nodes.find((n) => n.owner === PLAYER);
    if (!me) return;
    if (this.step === 0) {
      if (s.stats.sends > 0) {
        this.step = 1;
        this.timer = 0;
      } else {
        const nb = (s.adj[me.id] ?? [])
          .map((j) => s.nodes[j] as SimNode)
          .sort((a, b) => a.units - b.units)[0];
        if (nb) this.draw(v.sx(me.x), v.sy(me.y), v.sx(nb.x), v.sy(nb.y), 'Ziehe eine Linie hierher');
        return;
      }
    }
    if (this.step === 1) {
      this.timer += dt;
      const mine = s.nodes.filter((n) => n.owner === PLAYER);
      if (mine.length >= 2 || this.timer > 25) {
        this.step = 2;
        this.timer = 0;
      } else {
        this.root.innerHTML = '';
        return;
      }
    }
    if (this.step === 2) {
      this.timer += dt;
      const upgraded = s.nodes.some((n) => n.owner === PLAYER && n.level > 1);
      if (upgraded || g.ui.selected.length > 0 || this.timer > 20) {
        this.step = 3;
        this.root.innerHTML = '';
        return;
      }
      const rich = s.nodes.filter((n) => n.owner === PLAYER).sort((a, b) => b.units - a.units)[0];
      if (rich && rich.units >= 20)
        this.point(v.sx(rich.x), v.sy(rich.y), 'Antippen: Ausbau für 20 Einheiten');
      else this.root.innerHTML = '';
      return;
    }
    this.root.innerHTML = '';
  }

  private draw(x1: number, y1: number, x2: number, y2: number, text: string): void {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const pad = 30;
    const ax = x1 + Math.cos(ang) * pad,
      ay = y1 + Math.sin(ang) * pad,
      bx = x2 - Math.cos(ang) * pad,
      by = y2 - Math.sin(ang) * pad;
    const hx = bx - Math.cos(ang) * 14,
      hy = by - Math.sin(ang) * 14;
    const head = `M${bx},${by} L${hx + Math.cos(ang + Math.PI / 2) * 8},${hy + Math.sin(ang + Math.PI / 2) * 8} L${hx + Math.cos(ang - Math.PI / 2) * 8},${hy + Math.sin(ang - Math.PI / 2) * 8} Z`;
    this.root.innerHTML = `<svg class="arrow"><path d="M${ax},${ay} L${hx},${hy}"/><path class="head" d="${head}"/></svg><div class="label" style="left:${(x1 + x2) / 2}px;top:${(y1 + y2) / 2 - 16}px">${text}</div>`;
  }
  private point(x: number, y: number, text: string): void {
    this.root.innerHTML = `<div class="label" style="left:${x}px;top:${y - 40}px">${text}</div>`;
  }
}
