export type NodeType = 'nest' | 'brut' | 'bastion' | 'strom' | 'waechter' | 'quelle';
export type UnitType = 'sporen' | 'drohnen' | 'panzer' | 'pfeile' | 'stachel' | 'orbs';
export type Level = 1 | 2 | 3;
export type Triple = readonly [number, number, number];

export interface NodeTypeDef {
  name: string;
  unit: UnitType;
  /** Base radius in world units. */
  r: number;
  cap: Triple;
  rate: Triple;
  def: Triple;
  /** How attractive the type is for the AI. */
  value: number;
  desc: string;
  speedMul?: Triple;
  zapRange?: Triple;
  zapRate?: Triple;
  boost?: Triple;
}

export interface UnitDef {
  name: string;
  str: number;
  speed: number;
}

export const TYPES: Record<NodeType, NodeTypeDef> = {
  nest: {
    name: 'Nest',
    unit: 'sporen',
    r: 24,
    cap: [40, 60, 85],
    rate: [0.8, 1.15, 1.6],
    def: [1, 1.2, 1.4],
    value: 20,
    desc: 'Erzeugt stetig Sporen. Das Rückgrat jedes Schwarms – günstig und ausbaufähig.',
  },
  brut: {
    name: 'Brutnest',
    unit: 'drohnen',
    r: 30,
    cap: [70, 100, 140],
    rate: [1.6, 2.2, 3.0],
    def: [0.75, 0.85, 0.95],
    value: 32,
    desc: 'Doppelte Produktion, großer Vorrat, dafür verwundbar. Seine Drohnen sind schnell, aber schwach.',
  },
  bastion: {
    name: 'Bastion',
    unit: 'panzer',
    r: 26,
    cap: [50, 70, 95],
    rate: [0.4, 0.55, 0.7],
    def: [2, 2.6, 3.2],
    value: 24,
    desc: 'Angreifer zählen nur halb. Produziert langsam schwere Panzer, die viel aushalten und langsam ziehen.',
  },
  strom: {
    name: 'Strömung',
    unit: 'pfeile',
    r: 22,
    cap: [30, 40, 55],
    rate: [0.2, 0.3, 0.4],
    def: [1, 1.1, 1.2],
    value: 18,
    speedMul: [2, 2.5, 3],
    desc: 'Alles, was von hier aufbricht, ist doppelt so schnell. Erzeugt flinke Pfeile.',
  },
  waechter: {
    name: 'Wächter',
    unit: 'stachel',
    r: 24,
    cap: [35, 45, 60],
    rate: [0.5, 0.6, 0.7],
    def: [1.2, 1.4, 1.6],
    value: 28,
    zapRange: [150, 190, 235],
    zapRate: [2.5, 4, 6],
    desc: 'Ein Turm: beschießt feindliche Schwärme in Reichweite, auch solche, die nur vorbeiziehen. Ausbau erhöht Reichweite und Feuerrate.',
  },
  quelle: {
    name: 'Quelle',
    unit: 'orbs',
    r: 24,
    cap: [35, 45, 60],
    rate: [0.5, 0.6, 0.7],
    def: [1, 1.1, 1.2],
    value: 30,
    boost: [0.5, 0.75, 1.0],
    desc: 'Verstärkt die Produktion aller direkt verbundenen eigenen Knoten um 50 %, ausgebaut bis 100 %.',
  },
};

export const UNITS: Record<UnitType, UnitDef> = {
  sporen: { name: 'Sporen', str: 1.0, speed: 1.0 },
  drohnen: { name: 'Drohnen', str: 0.85, speed: 1.25 },
  panzer: { name: 'Panzer', str: 1.7, speed: 0.7 },
  pfeile: { name: 'Pfeile', str: 0.9, speed: 1.6 },
  stachel: { name: 'Stachel', str: 1.25, speed: 0.95 },
  orbs: { name: 'Lichtkugeln', str: 1.0, speed: 1.05 },
};

export const TYPE_WEIGHTS: Record<NodeType, number> = {
  nest: 0.42,
  brut: 0.16,
  bastion: 0.14,
  strom: 0.1,
  waechter: 0.1,
  quelle: 0.08,
};

export const ALL_TYPES: readonly NodeType[] = ['nest', 'brut', 'bastion', 'strom', 'waechter', 'quelle'];

export interface Faction {
  name: string;
  color: string;
}
export const FACTIONS: readonly Faction[] = [
  { name: 'Wilde Knoten', color: '#6f8494' },
  { name: 'Goldschwarm', color: '#ffc45a' },
  { name: 'Purpurschwarm', color: '#ff4f9a' },
  { name: 'Grünschwarm', color: '#7ee06a' },
  { name: 'Violettschwarm', color: '#a27bff' },
];
export const PLAYER = 1;
