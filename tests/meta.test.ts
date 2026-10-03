import { describe, expect, it } from 'vitest';
import { levelDef } from '@/game/levels';
import { createGame } from '@/game/sim';
import { PLAYER } from '@/game/config';
import {
  collectDaily,
  dailyAvailable,
  parTime,
  playerBonus,
  starsFor,
  upgradeCost,
  winCoins,
} from '@/app/meta';
import { defaultSave, parseSave } from '@/app/save';

describe('stars and coins', () => {
  it('gives 3 stars within par, 2 within 1.75 x par, else 1', () => {
    const d = levelDef(5);
    const par = parTime(d);
    expect(starsFor(d, par)).toBe(3);
    expect(starsFor(d, par * 1.5)).toBe(2);
    expect(starsFor(d, par * 3)).toBe(1);
  });
  it('pays more for stars and boss levels, a third on replays', () => {
    expect(winCoins(5, 3, true)).toBeGreaterThan(winCoins(5, 1, true));
    expect(winCoins(10, 1, true)).toBe(2 * (20 + 20 + 10));
    expect(winCoins(5, 3, false)).toBe(Math.ceil(winCoins(5, 3, true) / 3));
  });
});

describe('upgrades', () => {
  it('cost more with every level', () => {
    expect(upgradeCost(1)).toBeGreaterThan(upgradeCost(0));
    expect(upgradeCost(9)).toBeGreaterThan(upgradeCost(8));
  });
  it('apply to the player in the simulation', () => {
    const s = defaultSave();
    s.upgrades = { army: 3, drill: 2, boots: 1 };
    const b = playerBonus(s);
    expect(b).toEqual({ start: 6, growth: 1.1, speed: 1.05 });
    const def = levelDef(1);
    def.player = b;
    const g = createGame(def);
    expect(g.towers.find((t) => t.owner === PLAYER)?.troops).toBe(levelDef(1).towers[0]!.troops + 6);
  });
});

describe('daily bonus', () => {
  it('can be collected once a day and grows with the streak', () => {
    const s = defaultSave();
    const d1 = new Date(2026, 9, 1, 10);
    expect(collectDaily(s, d1)).toBe(40);
    expect(dailyAvailable(s, d1)).toBe(false);
    expect(collectDaily(s, d1)).toBe(0);
    expect(collectDaily(s, new Date(2026, 9, 2, 9))).toBe(80);
    expect(s.streak).toBe(2);
    // a missed day resets the streak
    expect(collectDaily(s, new Date(2026, 9, 4, 9))).toBe(40);
    expect(s.coins).toBe(160);
  });
});

describe('save compatibility', () => {
  it('keeps the level of saves from earlier versions and fills in the rest', () => {
    const s = parseSave(JSON.stringify({ level: 7, sound: false }));
    expect(s.level).toBe(7);
    expect(s.sound).toBe(false);
    expect(s.coins).toBe(0);
    expect(s.stars.slice(0, 6)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(s.upgrades).toEqual({ army: 0, drill: 0, boots: 0 });
  });
  it('survives garbage', () => {
    expect(parseSave('{nope').level).toBe(1);
    expect(parseSave(null).level).toBe(1);
  });
});
