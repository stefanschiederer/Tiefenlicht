import type { GameState, SimEvent, SimNode } from '@/sim/state';
import type { View } from './view';
import type { UiState } from './canvas2d/renderer';

export type { UiState };
export type GraphicsQuality = 'niedrig' | 'mittel' | 'hoch';

/** What the app needs from a renderer; Canvas 2D and PixiJS implement it. */
export interface Renderer {
  readonly view: View;
  readonly kind: 'canvas' | 'pixi';
  resize(width: number, height: number, insets?: Partial<View['insets']>): void;
  setLevel(state: GameState): void;
  nodeAt(state: GameState, px: number, py: number): SimNode | null;
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
  return new CanvasRenderer(canvas);
}
