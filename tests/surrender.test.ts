import { describe, expect, it } from 'vitest';
import { SURRENDER_SECONDS } from '@/data';
import { drainEvents, step } from '@/sim/update';
import { makeState } from './helpers';

const DT = 1 / 60;

describe('surrender (mop-up rule)', () => {
  it('a beaten AI with one node gives up after the grace period when the player dominates', () => {
    // 5 nodes: player holds 4 (80 %), AI faction 2 holds 1.
    const s = makeState(
      [
        { x: 100, y: 300, owner: 1, units: 20 },
        { x: 250, y: 300, owner: 1, units: 20 },
        { x: 400, y: 300, owner: 1, units: 20 },
        { x: 550, y: 300, owner: 1, units: 20 },
        { x: 700, y: 300, owner: 2, units: 20 },
      ],
      [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
      ],
      { aiTimers: { 2: 9999 } },
    );
    for (let t = 0; t < SURRENDER_SECONDS - 0.5; t += DT) step(s, DT);
    expect(s.nodes[4]?.owner).toBe(2);
    expect(s.over).toBeNull();
    for (let t = 0; t < 1; t += DT) step(s, DT);
    expect(s.nodes[4]?.owner).toBe(0);
    const ev = drainEvents(s);
    expect(ev.some((e) => e.type === 'surrender' && e.faction === 2)).toBe(true);
    expect(s.over).toBe('won');
  });

  it('does not trigger while the player holds less than the required share', () => {
    const s = makeState(
      [
        { x: 100, y: 300, owner: 1, units: 20 },
        { x: 250, y: 300, owner: 0, units: 5 },
        { x: 400, y: 300, owner: 2, units: 20 },
      ],
      [
        [0, 1],
        [1, 2],
      ],
      { aiTimers: { 2: 9999 } },
    );
    for (let t = 0; t < SURRENDER_SECONDS + 2; t += DT) step(s, DT);
    expect(s.nodes[2]?.owner).toBe(2);
    expect(s.over).toBeNull();
  });

  it('resets the timer when the AI regains a second node', () => {
    const s = makeState(
      [
        { x: 100, y: 300, owner: 1, units: 20 },
        { x: 250, y: 300, owner: 1, units: 20 },
        { x: 400, y: 300, owner: 1, units: 20 },
        { x: 550, y: 300, owner: 0, units: 1 },
        { x: 700, y: 300, owner: 2, units: 20 },
      ],
      [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
      ],
      { aiTimers: { 2: 9999 } },
    );
    for (let t = 0; t < SURRENDER_SECONDS / 2; t += DT) step(s, DT);
    expect(s.surrenderT[2]).toBeGreaterThan(SURRENDER_SECONDS / 2 - 0.1);
    (s.nodes[3] as { owner: number }).owner = 2;
    step(s, DT);
    expect(s.surrenderT[2]).toBe(0);
  });
});
