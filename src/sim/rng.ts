/** Seedable PRNG (mulberry32). Deterministic, cloneable, cheap. */
export class Rng {
  constructor(public state: number) {
    this.state |= 0;
  }
  static fromSeed(seed: number): Rng {
    return new Rng(seed);
  }
  /** Uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Uniform float in [a, b). */
  range(a: number, b: number): number {
    return a + this.next() * (b - a);
  }
  /** Integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
  /** In-place Fisher–Yates shuffle. */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const t = arr[i] as T;
      arr[i] = arr[j] as T;
      arr[j] = t;
    }
    return arr;
  }
  clone(): Rng {
    return new Rng(this.state);
  }
}
