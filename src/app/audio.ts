/** Tiny WebAudio sound effects (no audio files). */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSound(on: boolean): void {
  enabled = on;
}

/** Must be called from a user gesture once (iOS unlocks audio only then). */
export function unlockAudio(): void {
  if (ctx) {
    void ctx.resume();
    return;
  }
  try {
    ctx = new AudioContext();
  } catch {
    ctx = null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, delay = 0): void {
  if (!enabled || !ctx) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

let lastHit = 0;
export const sfx = {
  line: () => tone(520, 0.12, 'triangle', 0.18, 260),
  cut: () => tone(900, 0.1, 'square', 0.06, -500),
  error: () => tone(160, 0.15, 'square', 0.06),
  capture: (mine: boolean) => {
    tone(mine ? 440 : 300, 0.12, 'triangle', 0.2, mine ? 220 : -80);
    tone(mine ? 660 : 220, 0.16, 'triangle', 0.16, mine ? 330 : -60, 0.08);
  },
  hit: () => {
    const now = performance.now();
    if (now - lastHit < 70) return;
    lastHit = now;
    tone(180 + Math.random() * 60, 0.05, 'sine', 0.05, -60);
  },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.2, 0, i * 0.12)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.18, -20, i * 0.18)),
  tap: () => tone(700, 0.05, 'sine', 0.1),
};
