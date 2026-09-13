import { ALL_TYPES, type NodeType } from './types';

export interface Chapter {
  name: string;
  desc: string;
}
export const CHAPTERS: readonly Chapter[] = [
  { name: 'Der Schelf', desc: 'Flaches Wasser. Lerne Routen, Ausbau und die ersten Knotenarten.' },
  { name: 'Das Riff', desc: 'Engstellen, Türme und Quellen. Zwei Gegner zugleich.' },
  { name: 'Der Abgrund', desc: 'Drei Schwärme, kein Licht. Alles, was du gelernt hast, zählt.' },
];

export type LevelFeature = 'upgrade' | 'split' | 'convert';

export interface LevelDef {
  name: string;
  ch: number;
  nodes: number;
  enemies: number;
  types: readonly NodeType[];
  /** Base AI decision interval in seconds. */
  ai: number;
  /** Number of rock clusters. */
  obst: number;
  seed: number;
  /** Starting garrison. */
  gar: number;
  /** Enemy production multiplier. */
  prod: number;
  /** Par time in seconds for three stars. */
  par: number;
  text: string;
  newType?: NodeType;
  feature?: LevelFeature;
  boss?: boolean;
  endless?: boolean;
  demo?: boolean;
  /** Whether the AI upgrades/converts nodes (off in the first two campaign levels). */
  aiUpgrades?: boolean;
}

const T1: NodeType[] = ['nest'];
const T2: NodeType[] = ['nest', 'brut'];
const T3: NodeType[] = ['nest', 'brut', 'bastion'];
const T4: NodeType[] = ['nest', 'brut', 'bastion', 'strom'];
const T5: NodeType[] = ['nest', 'brut', 'bastion', 'strom', 'waechter'];
const ALL = ALL_TYPES;

