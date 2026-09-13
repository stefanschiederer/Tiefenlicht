import { describe, expect, it } from 'vitest';
import { SKILLS, computePerks, emptyPerks } from '@/data';

describe('computePerks', () => {
  it('returns empty perks with only the basic ability for nothing spent', () => {
    expect(computePerks([])).toEqual(emptyPerks());
    expect(computePerks([]).abilities).toEqual(['stoss']);
  });

  it('sums numeric effects across skills', () => {
    const p = computePerks(['prod1', 'prod2', 'cap', 'str1', 'str2', 'def', 'stream1']);
    expect(p.prod).toBeCloseTo(0.2);
    expect(p.cap).toBeCloseTo(0.2);
    expect(p.str).toBeCloseTo(0.2);
    expect(p.def).toBeCloseTo(0.15);
    expect(p.stream).toBeCloseTo(0.25);
    expect(p.start).toBe(0);
    expect(p.speed).toBe(0);
  });

  it('ignores unknown ids', () => {
    expect(computePerks(['nope', '', 'PROD1'])).toEqual(emptyPerks());
    expect(computePerks(['nope', 'speed']).speed).toBeCloseTo(0.15);
  });

  it('always includes stoss and adds frost with ab2 and schild with ab3', () => {
    expect(computePerks(['prod1']).abilities).toEqual(['stoss']);
    expect(computePerks(['ab2']).abilities).toEqual(['stoss', 'frost']);
    expect(computePerks(['ab3']).abilities).toEqual(['stoss', 'schild']);
    expect(computePerks(['ab3', 'ab2']).abilities).toEqual(['stoss', 'schild', 'frost']);
  });

  it('does not duplicate abilities', () => {
    expect(computePerks(['ab2', 'ab2']).abilities).toEqual(['stoss', 'frost']);
  });

  it('applies every skill in the tree', () => {
    const p = computePerks(SKILLS.map((s) => s.id));
    expect(p.prod).toBeCloseTo(0.35);
    expect(p.cap).toBeCloseTo(0.2);
    expect(p.start).toBe(8);
    expect(p.startLevel).toBe(1);
    expect(p.speed).toBeCloseTo(0.15);
    expect(p.stream).toBeCloseTo(0.5);
    expect(p.str).toBeCloseTo(0.2);
    expect(p.routes).toBe(1);
    expect(p.def).toBeCloseTo(0.3);
    expect(p.cheap).toBeCloseTo(0.25);
    expect(p.range).toBeCloseTo(0.25);
    expect(p.energy).toBeCloseTo(0.5);
    expect(p.abcost).toBeCloseTo(0.2);
    expect(p.energyRegen).toBeCloseTo(0.6);
    expect(p.abilities).toEqual(['stoss', 'frost', 'schild']);
    expect(SKILLS).toHaveLength(32);
    expect(SKILLS.reduce((a, s) => a + s.cost, 0)).toBeGreaterThanOrEqual(60);
    // every prerequisite exists and sits in the same branch
    for (const sk of SKILLS) {
      if (!sk.req) continue;
      const req = SKILLS.find((x) => x.id === sk.req);
      expect(req?.branch).toBe(sk.branch);
    }
  });
});
