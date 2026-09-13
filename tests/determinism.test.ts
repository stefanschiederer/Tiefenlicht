import { describe, expect, it } from 'vitest';
import { CAMPAIGN, type LevelDef } from '@/data';
import { buildLevel, type BuildOptions } from '@/sim/level';
import { step } from '@/sim/update';

const DEF = CAMPAIGN[5] as LevelDef;
const STEPS = 3000;

function simulate(opts: BuildOptions) {
  const s = buildLevel(DEF, opts);
  let launches = 0;
  for (let i = 0; i < STEPS; i++) {
    step(s, 1 / 60);
    launches += s.events.filter((e) => e.type === 'launch').length;
    s.events = [];
  }
  return { s, launches };
}

describe('simulation determinism', () => {
  it('two identical runs of a campaign level agree exactly', () => {
    const a = simulate({}),
      b = simulate({});
    expect(a.launches).toBeGreaterThan(0);
    expect(JSON.stringify(a.s.nodes)).toBe(JSON.stringify(b.s.nodes));
    expect(JSON.stringify(a.s.groups)).toBe(JSON.stringify(b.s.groups));
    expect(a.s.rng.state).toBe(b.s.rng.state);
    expect(a.s.over).toBe(b.s.over);
    expect(a.s.time).toBeCloseTo(b.s.time, 12);
  });

  it('two identical demo runs agree exactly', () => {
    const a = simulate({ demo: true }),
      b = simulate({ demo: true });
    expect(a.s.demo).toBe(true);
    expect(a.launches).toBeGreaterThan(0);
    expect(JSON.stringify(a.s.nodes)).toBe(JSON.stringify(b.s.nodes));
    expect(JSON.stringify(a.s.groups)).toBe(JSON.stringify(b.s.groups));
    expect(a.s.rng.state).toBe(b.s.rng.state);
    // The demo never finishes on its own.
    expect(a.s.over).toBeNull();
    expect(a.s.energy).toBe(0);
  });

  it('a fresh build is identical every time', () => {
    const a = buildLevel(DEF),
      b = buildLevel(DEF);
    expect(JSON.stringify(a.nodes)).toBe(JSON.stringify(b.nodes));
    expect(a.edges).toEqual(b.edges);
    expect(a.aiTimers).toEqual(b.aiTimers);
  });
});
