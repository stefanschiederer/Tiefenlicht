/** World size in world units (portrait, like Tower War). The screen view rotates it in landscape. */
export const WORLD_W = 720;
export const WORLD_H = 1280;

export const NEUTRAL = 0;
export const PLAYER = 1;

/** Team colours: neutral, player (blue), enemies (red, yellow, purple). */
export const TEAM_COLORS = ['#aab3bf', '#2f86ff', '#ff4545', '#ffbf1f', '#a55cff'] as const;
export const TEAM_DARK = ['#6f7a88', '#1a5cc2', '#c22626', '#c98a00', '#6d2fc0'] as const;
export const TEAM_LIGHT = ['#dfe4ea', '#8cc0ff', '#ff9b9b', '#ffe08a', '#d2adff'] as const;

/** Tower hit radius at level 1 (world units). */
export const TOWER_R = 40;
/** Troop count needed to reach tower level 2 and 3. */
export const LEVEL_UP = [10, 25] as const;
/** Outgoing lines a tower may hold at level 1, 2, 3. */
export const LINES_PER_LEVEL = [1, 2, 3] as const;
/** Troops per second an owned tower produces at level 1, 2, 3. Neutral towers do not grow. */
export const GROWTH = [1, 1.3, 1.6] as const;
/** Production stops at this count; reinforcements can still push a tower up to MAX_TROOPS. */
export const GROW_CAP = 50;
export const MAX_TROOPS = 99;
/** Seconds between two troops leaving a tower on one line. */
export const SEND_INTERVAL = 0.5;
/** Troop walking speed in world units per second. */
export const TROOP_SPEED = 115;
/** Wall thickness (world units); lines may not cross walls. */
export const WALL_T = 22;

/** Tower kinds (Tower-War-style special towers). */
export type TowerKind = 'tower' | 'barracks' | 'fortress' | 'cannon' | 'stable' | 'castle' | 'mage';
export interface KindDef {
  name: string;
  desc: string;
  /** Production multiplier. */
  growth: number;
  /** Troops one attacking soldier removes. */
  damage: number;
  /** First campaign level the kind appears in. */
  from: number;
  /** Walking speed multiplier of soldiers leaving this tower. */
  speed?: number;
  /** Extra outgoing lines. */
  lines?: number;
}
export const KINDS: Record<TowerKind, KindDef> = {
  tower: { name: 'Turm', desc: 'Der normale Turm.', growth: 1, damage: 1, from: 1 },
  barracks: {
    name: 'Kaserne',
    desc: 'Bildet doppelt so schnell Soldaten aus. Nimm sie früh ein!',
    growth: 2,
    damage: 1,
    from: 4,
  },
  fortress: {
    name: 'Festung',
    desc: 'Dicke Mauern: Jeder Angreifer zählt nur halb.',
    growth: 1,
    damage: 0.5,
    from: 6,
  },
  cannon: {
    name: 'Kanonenturm',
    desc: 'Schießt auf fremde Soldaten in seiner Nähe. Neutrale Kanonen schießen auf alle.',
    growth: 0.5,
    damage: 1,
    from: 8,
  },
  stable: {
    name: 'Reiterhof',
    desc: 'Schickt Reiter statt Fußsoldaten: Sie sind fast doppelt so schnell am Ziel.',
    growth: 1,
    damage: 1,
    from: 12,
    speed: 1.8,
  },
  castle: {
    name: 'Burg',
    desc: 'Hält eine Linie mehr als andere Türme, bildet schneller aus und ist schwer zu knacken.',
    growth: 1.25,
    damage: 0.75,
    from: 16,
    lines: 1,
  },
  mage: {
    name: 'Zauberturm',
    desc: 'Schleudert alle 7 Sekunden einen Blitz auf den stärksten feindlichen Turm in Reichweite: 4 Soldaten weniger.',
    growth: 0.6,
    damage: 1,
    from: 20,
  },
};
export const MAGE_RANGE = 340;
export const MAGE_RELOAD = 7;
export const MAGE_DAMAGE = 4;
export const CANNON_RANGE = 200;
/** Seconds between two cannon shots. */
export const CANNON_RELOAD = 0.75;

/** Landscape of a level: every ten levels the campaign moves to the next world. */
export type Theme = 'grass' | 'desert' | 'snow' | 'autumn';
export const THEMES: { id: Theme; name: string }[] = [
  { id: 'grass', name: 'Grüne Wiesen' },
  { id: 'desert', name: 'Heiße Wüste' },
  { id: 'snow', name: 'Eisige Berge' },
  { id: 'autumn', name: 'Goldener Herbst' },
];
export function themeOf(n: number): (typeof THEMES)[number] {
  return THEMES[Math.floor((Math.max(1, n) - 1) / 10) % THEMES.length] as (typeof THEMES)[number];
}
