import type { AbilityId } from '@/data';
import type { Game, SendMode } from './game';

export interface InputHooks {
  togglePause(): void;
  toggleSpeed(): void;
  onSendMode(): void;
}

/** Pointer and keyboard handling for the game canvas. */
export function bindInput(canvas: HTMLCanvasElement, game: Game, hooks: InputHooks): void {
  document.addEventListener(
    'pointerdown',
    () => {
      game.audio.init();
      game.audio.resume();
    },
    { passive: true },
  );
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button === 2) return;
    const r = game.pointerDown(e.clientX, e.clientY, e.shiftKey);
    if (r === 'drag' || r === 'cut') {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  });
  canvas.addEventListener('pointermove', (e) => game.pointerMove(e.clientX, e.clientY));
  canvas.addEventListener('pointerup', (e) => game.pointerUp(e.clientX, e.clientY));
  canvas.addEventListener('pointercancel', () => {
    game.ui.drag = null;
    game.ui.cut = null;
  });
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    game.clearRoutesAt(e.clientX, e.clientY);
  });
  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement | null)?.tagName === 'TEXTAREA') return;
    if (e.key === 'Escape') game.cancel();
    if (game.mode !== 'game') return;
    if (e.key === ' ' && game.running) {
      e.preventDefault();
      hooks.togglePause();
    }
    if (e.key.toLowerCase() === 'f') hooks.toggleSpeed();
    const km: Record<string, SendMode> = { q: 0.25, w: 0.5, e: 0.75, r: 1 };
    const m = km[e.key.toLowerCase()];
    if (m !== undefined) {
      game.setSendMode(m);
      hooks.onSendMode();
    }
    const ids: AbilityId[] = game.availableAbilities();
    const idx = ['1', '2', '3'].indexOf(e.key);
    const id = idx >= 0 ? ids[idx] : undefined;
    if (id && game.running && !game.paused) game.toggleAbility(id);
  });
}
