/**
 * Versioned save game stored in localStorage.
 *
 * Version history:
 *   0 – prototype (no `version` field): { stars, endlessBest, points, spent, sound, difficulty, autoFs? }
 *   1 – adds `version`, `music`/`sfx` volumes, `createdAt`/`updatedAt`
 */
export const SAVE_KEY = 'tiefenlicht:save';
export const SAVE_VERSION = 1;

export type Difficulty = 'leicht' | 'normal' | 'schwer';

export interface SaveV1 {
  version: 1;
  stars: Record<string, number>;
  endlessBest: number;
  points: number;
  spent: string[];
  sound: boolean;
  music: number;
  sfx: number;
  difficulty: Difficulty;
  autoFs: boolean;
  createdAt: number;
  updatedAt: number;
}

export type SaveGame = SaveV1;

export function defaultSave(now = Date.now()): SaveGame {
  return {
    version: SAVE_VERSION,
    stars: {},
    endlessBest: 0,
    points: 0,
    spent: [],
    sound: true,
    music: 0.5,
    sfx: 0.5,
    difficulty: 'normal',
    autoFs: true,
    createdAt: now,
    updatedAt: now,
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const nonNegInt = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : fallback;
const DIFFICULTIES: readonly Difficulty[] = ['leicht', 'normal', 'schwer'];
const isDifficulty = (v: unknown): v is Difficulty =>
  typeof v === 'string' && (DIFFICULTIES as readonly string[]).includes(v);

function migrateV0(raw: Record<string, unknown>, now: number): SaveGame {
  const base = defaultSave(now);
  const stars: Record<string, number> = {};
  if (isObject(raw.stars)) {
    for (const [k, v] of Object.entries(raw.stars)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) stars[k] = Math.min(3, Math.max(1, Math.floor(n)));
    }
  }
  return {
    ...base,
    stars,
    endlessBest: nonNegInt(raw.endlessBest),
    points: nonNegInt(raw.points),
    spent: Array.isArray(raw.spent) ? raw.spent.filter((s): s is string => typeof s === 'string') : [],
    sound: raw.sound !== false,
    difficulty: isDifficulty(raw.difficulty) ? raw.difficulty : 'normal',
    autoFs: raw.autoFs !== false,
  };
}

/** Migrates any known save shape to the current version. Unknown input yields a fresh save. */
export function migrate(raw: unknown, now = Date.now()): SaveGame {
  if (!isObject(raw)) return defaultSave(now);
  const version = typeof raw.version === 'number' ? raw.version : 0;
  if (version === 0) return migrateV0(raw, now);
  if (version === 1) {
    // Re-run the v0 mapper for field sanitising, then keep v1-only fields.
    const v1 = migrateV0(raw, now);
    const music = Number(raw.music),
      sfx = Number(raw.sfx);
    return {
      ...v1,
      music: Number.isFinite(music) ? Math.min(1, Math.max(0, music)) : v1.music,
      sfx: Number.isFinite(sfx) ? Math.min(1, Math.max(0, sfx)) : v1.sfx,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
      updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
    };
  }
  // Newer than we know: keep what we understand.
  return migrateV0(raw, now);
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function storage(): StorageLike | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* access denied (private mode etc.) */
  }
  return null;
}

export function readSave(store: StorageLike | null = storage()): SaveGame {
  if (!store) return defaultSave();
  try {
    const txt = store.getItem(SAVE_KEY);
    if (!txt) return defaultSave();
    return migrate(JSON.parse(txt));
  } catch {
    return defaultSave();
  }
}

export function writeSave(save: SaveGame, store: StorageLike | null = storage()): boolean {
  if (!store) return false;
  try {
    const out: SaveGame = { ...save, version: SAVE_VERSION, updatedAt: Date.now() };
    store.setItem(SAVE_KEY, JSON.stringify(out));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(store: StorageLike | null = storage()): void {
  try {
    store?.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

/** Base64 of UTF-8 JSON; compatible with the prototype's export format. */
export function exportCode(save: SaveGame): string {
  const json = JSON.stringify(save);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function importCode(code: string): SaveGame | null {
  try {
    const bin = atob(code.trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const obj: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!isObject(obj) || !isObject(obj.stars)) return null;
    return migrate(obj);
  } catch {
    return null;
  }
}
