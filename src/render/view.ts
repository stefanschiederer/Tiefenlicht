import { WORLD_H, WORLD_W } from '@/data';

/** Maps world coordinates (fixed 1600×800) to the screen: uniform fit-scale, centred. */
export class View {
  width = 0;
  height = 0;
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  /** UI scale for stroke widths, fonts, hit slop (≈ prototype's S). */
  S = 1;

  /** Screen margins reserved for HUD chrome (map is fitted into the remaining rect). */
  insets = { top: 0, bottom: 0, left: 0, right: 0 };

  resize(width: number, height: number, insets?: Partial<View['insets']>): void {
    this.width = width;
    this.height = height;
    if (insets) this.insets = { ...this.insets, ...insets };
    const aw = Math.max(1, width - this.insets.left - this.insets.right),
      ah = Math.max(1, height - this.insets.top - this.insets.bottom);
    this.scale = Math.min(aw / WORLD_W, ah / WORLD_H);
    this.offsetX = this.insets.left + (aw - WORLD_W * this.scale) / 2;
    this.offsetY = this.insets.top + (ah - WORLD_H * this.scale) / 2;
    this.S = Math.max(0.55, Math.min(1.3, Math.min(width, height) / 760));
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
