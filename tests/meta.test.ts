import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, dailyDef, dateSeed, todayKey, unlockAchievements, yesterdayKey } from '@/data';
import { defaultSave, migrate } from '@/app/save';
import { buildLevel } from '@/sim/level';

describe('achievements', () => {
  it('unlocks once and records the id', () => {
    const s = defaultSave(1);
    s.stats.captures = 1;
    const first = unlockAchievements(s);
    expect(first.map((a) => a.id)).toContain('first_capture');
    expect(unlockAchievements(s)).toEqual([]);
    expect(s.achievements).toContain('first_capture');
  });
  it('has unique ids and German names', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    expect(ids.size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) expect(a.name.length).toBeGreaterThan(2);
  });
  it('chapter achievements need every level of the chapter', () => {
    const s = defaultSave(1);
    for (let i = 0; i < 5; i++) s.stars[i] = 1;
    expect(unlockAchievements(s).map((a) => a.id)).not.toContain('chapter1');
    s.stars[5] = 2;
    expect(unlockAchievements(s).map((a) => a.id)).toContain('chapter1');
  });
});

describe('daily challenge', () => {
  it('derives a stable seed and a playable level from the date', () => {
    const key = '2026-09-14';
    expect(dateSeed(key)).toBe(dateSeed('2026-09-14'));
    expect(dateSeed(key)).not.toBe(dateSeed('2026-09-15'));
    const def = dailyDef(key, dateSeed(key));
    const s = buildLevel(def);
    expect(s.nodes.length).toBeGreaterThanOrEqual(10);
    expect(s.nodes.filter((n) => n.owner === 1)).toHaveLength(1);
    expect(s.nodes.filter((n) => n.owner > 1)).toHaveLength(def.enemies);
  });
  it('date keys are local calendar days', () => {
    const d = new Date(2026, 0, 1, 12);
    expect(todayKey(d)).toBe('2026-01-01');
    expect(yesterdayKey(d)).toBe('2025-12-31');
  });
});

describe('save stats migration', () => {
  it('fills missing stats with zeros and sanitises garbage', () => {
    const s = migrate({
      version: 2,
      stars: {},
      stats: { wins: 3, captures: 'x', playTime: -5 },
      achievements: ['first_win', 4],
      dailyStreak: 2,
    });
    expect(s.stats.wins).toBe(3);
    expect(s.stats.captures).toBe(0);
    expect(s.stats.playTime).toBe(0);
    expect(s.achievements).toEqual(['first_win']);
    expect(s.dailyStreak).toBe(2);
    expect(s.lastDaily).toBe('');
  });
});
