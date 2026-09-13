import type { GameState, SimEvent } from '@/sim/state';
import type { View } from './view';
import type { UiState } from './canvas2d/renderer';

export type { UiState };
export type GraphicsQuality = 'niedrig' | 'mittel' | 'hoch';

/** What the app needs from a renderer; Canvas 2D and PixiJS implement it. */
export interface Renderer {
  readonly view: View;
  readonly kind: 'canvas' | 'pixi';
  /** The canvas actually used (the fallback may replace a WebGL-bound canvas). */
  readonly canvas: HTMLCanvasElement;
  resize(width: number, height: number, insets?: Partial<View['insets']>): void;
  setLevel(state: GameState): void;
  onEvent(e: SimEvent, state: GameState): void;
  render(state: GameState, ui: UiState, dt: number): void;
  /** Current quality; renderers may lower it at runtime when frames are too slow. */
  readonly quality: GraphicsQuality;
  setQuality?(q: GraphicsQuality): void;
  destroy(): void;
}

/** Picks the renderer for a quality setting; falls back to Canvas 2D when WebGL is unavailable. */
export async function createRenderer(canvas: HTMLCanvasElement, quality: GraphicsQuality): Promise<Renderer> {
  if (quality !== 'niedrig') {
    try {
      const { PixiRenderer } = await import('./pixi/PixiRenderer');
      return await PixiRenderer.create(canvas, quality);
    } catch (err) {
      console.warn('PixiJS renderer unavailable, falling back to Canvas 2D', err);
    }
  }
  const { CanvasRenderer } = await import('./canvas2d/renderer');
  // A canvas that already holds a WebGL context cannot provide a 2D context: swap in a fresh one.
  let target = canvas;
  if (!canvas.getContext('2d')) {
    target = canvas.cloneNode(false) as HTMLCanvasElement;
    canvas.replaceWith(target);
  }
  return new CanvasRenderer(target);
}
