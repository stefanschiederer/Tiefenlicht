import { ALL_TYPES, type NodeType } from './types';
import { MAP_ERSTES_LEUCHTEN, MAP_WACHTPOSTEN, type HandMap, type Objective } from './maps';

export interface Chapter {
  name: string;
  desc: string;
  /** Narrative intro shown once before the chapter's first level. */
  intro: string;
}
export const CHAPTERS: readonly Chapter[] = [
  {
    name: 'Der Schelf',
    desc: 'Flaches Wasser. Lerne Routen, Ausbau und die ersten Knotenarten.',
    intro:
      'Im flachen Wasser über dem Schelf leuchten die ersten Knoten. Der Goldschwarm ist klein, aber das Licht hier oben ist noch warm. Lerne, wie Routen fließen und wie ein Nest wächst, bevor die Strömung dich tiefer trägt.',
  },
  {
    name: 'Das Riff',
    desc: 'Engstellen, Türme und Quellen. Zwei Gegner zugleich.',
    intro:
      'Das Riff ist ein Labyrinth aus Fels und Gassen. Wächter bewachen die Engstellen, Quellen nähren, wer sie hält, und Barrieren versperren die kurzen Wege. Hier kämpfen zwei Schwärme gegen dich – und gegeneinander.',
  },
  {
    name: 'Der Abgrund',
    desc: 'Drei Schwärme, kein Licht. Alles, was du gelernt hast, zählt.',
    intro:
      'Unter dem Riff endet das Licht. Drei Schwärme streiten um die letzten Knoten, Minen treiben in den Gräben, und die Gegner beginnen ausgebaut. Wer den Grund erreicht, hat den Abgrund bezwungen.',
  },
];

