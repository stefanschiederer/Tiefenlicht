import { WORLD_H, WORLD_W } from '@/data';

/**
 * Maps world coordinates (fixed 1600×800) to the screen. The map is fitted into the screen minus HUD
 * insets; a camera (zoom + centre) lets the player zoom into the fitted view.
 */
export class View {
  width = 0;
  height = 0;
  /** Effective world→screen scale (fit scale × zoom). */
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  /** UI scale for stroke widths, fonts, hit slop (≈ prototype's S). */
  S = 1;
  /** Visual magnification of nodes and units on small screens (does not affect the simulation). */
  nodeScale = 1;
  /** Screen margins reserved for HUD chrome (map is fitted into the remaining rect). */
  insets = { top: 0, bottom: 0, left: 0, right: 0 };
  /** Camera: zoom multiplier over the fit scale and the world point shown at the rect centre. */
  zoom = 1;
  cx = WORLD_W / 2;
  cy = WORLD_H / 2;
  readonly minZoom = 1;
  readonly maxZoom = 3;
  private fit = 1;

  resize(width: number, height: number, insets?: Partial<View['insets']>): void {
    this.width = width;
    this.height = height;
    if (insets) this.insets = { ...this.insets, ...insets };
    const aw = Math.max(1, width - this.insets.left - this.insets.right),
      ah = Math.max(1, height - this.insets.top - this.insets.bottom);
    this.fit = Math.min(aw / WORLD_W, ah / WORLD_H);
    this.S = Math.max(0.55, Math.min(1.3, Math.min(width, height) / 760));
    // Phones show the whole 1600×800 world at ~0.4 scale; enlarge nodes so they stay readable and tappable.
    this.nodeScale = height < 500 ? 1.45 : width < 900 ? 1.2 : 1;
    this.apply();
  }

  /** Available rect (screen minus insets). */
  rect(): { x: number; y: number; w: number; h: number } {
    return {
      x: this.insets.left,
      y: this.insets.top,
      w: Math.max(1, this.width - this.insets.left - this.insets.right),
      h: Math.max(1, this.height - this.insets.top - this.insets.bottom),
    };
  }

  private apply(): void {
    const r = this.rect();
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
    this.scale = this.fit * this.zoom;
    // Clamp the centre so the world never leaves the rect when it is larger than the rect.
    const halfW = r.w / (2 * this.scale),
      halfH = r.h / (2 * this.scale);
    this.cx = WORLD_W * this.scale <= r.w ? WORLD_W / 2 : Math.max(halfW, Math.min(WORLD_W - halfW, this.cx));
    this.cy = WORLD_H * this.scale <= r.h ? WORLD_H / 2 : Math.max(halfH, Math.min(WORLD_H - halfH, this.cy));
    this.offsetX = r.x + r.w / 2 - this.cx * this.scale;
    this.offsetY = r.y + r.h / 2 - this.cy * this.scale;
  }

  /** Zooms by `factor` keeping the world point under screen (px, py) fixed. */
  zoomAt(px: number, py: number, factor: number): void {
    const wx = this.wx(px),
      wy = this.wy(py);
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
    this.scale = this.fit * this.zoom;
    const r = this.rect();
    // Choose the centre so that (wx, wy) stays at (px, py).
    this.cx = wx - (px - r.x - r.w / 2) / this.scale;
    this.cy = wy - (py - r.y - r.h / 2) / this.scale;
    this.apply();
  }
  /** Pans by a screen-space delta. */
  panBy(dx: number, dy: number): void {
    this.cx -= dx / this.scale;
    this.cy -= dy / this.scale;
    this.apply();
  }
  resetCamera(): void {
    this.zoom = 1;
    this.cx = WORLD_W / 2;
    this.cy = WORLD_H / 2;
    this.apply();
  }

  sx(x: number): number {
    return this.offsetX + x * this.scale;
  }
  sy(y: number): number {
    return this.offsetY + y * this.scale;
  }
  wx(px: number): number {
    return (px - this.offsetX) / this.scale;
  }
  wy(py: number): number {
    return (py - this.offsetY) / this.scale;
  }
}
