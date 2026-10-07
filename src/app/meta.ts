import type { LevelDef } from '@/game/state';
import type { Save, UpgradeId } from './save';

/* Progression: stars, coins, permanent upgrades and the daily bonus. Pure functions (tested). */

/** Target time for three stars, from the size of the level. */
export function parTime(def: LevelDef): number {
  return Math.round(15 + def.towers.length * 4.5 + def.walls.length * 4);
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

export type Branch = 'Armee' | 'Tempo' | 'Verteidigung' | 'Raketen' | 'Beute';

export interface UpgradeDef {
  id: UpgradeId;
  branch: Branch;
  name: string;
  desc: (lvl: number) => string;
  max: number;
  /** Needs this skill at this level first (the tree). */
  req?: { id: UpgradeId; lvl: number };
  /** Cost multiplier (stronger skills cost more). */
  price?: number;
}

/** The skill tree: five branches, each skill unlocks the next one in its branch. */
export const UPGRADES: UpgradeDef[] = [
  {
    id: 'army',
    branch: 'Armee',
    name: 'Große Armee',
    desc: (l) => `+${l * 2} Soldaten im Startturm`,
    max: 10,
  },
  {
    id: 'drill',
    branch: 'Armee',
    name: 'Drill',
    desc: (l) => `+${l * 5} % Ausbildungstempo`,
    max: 10,
    req: { id: 'army', lvl: 2 },
  },
  {
    id: 'elite',
    branch: 'Armee',
    name: 'Elitetruppen',
    desc: (l) => `Deine Soldaten treffen ${l * 6} % härter`,
    max: 5,
    req: { id: 'drill', lvl: 3 },
    price: 1.5,
  },
  { id: 'boots', branch: 'Tempo', name: 'Marschstiefel', desc: (l) => `+${l * 5} % Marschtempo`, max: 10 },
  {
    id: 'lines',
    branch: 'Tempo',
    name: 'Fahnenträger',
    desc: (l) => `Linien schicken ${l * 5} % mehr Soldaten`,
    max: 10,
    req: { id: 'boots', lvl: 2 },
    price: 1.3,
  },
  {
    id: 'walls',
    branch: 'Verteidigung',
    name: 'Dicke Mauern',
    desc: (l) => `Angreifer richten ${l * 4} % weniger aus`,
    max: 10,
  },
  {
    id: 'towers',
    branch: 'Verteidigung',
    name: 'Große Türme',
    desc: (l) => `Deine Türme fassen ${l * 5} Soldaten mehr`,
    max: 5,
    req: { id: 'walls', lvl: 3 },
    price: 1.4,
  },
  {
    id: 'blast',
    branch: 'Raketen',
    name: 'Sprengkraft',
    desc: (l) => `Raketenschwarm zerstört ${rocketDamage(l)} Soldaten`,
    max: 10,
  },
  {
    id: 'workshop',
    branch: 'Raketen',
    name: 'Raketenwerkstatt',
    desc: (l) => `Raketenschwarm kostet ${rocketCostFor(l)} Münzen`,
    max: 5,
    req: { id: 'blast', lvl: 2 },
  },
  {
    id: 'cluster',
    branch: 'Raketen',
    name: 'Splitterraketen',
    desc: (l) => `Gegnerische Türme in der Nähe verlieren ${l * 20} % mit`,
    max: 3,
    req: { id: 'workshop', lvl: 2 },
    price: 2,
  },
  { id: 'loot', branch: 'Beute', name: 'Kriegskasse', desc: (l) => `+${l * 10} % Münzen pro Sieg`, max: 10 },
];
export const BRANCHES: Branch[] = ['Armee', 'Tempo', 'Verteidigung', 'Raketen', 'Beute'];

export function upgradeCost(lvl: number, price = 1): number {
  return Math.round((60 + lvl * 60 + lvl * lvl * 15) * price);
}
export function skillUnlocked(s: Save, u: UpgradeDef): boolean {
  return !u.req || s.upgrades[u.req.id] >= u.req.lvl;
}

/* rocket swarm */
export function rocketDamage(blast: number): number {
  return 12 + blast * 3;
}
export function rocketCostFor(workshop: number): number {
  return Math.round(40 * (1 - workshop * 0.1));
}
export function rocketStats(s: Save): { damage: number; cost: number; splash: number } {
  return {
    damage: rocketDamage(s.upgrades.blast),
    cost: rocketCostFor(s.upgrades.workshop),
    splash: s.upgrades.cluster * 0.2,
  };
}

/** Bonuses that the skills give the player in a level. */
export function playerBonus(s: Save): NonNullable<LevelDef['player']> {
  const u = s.upgrades;
  return {
    start: u.army * 2,
    growth: 1 + u.drill * 0.05,
    speed: 1 + u.boots * 0.05,
    send: 1 + u.lines * 0.05,
    attack: 1 + u.elite * 0.06,
    defense: 1 - u.walls * 0.04,
    cap: u.towers * 5,
  };
}

/** Coins for a win including the loot skill. */
export function winCoinsFor(s: Save, n: number, stars: number, firstTime: boolean): number {
  return Math.round(winCoins(n, stars, firstTime) * (1 + s.upgrades.loot * 0.1));
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
