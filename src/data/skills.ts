import { ABILITIES, type AbilityId } from './rules';

export type SkillBranch = 'Brut' | 'Sturm' | 'Fels' | 'Licht';
export interface SkillEffect {
  prod?: number;
  cap?: number;
  start?: number;
  speed?: number;
  str?: number;
  flow?: number;
  def?: number;
  cheap?: number;
  range?: number;
  energy?: number;
  abcost?: number;
  ability?: AbilityId;
}
export interface SkillDef {
  id: string;
  branch: SkillBranch;
  name: string;
  desc: string;
  cost: number;
  req: string | null;
  effect: SkillEffect;
}

export const SKILLS: readonly SkillDef[] = [
  {
    id: 'prod1',
    branch: 'Brut',
    name: 'Reiche Brut I',
    desc: '+10 % Produktion',
    cost: 1,
    req: null,
    effect: { prod: 0.1 },
  },
  {
    id: 'prod2',
    branch: 'Brut',
    name: 'Reiche Brut II',
    desc: '+10 % Produktion',
    cost: 2,
    req: 'prod1',
    effect: { prod: 0.1 },
  },
  {
    id: 'cap',
    branch: 'Brut',
    name: 'Weite Kammern',
    desc: '+20 % Kapazität aller Knoten',
    cost: 2,
    req: 'prod1',
    effect: { cap: 0.2 },
  },
  {
    id: 'start',
    branch: 'Brut',
    name: 'Starker Auftakt',
    desc: '+8 Einheiten zu Beginn jedes Levels',
    cost: 2,
    req: 'cap',
    effect: { start: 8 },
  },
  {
    id: 'speed',
    branch: 'Sturm',
    name: 'Schnelle Strömung',
    desc: '+15 % Tempo aller Schwärme',
    cost: 1,
    req: null,
    effect: { speed: 0.15 },
  },
  {
    id: 'str1',
    branch: 'Sturm',
    name: 'Scharfe Sporen I',
    desc: '+10 % Angriffsstärke',
    cost: 2,
    req: 'speed',
    effect: { str: 0.1 },
  },
  {
    id: 'str2',
    branch: 'Sturm',
    name: 'Scharfe Sporen II',
    desc: '+10 % Angriffsstärke',
    cost: 3,
    req: 'str1',
    effect: { str: 0.1 },
  },
  {
    id: 'flow',
    branch: 'Sturm',
    name: 'Stetiger Fluss',
    desc: 'Routen leiten 60 statt 40 % der Produktion weiter, doppelt so oft',
    cost: 2,
    req: 'speed',
    effect: { flow: 1 },
  },
  {
    id: 'def',
    branch: 'Fels',
    name: 'Dickes Riff',
    desc: '+15 % Verteidigung',
    cost: 1,
    req: null,
    effect: { def: 0.15 },
  },
  {
    id: 'cheap',
    branch: 'Fels',
    name: 'Kluge Baumeister',
    desc: 'Ausbau und Umbau kosten 25 % weniger',
    cost: 2,
    req: 'def',
    effect: { cheap: 0.25 },
  },
  {
    id: 'range',
    branch: 'Fels',
    name: 'Weiter Blick',
    desc: '+25 % Reichweite deiner Wächter',
    cost: 2,
    req: 'def',
    effect: { range: 0.25 },
  },
  {
    id: 'energy',
    branch: 'Fels',
    name: 'Seelenlicht',
    desc: '+50 % Energie aus gefallenen Einheiten',
    cost: 2,
    req: 'cheap',
    effect: { energy: 0.5 },
  },
  {
    id: 'ab2',
    branch: 'Licht',
    name: 'Frostwelle',
    desc: ABILITIES.frost.desc,
    cost: 3,
    req: null,
    effect: { ability: 'frost' },
  },
  {
    id: 'ab3',
    branch: 'Licht',
    name: 'Schild',
    desc: ABILITIES.schild.desc,
    cost: 3,
    req: null,
    effect: { ability: 'schild' },
  },
  {
    id: 'en2',
    branch: 'Licht',
    name: 'Tiefer Brunnen',
    desc: 'Fähigkeiten kosten 20 % weniger Energie',
    cost: 3,
    req: 'ab2',
    effect: { abcost: 0.2 },
  },
];

export interface Perks {
  prod: number;
  cap: number;
  start: number;
  speed: number;
  str: number;
  flow: number;
  def: number;
  cheap: number;
  range: number;
  energy: number;
  abcost: number;
  abilities: AbilityId[];
}

export function emptyPerks(): Perks {
  return {
    prod: 0,
    cap: 0,
    start: 0,
    speed: 0,
    str: 0,
    flow: 0,
    def: 0,
    cheap: 0,
    range: 0,
    energy: 0,
    abcost: 0,
    abilities: ['stoss'],
  };
}

/** Sums the effects of all owned skills. Unknown ids are ignored. */
export function computePerks(spent: readonly string[]): Perks {
  const p = emptyPerks();
  for (const id of spent) {
    const sk = SKILLS.find((s) => s.id === id);
    if (!sk) continue;
    for (const [k, v] of Object.entries(sk.effect) as [keyof SkillEffect, number | AbilityId][]) {
      if (k === 'ability') {
        if (!p.abilities.includes(v as AbilityId)) p.abilities.push(v as AbilityId);
      } else p[k] += v as number;
    }
  }
  return p;
}
