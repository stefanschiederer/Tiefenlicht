import { WORLD_H, WORLD_W } from '@/game/config';

/**
 * Maps the portrait world onto the screen. In landscape the world is rotated a quarter turn
 * clockwise, so the player's side (bottom of the world) ends up on the left.
 */
export class View {
  w = 1;
  h = 1;
  k = 1;
  ox = 0;
  oy = 0;
  rot = false;
  /** Screen space reserved for the HUD at the top. */
  top = 70;

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.rot = w > h * 1.05;
    this.top = this.rot ? 56 : 76;
    const fw = this.rot ? WORLD_H : WORLD_W,
      fh = this.rot ? WORLD_W : WORLD_H;
    const pad = 6;
    const availW = w - 2 * pad,
      availH = h - this.top - pad;
    this.k = Math.min(availW / fw, availH / fh);
    this.ox = (w - fw * this.k) / 2;
    this.oy = this.top + (availH - fh * this.k) / 2;
  }

  sx(x: number, y: number): number {
    return this.rot ? this.ox + (WORLD_H - y) * this.k : this.ox + x * this.k;
  }
  sy(x: number, y: number): number {
    return this.rot ? this.oy + x * this.k : this.oy + y * this.k;
  }
  toWorld(px: number, py: number): { x: number; y: number } {
    return this.rot
      ? { x: (py - this.oy) / this.k, y: WORLD_H - (px - this.ox) / this.k }
      : { x: (px - this.ox) / this.k, y: (py - this.oy) / this.k };
  }
  /** Screen area of the playfield background: all of the screen below the HUD, with a small margin. */
  playArea(): { x: number; y: number; w: number; h: number } {
    const f = this.field();
    const x = Math.min(f.x, 8),
      y = Math.min(f.y, this.top - 4),
      r = Math.max(f.x + f.w, this.w - 8),
      b = Math.max(f.y + f.h, this.h - 8);
    return { x, y, w: r - x, h: b - y };
  }
  /** Screen rectangle of the playfield. */
  field(): { x: number; y: number; w: number; h: number } {
    const fw = (this.rot ? WORLD_H : WORLD_W) * this.k,
      fh = (this.rot ? WORLD_W : WORLD_H) * this.k;
    return { x: this.ox, y: this.oy, w: fw, h: fh };
  }
}
