import { describe, expect, it } from 'vitest';
import { Rng } from '@/sim/rng';

describe('Rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = Rng.fromSeed(1234),
      b = Rng.fromSeed(1234);
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = Rng.fromSeed(1),
      b = Rng.fromSeed(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('coerces the seed to a 32-bit integer', () => {
    expect(new Rng(1.7).state).toBe(1);
    expect(new Rng(2 ** 32 + 5).state).toBe(5);
    expect(Rng.fromSeed(-3).state).toBe(-3);
  });

  it('next() stays in [0, 1)', () => {
    const r = Rng.fromSeed(99);
    for (let i = 0; i < 10000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('range(a, b) stays in [a, b) and int(n) in [0, n)', () => {
    const r = Rng.fromSeed(7);
    const ints = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const v = r.range(-3, 2.5);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThan(2.5);
      const k = r.int(6);
      expect(Number.isInteger(k)).toBe(true);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThan(6);
      ints.add(k);
    }
    // Every bucket is hit over 5000 draws.
    expect([...ints].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('shuffle is an in-place permutation and deterministic', () => {
    const src = Array.from({ length: 30 }, (_, i) => i);
    const a = Rng.fromSeed(42),
      b = Rng.fromSeed(42);
    const arrA = src.slice(),
      arrB = src.slice();
    expect(a.shuffle(arrA)).toBe(arrA);
    b.shuffle(arrB);
    expect(arrA).toEqual(arrB);
    expect([...arrA].sort((x, y) => x - y)).toEqual(src);
    expect(arrA).not.toEqual(src);
    // Different seed, different order.
    const arrC = Rng.fromSeed(43).shuffle(src.slice());
    expect(arrC).not.toEqual(arrA);
  });

  it('clone continues from the same state but is independent', () => {
    const a = Rng.fromSeed(5);
    a.next();
    a.next();
    const c = a.clone();
    expect(c).not.toBe(a);
    expect(c.state).toBe(a.state);
    const fromClone = [c.next(), c.next(), c.next()];
    const stateAfterClone = a.state;
    expect(a.state).toBe(stateAfterClone);
    const fromOrig = [a.next(), a.next(), a.next()];
    expect(fromOrig).toEqual(fromClone);
    // Advancing the original further does not move the clone.
    a.next();
    expect(c.state).not.toBe(a.state);
  });
});
