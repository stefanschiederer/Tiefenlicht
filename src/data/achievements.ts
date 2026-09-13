import type { SaveGame } from '@/app/save';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  /** Evaluated against the save game after each level and on capture. */
  test: (s: SaveGame) => boolean;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: 'first_capture',
    name: 'Erstes Licht',
    desc: 'Erobere deinen ersten Knoten.',
    test: (s) => s.stats.captures >= 1,
  },
  {
    id: 'first_win',
    name: 'Der Schelf leuchtet',
    desc: 'Gewinne ein Level.',
    test: (s) => s.stats.wins >= 1,
  },
  {
    id: 'three_stars',
    name: 'Unter Zielzeit',
    desc: 'Hole drei Sterne in einem Level.',
    test: (s) => Object.values(s.stars).some((v) => v >= 3),
  },
  {
    id: 'chapter1',
    name: 'Schelf gemeistert',
    desc: 'Schließe Kapitel 1 ab.',
    test: (s) => [0, 1, 2, 3, 4, 5].every((i) => (s.stars[i] ?? 0) > 0),
  },
  {
    id: 'chapter2',
    name: 'Riffgänger',
    desc: 'Schließe Kapitel 2 ab.',
    test: (s) => [6, 7, 8, 9, 10, 11].every((i) => (s.stars[i] ?? 0) > 0),
  },
  {
    id: 'chapter3',
    name: 'Der Grund',
    desc: 'Schließe die Kampagne ab.',
    test: (s) => [12, 13, 14, 15, 16, 17].every((i) => (s.stars[i] ?? 0) > 0),
  },
  {
    id: 'all_stars',
    name: 'Goldener Abgrund',
    desc: 'Sammle alle 54 Sterne.',
    test: (s) => Object.values(s.stars).reduce((a, b) => a + b, 0) >= 54,
  },
  {
    id: 'captures_25',
    name: 'Schwarmführer',
    desc: 'Erobere 25 Knoten.',
    test: (s) => s.stats.captures >= 25,
  },
  {
    id: 'captures_150',
    name: 'Tiefseeherrscher',
    desc: 'Erobere 150 Knoten.',
    test: (s) => s.stats.captures >= 150,
  },
  {
    id: 'untouched',
    name: 'Unberührt',
    desc: 'Gewinne ein Level, ohne einen Knoten zu verlieren.',
    test: (s) => s.stats.flawlessWins >= 1,
  },
  {
    id: 'objective',
    name: 'Auftrag erfüllt',
    desc: 'Erfülle ein Sonderziel.',
    test: (s) => s.stats.objectives >= 1,
  },
  { id: 'cuts_10', name: 'Scharfe Klinge', desc: 'Kappe zehn Routen.', test: (s) => s.stats.cuts >= 10 },
  { id: 'endless_3', name: 'Welle drei', desc: 'Überstehe Endlos-Welle 3.', test: (s) => s.endlessBest >= 3 },
  {
    id: 'endless_6',
    name: 'Gegen die Flut',
    desc: 'Überstehe Endlos-Welle 6.',
    test: (s) => s.endlessBest >= 6,
  },
  {
    id: 'daily_1',
    name: 'Tageslicht',
    desc: 'Schaffe eine Tages-Herausforderung.',
    test: (s) => s.dailyStreak >= 1 || s.stats.dailies >= 1,
  },
  {
    id: 'daily_5',
    name: 'Fünf Tage Tiefe',
    desc: 'Schaffe die Tages-Herausforderung an fünf Tagen in Folge.',
    test: (s) => s.stats.bestDailyStreak >= 5,
  },
];

/** Returns newly unlocked achievement ids and records them in the save. */
export function unlockAchievements(s: SaveGame): AchievementDef[] {
  const out: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.includes(a.id)) continue;
    if (a.test(s)) {
      s.achievements.push(a.id);
      out.push(a);
    }
  }
  return out;
}

/** Local calendar date as YYYY-MM-DD. */
export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function yesterdayKey(d = new Date()): string {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return todayKey(y);
}
/** Deterministic seed for a date key. */
export function dateSeed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return (h >>> 0) % 100000;
}
