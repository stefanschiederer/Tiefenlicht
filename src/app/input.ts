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
  // Active touch points for pinch-zoom / two-finger pan.
  const touches = new Map<number, { x: number; y: number }>();
  let pinch: { dist: number; cx: number; cy: number } | null = null;
  let panButton = false;
  const pinchState = () => {
    const pts = [...touches.values()];
    if (pts.length < 2) return null;
    const a = pts[0] as { x: number; y: number },
      b = pts[1] as { x: number; y: number };
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        game.cancelGesture();
        pinch = pinchState();
        return;
      }
      if (touches.size > 2) return;
    }
    if (e.button === 2) return;
    if (e.button === 1) {
      panButton = true;
      e.preventDefault();
      return;
    }
    const r = game.pointerDown(e.clientX, e.clientY, e.shiftKey);
    if (r === 'drag' || r === 'cut') {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const ps = pinchState();
      if (ps && pinch) {
        if (pinch.dist > 0) game.zoomAt(ps.cx, ps.cy, ps.dist / pinch.dist);
        game.panBy(ps.cx - pinch.cx, ps.cy - pinch.cy);
        pinch = ps;
        return;
      }
    }
    if (panButton) {
      game.panBy(e.movementX, e.movementY);
      return;
    }
    game.pointerMove(e.clientX, e.clientY);
  });
  const endTouch = (e: PointerEvent) => {
    if (e.pointerType === 'touch') {
      touches.delete(e.pointerId);
      if (touches.size < 2) pinch = null;
    }
    if (e.button === 1) panButton = false;
  };
  canvas.addEventListener('pointerup', (e) => {
    const wasPinch = pinch !== null;
    endTouch(e);
    if (!wasPinch) game.pointerUp(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointercancel', (e) => {
    endTouch(e);
    game.cancelGesture();
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      game.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false },
  );
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (game.mode === 'editor') {
      game.pointerDown(e.clientX, e.clientY, true);
      game.pointerUp(e.clientX, e.clientY);
      return;
    }
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
