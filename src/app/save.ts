export type UpgradeId =
  | 'army'
  | 'drill'
  | 'elite'
  | 'boots'
  | 'lines'
  | 'walls'
  | 'towers'
  | 'blast'
  | 'workshop'
  | 'cluster'
  | 'loot';

export interface Save {
  /** Next level to play (1-based). */
  level: number;
  sound: boolean;
  coins: number;
  /** Best stars per level (index = level - 1). */
  stars: number[];
  /** Best time per level in seconds (index = level - 1). */
  times: number[];
  upgrades: Record<UpgradeId, number>;
  /** Date (YYYY-MM-DD) the daily bonus was last collected, and the streak of days in a row. */
  daily: string;
  streak: number;
}

const KEY = 'tiefenlicht-towerwar-v1';

export function defaultSave(): Save {
  return {
    level: 1,
    sound: true,
    coins: 0,
    stars: [],
    times: [],
    upgrades: {
      army: 0,
      drill: 0,
      elite: 0,
      boots: 0,
      lines: 0,
      walls: 0,
      towers: 0,
      blast: 0,
      workshop: 0,
      cluster: 0,
      loot: 0,
    },
    daily: '',
    streak: 0,
  };
}

/** Accepts saves from every earlier version (missing fields get defaults). */
export function parseSave(raw: string | null): Save {
  const s = defaultSave();
  if (!raw) return s;
  try {
    const d = JSON.parse(raw) as Partial<Save>;
    s.level = Math.max(1, Math.floor(Number(d.level) || 1));
    s.sound = d.sound !== false;
    s.coins = Math.max(0, Math.floor(Number(d.coins) || 0));
    s.stars = Array.isArray(d.stars) ? d.stars.map((x) => Math.max(0, Math.min(3, Number(x) || 0))) : [];
    s.times = Array.isArray(d.times) ? d.times.map((x) => Number(x) || 0) : [];
    for (const k of Object.keys(s.upgrades) as UpgradeId[])
      s.upgrades[k] = Math.max(0, Math.floor(Number(d.upgrades?.[k]) || 0));
    s.daily = typeof d.daily === 'string' ? d.daily : '';
    s.streak = Math.max(0, Math.floor(Number(d.streak) || 0));
    // players from before stars existed: count every finished level as one star
    for (let i = 0; i < s.level - 1; i++) if (!s.stars[i]) s.stars[i] = 1;
  } catch {
    /* corrupt save: start fresh */
  }
  return s;
}

export function loadSave(): Save {
  try {
    return parseSave(localStorage.getItem(KEY));
  } catch {
    return defaultSave();
  }
}

export function writeSave(s: Save): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}
