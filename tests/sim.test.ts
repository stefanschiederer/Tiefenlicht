import { describe, expect, it } from 'vitest';
import { NEUTRAL, PLAYER, SEND_INTERVAL } from '@/game/config';
import {
  addLine,
  checkLine,
  createGame,
  cutLines,
  drainEvents,
  isMax,
  levelOf,
  lineCost,
  lineLimit,
  linesFrom,
  step,
  troopPos,
  wallOnLine,
} from '@/game/sim';
import type { GameState, LevelDef } from '@/game/state';

const DT = 1 / 60;
function def(towers: LevelDef['towers'], walls: LevelDef['walls'] = []): LevelDef {
  return { n: 99, towers, walls, aiInterval: 2, aiDelay: 0 };
}
function run(s: GameState, seconds: number): void {
  for (let i = 0; i < Math.round(seconds / DT); i++) step(s, DT);
}
const T = (x: number, y: number, owner: number, troops: number) => ({ x, y, owner, troops });

describe('towers', () => {
  it('owned towers grow, neutral towers do not', () => {
    const s = createGame(def([T(100, 1000, PLAYER, 5), T(600, 1000, NEUTRAL, 5), T(360, 200, 2, 5)]));
    run(s, 3);
    expect(s.towers[0]?.troops).toBe(8);
    expect(s.towers[1]?.troops).toBe(5);
    expect(s.towers[2]?.troops).toBe(8);
  });

  it('levels up at 10 and 25 troops and holds 1, 2, 3 lines', () => {
    const s = createGame(def([T(100, 1000, PLAYER, 9)]));
    const t = s.towers[0]!;
    expect([levelOf(t), lineLimit(t)]).toEqual([1, 1]);
    t.troops = 10;
    expect([levelOf(t), lineLimit(t)]).toEqual([2, 2]);
    t.troops = 25;
    expect([levelOf(t), lineLimit(t)]).toEqual([3, 3]);
  });
});

describe('lines', () => {
  const base = () =>
    createGame(
      def([
        T(360, 1100, PLAYER, 30),
        T(120, 700, NEUTRAL, 5),
        T(600, 700, NEUTRAL, 5),
        T(360, 300, 2, 5),
        T(360, 700, NEUTRAL, 5),
      ]),
    );

  it('only the owner can draw, and only as many lines as the level allows', () => {
    const s = base();
    expect(addLine(s, 1, 0, PLAYER)).toBe('not-owner');
    s.towers[0]!.troops = 5;
    expect(addLine(s, 0, 1, PLAYER)).toBe('ok');
    expect(addLine(s, 0, 2, PLAYER)).toBe('full');
    expect(addLine(s, 0, 1, PLAYER)).toBe('exists');
  });

  it('a line cannot pass through another tower, but through a wall that troops knock down', () => {
    const s = base();
    // tower 4 (360,700) sits between 0 and 3
    expect(checkLine(s, 0, 3, PLAYER)).toBe('blocked');
    const w = createGame(
      def(
        [T(100, 1000, PLAYER, 30), T(600, 1000, NEUTRAL, 5), T(360, 100, 2, 1)],
        [{ x1: 350, y1: 900, x2: 350, y2: 1100, hp: 6 }],
      ),
    );
    expect(checkLine(w, 0, 1, PLAYER)).toBe('ok');
    expect(wallOnLine(w, 0, 1)?.wall.hp).toBe(6);
    addLine(w, 0, 1, PLAYER);
    run(w, 3);
    // troops stop at the wall and wear it down; the neutral tower is untouched so far
    expect(w.towers[1]!.troops).toBe(5);
    const ev = drainEvents(w);
    expect(ev.some((e) => e.type === 'wallhit')).toBe(true);
    run(w, 6);
    expect(w.walls).toHaveLength(0);
    expect(wallOnLine(w, 0, 1)).toBeNull();
    run(w, 6);
    expect(w.towers[1]!.owner).toBe(PLAYER);
  });

  it('a tower with lines keeps its number, a tower without lines grows', () => {
    const s = base();
    s.towers[0]!.troops = 20;
    addLine(s, 0, 1, PLAYER);
    // drawing the line costs troops, then the number stays
    const after = s.towers[0]!.troops;
    expect(after).toBe(20 - lineCost(s, 0, 1));
    run(s, 4);
    expect(s.towers[0]!.troops).toBe(after);
    s.lines = [];
    run(s, 2);
    expect(s.towers[0]!.troops).toBeGreaterThan(after);
  });

  it('a tower at MAX shows the cap and sends bursts', () => {
    const s = base();
    s.towers[0]!.troops = 60;
    run(s, 0.1);
    expect(s.towers[0]!.troops).toBe(60); // above the cap it does not grow (cap = 50)
    expect(isMax(s, s.towers[0]!)).toBe(true);
    addLine(s, 0, 1, PLAYER);
    run(s, 1);
    const maxTroops = s.troops.length;
    const t = createGame(def([T(360, 1100, PLAYER, 40), T(120, 700, NEUTRAL, 5), T(360, 300, 2, 5)]));
    addLine(t, 0, 1, PLAYER);
    run(t, 1);
    expect(maxTroops).toBeGreaterThan(t.troops.length);
  });

  it('cannon towers draw no lines', () => {
    const s = createGame(def([{ ...T(360, 1100, PLAYER, 30), kind: 'cannon' }, T(360, 300, 2, 5)]));
    expect(checkLine(s, 0, 1, PLAYER)).toBe('full');
  });

  it('streams one troop every SEND_INTERVAL and captures the target', () => {
    const s = base();
    s.towers[0]!.troops = 20;
    addLine(s, 0, 1, PLAYER);
    run(s, SEND_INTERVAL * 4 + 0.01);
    expect(s.troops.length).toBeGreaterThanOrEqual(3);
    run(s, 12);
    expect(s.towers[1]?.owner).toBe(PLAYER);
  });

  it('a captured tower loses its lines', () => {
    const s = createGame(def([T(360, 1100, PLAYER, 40), T(360, 700, 2, 5), T(600, 300, NEUTRAL, 50)]));
    expect(addLine(s, 1, 2, 2)).toBe('ok');
    s.towers[1]!.acc = -100; // freeze the enemy tower's growth for the test
    addLine(s, 0, 1, PLAYER);
    run(s, 6);
    expect(s.towers[1]?.owner).toBe(PLAYER);
    expect(linesFrom(s, 1).filter((l) => l.owner === 2)).toHaveLength(0);
  });

  it('drawing back over an own line reverses it', () => {
    const s = base();
    s.towers[1]!.owner = PLAYER;
    expect(addLine(s, 0, 1, PLAYER)).toBe('ok');
    expect(addLine(s, 1, 0, PLAYER)).toBe('ok');
    expect(s.lines.map((l) => [l.src, l.dst])).toEqual([[1, 0]]);
  });

  it('a shrinking tower retracts lines it can no longer hold', () => {
    const s = base();
    s.towers[0]!.troops = 20;
    s.towers[1]!.troops = 90;
    s.towers[2]!.troops = 90;
    expect(addLine(s, 0, 1, PLAYER)).toBe('ok');
    expect(addLine(s, 0, 2, PLAYER)).toBe('ok');
    // an attack knocks it below 10
    s.towers[0]!.troops = 6;
    run(s, 0.1);
    expect(levelOf(s.towers[0]!)).toBe(1);
    expect(linesFrom(s, 0)).toHaveLength(1);
  });
});