export const CAMPAIGN: readonly LevelDef[] = [
  {
    ch: 0,
    name: 'Erstes Leuchten',
    nodes: 7,
    enemies: 1,
    types: T1,
    ai: 3.4,
    obst: 1,
    seed: 11,
    gar: 12,
    prod: 1.0,
    par: 80,
    aiUpgrades: false,
    text: 'Tief unten im Abgrund leuchten Knoten. Wer alle hält, gewinnt.',
  },
  {
    ch: 0,
    name: 'Brutgrund',
    nodes: 9,
    enemies: 1,
    types: T2,
    ai: 3.0,
    obst: 2,
    seed: 23,
    gar: 14,
    prod: 1.0,
    par: 90,
    aiUpgrades: false,
    newType: 'brut',
    text: 'Brutnester füllen sich doppelt so schnell. Nimm sie zuerst.',
  },
  {
    ch: 0,
    name: 'Ausbau',
    nodes: 10,
    enemies: 1,
    types: T2,
    ai: 2.8,
    obst: 2,
    seed: 29,
    gar: 16,
    prod: 1.0,
    par: 100,
    feature: 'upgrade',
    text: 'Tippe einen eigenen Knoten an: Für Einheiten kannst du ihn bis Stufe 3 ausbauen. Der Gegner tut das jetzt auch.',
  },
  {
    ch: 0,
    name: 'Riffkante',
    nodes: 10,
    enemies: 1,
    types: T3,
    ai: 2.6,
    obst: 3,
    seed: 37,
    gar: 16,
    prod: 1.02,
    par: 110,
    newType: 'bastion',
    text: 'Bastionen halten Engstellen. Umgehe sie oder sammle genug Kraft.',
  },
  {
    ch: 0,
    name: 'Kalte Strömung',
    nodes: 11,
    enemies: 1,
    types: T4,
    ai: 2.5,
    obst: 3,
    seed: 41,
    gar: 18,
    prod: 1.04,
    par: 120,
    newType: 'strom',
    text: 'Strömungsknoten verdoppeln das Tempo. Route deinen Nachschub hindurch.',
  },
  {
    ch: 0,
    name: 'Zwei Fronten',
    nodes: 12,
    enemies: 2,
    types: T4,
    ai: 2.5,
    obst: 3,
    seed: 47,
    gar: 18,
    prod: 1.04,
    par: 150,
    feature: 'split',
    text: 'Zwei Gegner. Ein Knoten kann bis zu drei Routen halten und teilt seinen Nachschub gleichmäßig auf. Über die Reserve behältst du Verteidiger zurück.',
  },
  {
    ch: 1,
    name: 'Wachtposten',
    nodes: 12,
    enemies: 2,
    types: T5,
    ai: 2.3,
    obst: 4,
    seed: 59,
    gar: 20,
    prod: 1.06,
    par: 150,
    newType: 'waechter',
    text: 'Wächter sind Türme: Sie beschießen alles Fremde in Reichweite. Führe keine Route durch ihr Feld.',
  },
  {
    ch: 1,
    name: 'Die Quelle',
    nodes: 13,
    enemies: 2,
    types: ALL,
    ai: 2.2,
    obst: 4,
    seed: 67,
    gar: 22,
    prod: 1.08,
    par: 120,
    newType: 'quelle',
    text: 'Eine Quelle verstärkt ihre Nachbarn. Wer sie hält, wächst schneller.',
  },
  {
    ch: 1,
    name: 'Umbau',
    nodes: 13,
    enemies: 2,
    types: ALL,
    ai: 2.1,
    obst: 4,
    seed: 71,
    gar: 22,
    prod: 1.08,
    par: 127,
    feature: 'convert',
    text: 'Du kannst eigene Knoten für Einheiten in eine andere Art umbauen – zum Beispiel ein Nest an der Front in einen Wächter.',
  },
  {
    ch: 1,
    name: 'Schwarzes Riff',
    nodes: 14,
    enemies: 2,
    types: ALL,
    ai: 2.0,
    obst: 5,
    seed: 73,
    gar: 24,
    prod: 1.1,
    par: 135,
    text: 'Viele Felsen, wenige Wege. Halte die Kreuzungen.',
  },
  {
    ch: 1,
    name: 'Enge Gassen',
    nodes: 15,
    enemies: 2,
    types: ALL,
    ai: 1.9,
    obst: 6,
    seed: 79,
    gar: 24,
    prod: 1.1,
    par: 142,
    text: 'Fast alles läuft durch zwei Gassen. Wer dort einen Turm hat, gewinnt.',
  },
  {
    ch: 1,
    name: 'Gegenstrom',
    nodes: 15,
    enemies: 2,
    types: ALL,
    ai: 1.8,
    obst: 5,
    seed: 83,
    gar: 26,
    prod: 1.12,
    par: 150,
    text: 'Die Gegner schicken ihre Schwärme durch Strömungen. Sei schneller.',
  },
  {
    ch: 2,
    name: 'Dreifront',
    nodes: 16,
    enemies: 3,
    types: ALL,
    ai: 1.75,
    obst: 5,
    seed: 89,
    gar: 26,
    prod: 1.18,
    par: 165,
    text: 'Drei Schwärme. Lass sie sich gegenseitig zermürben, bevor du zuschlägst.',
  },
  {
    ch: 2,
    name: 'Tiefe Gräben',
    nodes: 17,
    enemies: 3,
    types: ALL,
    ai: 1.65,
    obst: 6,
    seed: 97,
    gar: 28,
    prod: 1.2,
    par: 172,
    text: 'Lange Wege. Reserven an der Front sind hier wichtiger als überall sonst.',
  },
  {
    ch: 2,
    name: 'Stille Wasser',
    nodes: 17,
    enemies: 3,
    types: ALL,
    ai: 1.55,
    obst: 6,
    seed: 101,
    gar: 28,
    prod: 1.21,
    par: 180,
    text: 'Ruhig, bis einer den ersten Zug macht.',
  },
  {
    ch: 2,
    name: 'Das Leuchten erlischt',
    nodes: 18,
    enemies: 3,
    types: ALL,
    ai: 1.45,
    obst: 6,
    seed: 103,
    gar: 30,
    prod: 1.22,
    par: 187,
    text: 'Die Gegner starten mit ausgebauten Nestern. Deine Fähigkeiten entscheiden.',
    boss: true,
  },
  {
    ch: 2,
    name: 'Abgrund',
    nodes: 18,
    enemies: 3,
    types: ALL,
    ai: 1.35,
    obst: 7,
    seed: 113,
    gar: 32,
    prod: 1.24,
    par: 195,
    text: 'Kein Licht mehr außer deinem.',
  },
  {
    ch: 2,
    name: 'Der Grund',
    nodes: 20,
    enemies: 3,
    types: ALL,
    ai: 1.25,
    obst: 7,
    seed: 127,
    gar: 34,
    prod: 1.26,
    par: 225,
    text: 'Alles, was der Abgrund hat. Wer hier gewinnt, hat das Spiel gemeistert.',
    boss: true,
  },
];

export function endlessDef(n: number): LevelDef {
  return {
    ch: 2,
    name: `Welle ${n}`,
    nodes: Math.min(22, 12 + n),
    enemies: n < 3 ? 2 : 3,
    types: ALL,
    ai: Math.max(0.8, 2.4 - n * 0.08),
    obst: 3 + (n % 4),
    seed: 500 + n * 37,
    gar: 20 + n * 2,
    prod: Math.min(1.7, 1 + n * 0.035),
    par: 200 + n * 10,
    endless: true,
    boss: n >= 6,
    text: `Welle ${n}. Die Gegner werden mit jeder Welle stärker; deine Fähigkeiten wachsen mit.`,
  };
}

export function demoDef(seed: number): LevelDef {
  return {
    ch: 0,
    name: 'Demo',
    nodes: 13,
    enemies: 2,
    types: ALL,
    ai: 2.0,
    obst: 4,
    seed,
    gar: 18,
    prod: 1,
    par: 999,
    demo: true,
    text: '',
  };
}
