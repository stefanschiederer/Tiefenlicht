import { ABILITIES, type AbilityId } from './rules';

export type SkillBranch = 'Brut' | 'Sturm' | 'Fels' | 'Licht';
export interface SkillEffect {
  prod?: number;
  cap?: number;
  start?: number;
  startLevel?: number;
  boost?: number;
  capture?: number;
  speed?: number;
  stream?: number;
  str?: number;
  routes?: number;
  barrier?: number;
  tankStr?: number;
  def?: number;
  cheap?: number;
  range?: number;
  towerRate?: number;
  mine?: number;
  energy?: number;
  surrender?: number;
  abcost?: number;
  stossUnits?: number;
  frostDur?: number;
  schildDur?: number;
  energyRegen?: number;
  energyStart?: number;
  flow?: number;
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

/** Four branches × eight tiers. Costs sum to about 70 points (54 campaign stars + endless + daily). */
export const SKILLS: readonly SkillDef[] = [
  // Brut – Wirtschaft
  {
    id: 'prod1',
    branch: 'Brut',
    name: 'Reiche Brut I',
    desc: '+10 % Produktion aller Gebäude',
    cost: 1,
    req: null,
    effect: { prod: 0.1 },
  },
  {
    id: 'cap',
    branch: 'Brut',
    name: 'Weite Kammern',
    desc: '+20 % Vorrat aller Gebäude',
    cost: 1,
    req: 'prod1',
    effect: { cap: 0.2 },
  },
  {
    id: 'prod2',
    branch: 'Brut',
    name: 'Reiche Brut II',
    desc: '+10 % Produktion',
    cost: 2,
    req: 'cap',
    effect: { prod: 0.1 },
  },
  {
    id: 'start',
    branch: 'Brut',
    name: 'Starker Auftakt',
    desc: '+8 Einheiten zu Beginn jedes Levels',
    cost: 2,
    req: 'prod2',
    effect: { start: 8 },
  },
  {
    id: 'boost',
    branch: 'Brut',
    name: 'Klare Quelle',
    desc: 'Quellen verstärken Nachbarn 25 % stärker',
    cost: 2,
    req: 'start',
    effect: { boost: 0.25 },
  },
  {
    id: 'capture',
    branch: 'Brut',
    name: 'Beutezug',
    desc: 'Beim Erobern bleiben 20 % mehr Einheiten übrig',
    cost: 3,
    req: 'boost',
    effect: { capture: 0.2 },
  },
  {
    id: 'prod3',
    branch: 'Brut',
    name: 'Reiche Brut III',
    desc: '+15 % Produktion',
    cost: 3,
    req: 'capture',
    effect: { prod: 0.15 },
  },
  {
    id: 'startLevel',
    branch: 'Brut',
    name: 'Altes Riff',
    desc: 'Dein Startgebäude beginnt auf Stufe 2',
    cost: 4,
    req: 'prod3',
    effect: { startLevel: 1 },
  },
  // Sturm – Angriff und Strom
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
    id: 'stream1',
    branch: 'Sturm',
    name: 'Starker Strom I',
    desc: 'Linien führen 25 % mehr Einheiten pro Sekunde',
    cost: 1,
    req: 'speed',
    effect: { stream: 0.25 },
  },
  {
    id: 'str1',
    branch: 'Sturm',
    name: 'Scharfe Zähne I',
    desc: '+10 % Angriffsstärke',
    cost: 2,
    req: 'stream1',
    effect: { str: 0.1 },
  },
  {
    id: 'barrier',
    branch: 'Sturm',
    name: 'Riffbrecher',
    desc: 'Deine Schwärme durchbrechen Barrieren mit doppelter Kraft',
    cost: 2,
    req: 'str1',
    effect: { barrier: 1 },
  },
  {
    id: 'str2',
    branch: 'Sturm',
    name: 'Scharfe Zähne II',
    desc: '+10 % Angriffsstärke',
    cost: 2,
    req: 'barrier',
    effect: { str: 0.1 },
  },
  {
    id: 'tankStr',
    branch: 'Sturm',
    name: 'Harte Schalen',
    desc: 'Panzerkrebse sind 25 % stärker',
    cost: 3,
    req: 'str2',
    effect: { tankStr: 0.25 },
  },
  {
    id: 'stream2',
    branch: 'Sturm',
    name: 'Starker Strom II',
    desc: 'Linien führen weitere 25 % mehr Einheiten',
    cost: 3,
    req: 'tankStr',
    effect: { stream: 0.25 },
  },
  {
    id: 'routes',
    branch: 'Sturm',
    name: 'Weit verzweigt',
    desc: 'Jedes Gebäude hält eine Linie mehr',
    cost: 4,
    req: 'stream2',
    effect: { routes: 1 },
  },
  // Fels – Verteidigung
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
    cost: 1,
    req: 'def',
    effect: { cheap: 0.25 },
  },
  {
    id: 'range',
    branch: 'Fels',
    name: 'Weiter Blick',
    desc: '+25 % Reichweite deiner Leuchttürme',
    cost: 2,
    req: 'cheap',
    effect: { range: 0.25 },
  },
  {
    id: 'towerRate',
    branch: 'Fels',
    name: 'Schnelles Feuer',
    desc: 'Leuchttürme schießen 30 % schneller',
    cost: 2,
    req: 'range',
    effect: { towerRate: 0.3 },
  },
  {
    id: 'mine',
    branch: 'Fels',
    name: 'Minentaucher',
    desc: 'Minen zerstören nur halb so viele deiner Einheiten',
    cost: 2,
    req: 'towerRate',
    effect: { mine: 0.5 },
  },
  {
    id: 'def2',
    branch: 'Fels',
    name: 'Fels in der Brandung',
    desc: '+15 % Verteidigung',
    cost: 3,
    req: 'mine',
    effect: { def: 0.15 },
  },
  {
    id: 'energy',
    branch: 'Fels',
    name: 'Seelenlicht',
    desc: '+50 % Energie aus gefallenen Einheiten',
    cost: 3,
    req: 'def2',
    effect: { energy: 0.5 },
  },
  {
    id: 'surrender',
    branch: 'Fels',
    name: 'Furchteinflößend',
    desc: 'Geschlagene Gegner geben doppelt so schnell auf',
    cost: 4,
    req: 'energy',
    effect: { surrender: 5 },
  },
  // Licht – Fähigkeiten
  {
    id: 'ab2',
    branch: 'Licht',
    name: 'Frostwelle',
    desc: ABILITIES.frost.desc,
    cost: 2,
    req: null,
    effect: { ability: 'frost' },
  },
  {
    id: 'ab3',
    branch: 'Licht',
    name: 'Schild',
    desc: ABILITIES.schild.desc,
    cost: 2,
    req: 'ab2',
    effect: { ability: 'schild' },
  },
  {
    id: 'stossUnits',
    branch: 'Licht',
    name: 'Heller Lichtstoß',
    desc: 'Lichtstoß bringt 8 Einheiten mehr',
    cost: 2,
    req: 'ab3',
    effect: { stossUnits: 8 },
  },
  {
    id: 'en2',
    branch: 'Licht',
    name: 'Tiefer Brunnen',
    desc: 'Fähigkeiten kosten 20 % weniger Energie',
    cost: 2,
    req: 'stossUnits',
    effect: { abcost: 0.2 },
  },
  {
    id: 'frostDur',
    branch: 'Licht',
    name: 'Ewiger Frost',
    desc: 'Frostwelle hält 5 Sekunden länger',
    cost: 3,
    req: 'en2',
    effect: { frostDur: 5 },
  },
  {
    id: 'schildDur',
    branch: 'Licht',
    name: 'Fester Schild',
    desc: 'Schild hält 4 Sekunden länger',
    cost: 3,
    req: 'frostDur',
    effect: { schildDur: 4 },
  },
  {
    id: 'energyStart',
    branch: 'Licht',
    name: 'Volle Batterie',
    desc: 'Jedes Level beginnt mit 25 Energie',
    cost: 3,
    req: 'schildDur',
    effect: { energyStart: 25 },
  },
  {
    id: 'energyRegen',
    branch: 'Licht',
    name: 'Lichtquelle',
    desc: 'Energie regeneriert sich langsam von selbst',
    cost: 4,
    req: 'energyStart',
    effect: { energyRegen: 0.6 },
  },
];

export interface Perks {
  prod: number;
  cap: number;
  start: number;
  startLevel: number;
  boost: number;
  capture: number;
  speed: number;
  stream: number;
  str: number;
  routes: number;
  barrier: number;
  tankStr: number;
  def: number;
  cheap: number;
  range: number;
  towerRate: number;
  mine: number;
  energy: number;
  surrender: number;
  abcost: number;
  stossUnits: number;
  frostDur: number;
  schildDur: number;
  energyRegen: number;
  energyStart: number;
  flow: number;
  abilities: AbilityId[];
}

export function emptyPerks(): Perks {
  return {
    prod: 0,
    cap: 0,
    start: 0,
    startLevel: 0,
    boost: 0,
    capture: 0,
    speed: 0,
    stream: 0,
    str: 0,
    routes: 0,
    barrier: 0,
    tankStr: 0,
    def: 0,
    cheap: 0,
    range: 0,
    towerRate: 0,
    mine: 0,
    energy: 0,
    surrender: 0,
    abcost: 0,
    stossUnits: 0,
    frostDur: 0,
    schildDur: 0,
    energyRegen: 0,
    energyStart: 0,
    flow: 0,
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
