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

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.scale = Math.min(width / WORLD_W, height / WORLD_H);
    this.offsetX = (width - WORLD_W * this.scale) / 2;
    this.offsetY = (height - WORLD_H * this.scale) / 2;
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
