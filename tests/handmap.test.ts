import { describe, expect, it } from 'vitest';
import { CAMPAIGN, MAP_WACHTPOSTEN, type LevelDef } from '@/data';
import { buildLevel } from '@/sim/level';
import { step } from '@/sim/update';
import { makeState, node } from './helpers';

describe('hand-made maps', () => {
  it('builds level 1 from its hand map with the declared nodes, edges, owners and units', () => {
    const def = CAMPAIGN[0] as LevelDef;
    const s = buildLevel(def);
    expect(def.map).toBeDefined();
    expect(s.nodes).toHaveLength(def.map?.nodes.length ?? 0);
    expect(s.edges).toEqual(def.map?.edges);
    expect(s.nodes.filter((n) => n.owner === 1)).toHaveLength(1);
    expect(s.nodes.filter((n) => n.owner === 2)).toHaveLength(1);
    expect(node(s, 0).units).toBe(14);
    expect(node(s, 3).units).toBe(6);
    expect(s.rocks.length).toBe(def.map?.rocks?.length ?? 0);
  });

  it('keeps explicit node types and places hand-made barriers', () => {
    const def = CAMPAIGN[6] as LevelDef;
    const s = buildLevel(def);
    expect(node(s, 3).type).toBe('waechter');
    expect(node(s, 5).type).toBe('bastion');
    expect(s.barriers.length).toBe((MAP_WACHTPOSTEN.barriers?.length ?? 0) + (def.barriers ?? 0));
    expect(node(s, 9).owner).toBe(2);
    expect(node(s, 10).owner).toBe(3);
  });

  it('is deterministic', () => {
    const a = buildLevel(CAMPAIGN[6] as LevelDef),
      b = buildLevel(CAMPAIGN[6] as LevelDef);
    expect(JSON.stringify(a.nodes)).toBe(JSON.stringify(b.nodes));
  });
});

describe('hold objective', () => {
  it('wins once the node has been held continuously for the required seconds', () => {
    const s = makeState(
      [
        { x: 0, y: 0, owner: 1, units: 40 },
        { x: 200, y: 0, owner: 1, units: 5 },
        { x: 400, y: 0, owner: 2, units: 40 },
      ],
      [
        [0, 1],
        [1, 2],
      ],
      { aiTimers: { 2: 9999 }, def: { objective: { type: 'hold', node: 1, seconds: 3, label: 'test' } } },
    );
    s.objectiveNode = 1;
    for (let t = 0; t < 2.5; t += 1 / 60) step(s, 1 / 60);
    expect(s.over).toBeNull();
    node(s, 1).owner = 0;
    step(s, 1 / 60);
    expect(s.objectiveT).toBe(0);
    node(s, 1).owner = 1;
    for (let t = 0; t < 3.2; t += 1 / 60) step(s, 1 / 60);
    expect(s.over).toBe('won');
  });
});