describe('line cost', () => {
  it('drawing a line costs troops by length and needs enough troops', () => {
    const s = createGame(def([T(360, 1180, PLAYER, 3), T(360, 100, NEUTRAL, 5), T(60, 640, 2, 1)]));
    const cost = lineCost(s, 0, 1);
    expect(cost).toBeGreaterThanOrEqual(4);
    expect(addLine(s, 0, 1, PLAYER)).toBe('poor');
    s.towers[0]!.troops = cost + 1;
    expect(addLine(s, 0, 1, PLAYER)).toBe('ok');
    expect(s.towers[0]!.troops).toBe(1);
  });
});

describe('fights and cuts', () => {
  it('troops on opposing lines meet and cancel out one by one', () => {
    const s = createGame(def([T(360, 1100, PLAYER, 20), T(360, 300, 2, 20)]));
    addLine(s, 0, 1, PLAYER);
    addLine(s, 1, 0, 2);
    run(s, 8);
    const ev = drainEvents(s);
    expect(ev.some((e) => e.type === 'clash')).toBe(true);
    // equal towers, equal lines: nobody has lost the tower
    expect(s.towers[0]?.owner).toBe(PLAYER);
    expect(s.towers[1]?.owner).toBe(2);
  });

  it('cutting a line sends the near half home and lets the far half go on', () => {
    const s = createGame(def([T(360, 1180, PLAYER, 20), T(360, 100, NEUTRAL, 60), T(60, 640, 2, 1)]));
    addLine(s, 0, 1, PLAYER);
    run(s, 5);
    const before = s.troops.length;
    expect(before).toBeGreaterThan(5);
    const n = cutLines(s, PLAYER, 0, 640, 720, 640);
    expect(n).toBe(1);
    expect(s.lines).toHaveLength(0);
    const home = s.troops.filter((t) => t.dst === 0);
    const on = s.troops.filter((t) => t.dst === 1);
    expect(home.length).toBeGreaterThan(0);
    expect(on.length).toBeGreaterThan(0);
    for (const t of home) expect(troopPos(s, t).y).toBeGreaterThan(640);
    const troopsHome = s.towers[0]!.troops;
    run(s, 8);
    expect(s.towers[0]!.troops).toBeGreaterThan(troopsHome + home.length - 1);
  });

  it('swiping over enemy lines does nothing', () => {
    const s = createGame(def([T(360, 1180, PLAYER, 10), T(360, 100, 2, 10)]));
    addLine(s, 1, 0, 2);
    expect(cutLines(s, PLAYER, 0, 640, 720, 640)).toBe(0);
    expect(s.lines).toHaveLength(1);
  });
});

describe('end of game', () => {
  it('wins when no enemy towers or troops are left', () => {
    const s = createGame(def([T(360, 1100, PLAYER, 30), T(360, 300, 2, 2)]));
    addLine(s, 0, 1, PLAYER);
    run(s, 40);
    expect(s.result).toBe('win');
  });
  it('loses when the player has nothing left', () => {
    const s = createGame(def([T(360, 1100, PLAYER, 1), T(360, 300, 2, 40)]));
    addLine(s, 1, 0, 2);
    run(s, 20);
    expect(s.result).toBe('lose');
  });
});
