export interface Save {
  /** Next level to play (1-based). */
  level: number;
  sound: boolean;
}

const KEY = 'tiefenlicht-towerwar-v1';

export function loadSave(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<Save>;
      return {
        level: Math.max(1, Math.floor(Number(d.level) || 1)),
        sound: d.sound !== false,
      };
    }
  } catch {
    /* storage unavailable */
  }
  return { level: 1, sound: true };
}

export function writeSave(s: Save): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}
