import { describe, expect, it } from 'vitest';
import {
  SAVE_KEY,
  SAVE_VERSION,
  defaultSave,
  exportCode,
  importCode,
  migrate,
  readSave,
  writeSave,
  type StorageLike,
} from '@/app/save';

function memoryStore(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('save migration', () => {
  it('migrates a prototype (v0) save to the current version', () => {
    const v0 = {
      stars: { 0: 3, 1: 2 },
      endlessBest: 4,
      points: 7,
      spent: ['prod1', 'speed'],
      sound: false,
      difficulty: 'schwer',
    };
    const s = migrate(v0, 1000);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.stars).toEqual({ '0': 3, '1': 2 });
    expect(s.endlessBest).toBe(4);
    expect(s.points).toBe(7);
    expect(s.spent).toEqual(['prod1', 'speed']);
    expect(s.sound).toBe(false);
    expect(s.difficulty).toBe('schwer');
    expect(s.autoFs).toBe(true);
    expect(s.music).toBe(0.5);
    expect(s.createdAt).toBe(1000);
  });

  it('sanitises garbage', () => {
    const s = migrate({
      stars: { 0: 9, 1: -2, 2: 'x' },
      endlessBest: 'a',
      points: -5,
      spent: [1, 'ok'],
      difficulty: 'nope',
    });
    expect(s.stars).toEqual({ '0': 3 });
    expect(s.endlessBest).toBe(0);
    expect(s.points).toBe(0);
    expect(s.spent).toEqual(['ok']);
    expect(s.difficulty).toBe('normal');
  });

  it('returns defaults for non-objects', () => {
    expect(migrate(null).version).toBe(SAVE_VERSION);
    expect(migrate('x').points).toBe(0);
  });

  it('keeps v1-only fields and clamps volumes', () => {
    const s = migrate({ ...defaultSave(5), music: 3, sfx: -1, createdAt: 42 });
    expect(s.music).toBe(1);
    expect(s.sfx).toBe(0);
    expect(s.createdAt).toBe(42);
  });
});

describe('storage round trip', () => {
  it('writes and reads through a storage-like object', () => {
    const store = memoryStore();
    const s = { ...defaultSave(1), points: 3, stars: { '2': 1 } };
    expect(writeSave(s, store)).toBe(true);
    expect(store.data.has(SAVE_KEY)).toBe(true);
    const r = readSave(store);
    expect(r.points).toBe(3);
    expect(r.stars).toEqual({ '2': 1 });
    expect(r.version).toBe(SAVE_VERSION);
  });

  it('falls back to defaults on corrupt JSON or missing storage', () => {
    const store = memoryStore();
    store.setItem(SAVE_KEY, '{not json');
    expect(readSave(store).points).toBe(0);
    expect(readSave(null).points).toBe(0);
    expect(writeSave(defaultSave(), null)).toBe(false);
  });
});

describe('export / import code', () => {
  it('round-trips including umlauts and is compatible with the prototype format', () => {
    const s = { ...defaultSave(1), points: 2, spent: ['ab2'], stars: { '0': 3 } };
    const code = exportCode(s);
    expect(code).toMatch(/^[A-Za-z0-9+/=]+$/);
    const back = importCode(code);
    expect(back?.points).toBe(2);
    expect(back?.spent).toEqual(['ab2']);
    // Prototype format: btoa(unescape(encodeURIComponent(JSON)))
    const proto = btoa(
      unescape(encodeURIComponent(JSON.stringify({ stars: { 1: 2 }, points: 1, spent: [], endlessBest: 0 }))),
    );
    expect(importCode(proto)?.stars).toEqual({ '1': 2 });
  });

  it('rejects invalid codes', () => {
    expect(importCode('nope')).toBeNull();
    expect(importCode(btoa('{"points":1}'))).toBeNull();
  });
});
