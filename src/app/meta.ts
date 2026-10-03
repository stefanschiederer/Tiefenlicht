import type { LevelDef } from '@/game/state';
import type { Save, UpgradeId } from './save';

/* Progression: stars, coins, permanent upgrades and the daily bonus. Pure functions (tested). */

/** Target time for three stars, from the size of the level. */
export function parTime(def: LevelDef): number {
  return Math.round(30 + def.towers.length * 7 + def.walls.length * 3);
}

/** 3 stars within par, 2 within 1.75 × par, otherwise 1. */
export function starsFor(def: LevelDef, seconds: number): number {
  const par = parTime(def);
  return seconds <= par ? 3 : seconds <= par * 1.75 ? 2 : 1;
}

export const isBoss = (n: number): boolean => n % 10 === 0;

/** Coins for a win: base by level, more per star, double on boss levels; replays pay a third. */
export function winCoins(n: number, stars: number, firstTime: boolean): number {
  const base = 20 + n * 2 + stars * 10;
  const c = isBoss(n) ? base * 2 : base;
  return firstTime ? c : Math.ceil(c / 3);
}

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: (lvl: number) => string;
  max: number;
}
export const UPGRADES: UpgradeDef[] = [
  { id: 'army', name: 'Große Armee', desc: (l) => `+${l * 2} Soldaten im Startturm`, max: 10 },
  { id: 'drill', name: 'Drill', desc: (l) => `+${l * 5} % Ausbildungstempo`, max: 10 },
  { id: 'boots', name: 'Marschstiefel', desc: (l) => `+${l * 5} % Marschtempo`, max: 10 },
];
export function upgradeCost(lvl: number): number {
  return 60 + lvl * 60 + lvl * lvl * 15;
}

/** Bonuses that the upgrades give the player in a level. */
export function playerBonus(s: Save): NonNullable<LevelDef['player']> {
  return {
    start: s.upgrades.army * 2,
    growth: 1 + s.upgrades.drill * 0.05,
    speed: 1 + s.upgrades.boots * 0.05,
  };
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dailyAvailable(s: Save, now: Date): boolean {
  return s.daily !== dayKey(now);
}
/** Collects the daily bonus: the streak grows on consecutive days, the reward with it (up to day 7). */
export function collectDaily(s: Save, now: Date): number {
  if (!dailyAvailable(s, now)) return 0;
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  s.streak = s.daily === dayKey(y) ? s.streak + 1 : 1;
  s.daily = dayKey(now);
  const reward = 40 * Math.min(7, s.streak);
  s.coins += reward;
  return reward;
}