export type LevelFeature = 'upgrade' | 'split' | 'convert' | 'barrier' | 'mine';

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
  /** Reef barriers placed on random edges: troops must break them (costs units) before passing. */
  barriers?: number;
  /** Mines on random edges: the first group passing loses units. */
  mines?: number;
  /** Hand-made map (replaces the generator; seed still drives node types of untyped nodes). */
  map?: HandMap;
  /** Optional special objective that wins the level early. */
  objective?: Objective;
  /** Short chapter intro shown before the first level of a chapter. */
  chapterIntro?: string;
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
    seed: 21,
    gar: 12,
    prod: 1.0,
    par: 85,
    aiUpgrades: false,
    text: 'Tief unten im Abgrund leuchten Knoten. Wer alle hält, gewinnt.',
    map: MAP_ERSTES_LEUCHTEN,
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
    par: 95,
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
    seed: 5,
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
    seed: 34,
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
    seed: 62,
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
    seed: 61,
    gar: 18,
    prod: 1.04,
    par: 130,
    feature: 'split',
    text: 'Zwei Gegner. Ausgebaute Gebäude halten mehrere Linien und teilen ihren Strom auf. Kappe Linien, bevor ein Gebäude leerläuft.',
  },
  {
    ch: 1,
    name: 'Wachtposten',
    nodes: 13,
    enemies: 2,
    types: T5,
    ai: 2.3,
    obst: 4,
    seed: 59,
    gar: 20,
    prod: 1.06,
    par: 145,
    newType: 'waechter',
    text: 'Wächter sind Türme: Sie beschießen alles Fremde in Reichweite. Führe keine Route durch ihr Feld.',
    map: MAP_WACHTPOSTEN,
    objective: { type: 'hold', node: 5, seconds: 45, label: 'Halte die Bastion in der Mitte 45 Sekunden' },
  },
  {
    ch: 1,
    name: 'Die Quelle',
    nodes: 13,
    enemies: 2,
    types: ALL,
    ai: 2.2,
    obst: 4,
    seed: 83,
    gar: 22,
    prod: 1.08,
    par: 150,
    newType: 'quelle',
    text: 'Eine Quelle verstärkt ihre Nachbarn. Wer sie hält, wächst schneller.',
    objective: { type: 'hold', node: -1, seconds: 60, label: 'Halte eine Quelle 60 Sekunden' },
  },
  {
    ch: 1,
    name: 'Umbau',
    nodes: 13,
    enemies: 2,
    types: ALL,
    ai: 2.1,
    obst: 4,
    seed: 73,
    gar: 22,
    prod: 1.08,
    par: 170,
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
    seed: 58,
    gar: 24,
    prod: 1.1,
    par: 175,
    text: 'Viele Felsen, wenige Wege. Riffbarrieren versperren manche Verbindung: Truppen müssen sie erst durchbrechen. Halte die Kreuzungen.',
    feature: 'barrier',
    barriers: 2,
  },
  {
    ch: 1,
    name: 'Enge Gassen',
    nodes: 15,
    enemies: 2,
    types: ALL,
    ai: 1.9,
    obst: 6,
    seed: 70,
    gar: 24,
    prod: 1.1,
    par: 180,
    text: 'Fast alles läuft durch zwei Gassen, und in den Gassen liegen Minen. Wer dort einen Turm hat, gewinnt.',
    barriers: 2,
    feature: 'mine',
    mines: 2,
  },
  {
    ch: 1,
    name: 'Gegenstrom',
    nodes: 15,
    enemies: 2,
    types: ALL,
    ai: 1.8,
    obst: 5,
    seed: 70,
    gar: 26,
    prod: 1.12,
    par: 185,
    text: 'Die Gegner schicken ihre Schwärme durch Strömungen. Sei schneller.',
    barriers: 1,
    mines: 2,
  },
  {
    ch: 2,
    name: 'Dreifront',
    nodes: 16,
    enemies: 3,
    types: ALL,
    ai: 1.75,
    obst: 5,
    seed: 86,
    gar: 26,
    prod: 1.22,
    par: 200,
    text: 'Drei Schwärme. Lass sie sich gegenseitig zermürben, bevor du zuschlägst.',
    barriers: 2,
    mines: 2,
  },
  {
    ch: 2,
    name: 'Tiefe Gräben',
    nodes: 17,
    enemies: 3,
    types: ALL,
    ai: 1.65,
    obst: 6,
    seed: 105,
    gar: 28,
    prod: 1.2,
    par: 220,
    text: 'Lange Wege. Reserven an der Front sind hier wichtiger als überall sonst.',
    barriers: 3,
    mines: 2,
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
    prod: 1.12,
    par: 230,
    text: 'Ruhig, bis einer den ersten Zug macht.',
    barriers: 2,
    mines: 3,
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
    prod: 1.34,
    par: 240,
    text: 'Die Gegner starten mit ausgebauten Nestern. Deine Fähigkeiten entscheiden.',
    boss: true,
    barriers: 2,
    mines: 3,
  },
  {
    ch: 2,
    name: 'Abgrund',
    nodes: 18,
    enemies: 3,
    types: ALL,
    ai: 1.35,
    obst: 7,
    seed: 150,
    gar: 32,
    prod: 1.1,
    par: 260,
    text: 'Kein Licht mehr außer deinem.',
    barriers: 3,
    mines: 3,
  },
  {
    ch: 2,
    name: 'Der Grund',
    nodes: 20,
    enemies: 3,
    types: ALL,
    ai: 1.25,
    obst: 7,
    seed: 151,
    gar: 34,
    prod: 1.2,
    par: 280,
    text: 'Alles, was der Abgrund hat. Wer hier gewinnt, hat das Spiel gemeistert.',
    boss: true,
    barriers: 3,
    mines: 4,
  },
];

export function endlessDef(n: number): LevelDef {
  return {
    ch: 2,
    name: `Welle ${n}`,
    nodes: Math.min(22, 12 + n),
    enemies: n < 2 ? 1 : n < 4 ? 2 : 3,
    types: ALL,
    ai: Math.max(0.9, 2.7 - n * 0.09),
    obst: 3 + (n % 4),
    seed: 500 + n * 31,
    gar: 20 + n * 2,
    prod: Math.min(1.7, 1 + n * 0.024),
    par: 170 + n * 15,
    endless: true,
    boss: n >= 6,
    barriers: Math.min(4, Math.floor(n / 2)),
    mines: Math.min(4, Math.floor((n + 1) / 2)),
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

/** Daily challenge: one fixed map per calendar day, shared by everyone. */
export function dailyDef(dateKey: string, seed: number): LevelDef {
  const n = 3 + (seed % 4);
  return {
    ch: 1,
    name: `Tages-Herausforderung ${dateKey}`,
    nodes: 13 + (seed % 5),
    enemies: 2 + (seed % 2),
    types: ALL,
    ai: 2.0 - (seed % 3) * 0.15,
    obst: n,
    seed: 900000 + seed,
    gar: 22,
    prod: 1.05 + (seed % 4) * 0.03,
    par: 200,
    barriers: seed % 3,
    mines: (seed >> 2) % 3,
    text: 'Eine Karte für alle, nur heute. Schaffst du sie unter der Zielzeit?',
  };
}
