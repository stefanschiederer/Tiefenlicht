import { PLAYER } from '@/data';
import type { GameState, SimEvent } from '@/sim/state';

export type SoundName =
  | 'click'
  | 'send'
  | 'route'
  | 'cut'
  | 'capture'
  | 'lost'
  | 'upgrade'
  | 'zap'
  | 'clash'
  | 'ability'
  | 'frost'
  | 'win'
  | 'lose'
  | 'error';

/** Synthetic WebAudio sound effects and ambient drone. No audio files. */
export class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private last: Partial<Record<SoundName, number>> = {};
  enabled = true;
  volume = 0.5;

  init(): void {
    if (this.ctx) return;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? this.volume : 0;
      this.master.connect(this.ctx.destination);
      this.ambient();
    } catch {
      /* no audio */
    }
  }
  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }
  setEnabled(on: boolean): void {
    this.enabled = on;
    if (this.master && this.ctx)
      this.master.gain.setTargetAtTime(on ? this.volume : 0, this.ctx.currentTime, 0.05);
  }
  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide?: number): void {
    const c = this.ctx;
    if (!c || !this.master) return;
    const o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, c.currentTime + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(vol, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(c.currentTime + dur + 0.02);
  }
  private noise(dur: number, vol: number, freq: number): void {
    const c = this.ctx;
    if (!c || !this.master) return;
    const len = Math.floor(c.sampleRate * dur),
      buf = c.createBuffer(1, len, c.sampleRate),
      d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 1;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start();
  }
  play(name: SoundName, minGap?: number): void {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const last = this.last[name];
    if (minGap && last !== undefined && t - last < minGap) return;
    this.last[name] = t;
    const later = (fn: () => void, ms: number) => setTimeout(fn, ms);
    switch (name) {
      case 'click':
        this.tone(880, 0.06, 'sine', 0.1);
        break;
      case 'send':
        this.noise(0.18, 0.07, 900);
        this.tone(520, 0.12, 'sine', 0.05, 780);
        break;
      case 'route':
        this.tone(660, 0.08, 'sine', 0.08);
        later(() => this.tone(990, 0.1, 'sine', 0.08), 60);
        break;
      case 'cut':
        this.noise(0.1, 0.08, 3200);
        this.tone(740, 0.12, 'triangle', 0.07, 240);
        break;
      case 'capture':
        this.tone(523, 0.18, 'sine', 0.16);
        later(() => this.tone(784, 0.3, 'sine', 0.16), 90);
        later(() => this.tone(1046, 0.4, 'triangle', 0.1), 180);
        break;
      case 'lost':
        this.tone(220, 0.5, 'sawtooth', 0.1, 110);
        break;
      case 'upgrade':
        [440, 554, 659, 880].forEach((f, i) => later(() => this.tone(f, 0.16, 'triangle', 0.12), i * 70));
        break;
      case 'zap':
        this.noise(0.08, 0.08, 2400);
        break;
      case 'clash':
        this.noise(0.12, 0.06, 1600);
        break;
      case 'ability':
        this.tone(300, 0.5, 'sine', 0.14, 1200);
        this.noise(0.4, 0.05, 600);
        break;
      case 'frost':
        this.tone(1400, 0.6, 'sine', 0.1, 300);
        this.noise(0.5, 0.05, 3000);
        break;
      case 'win':
        [523, 659, 784, 1046, 1318].forEach((f, i) =>
          later(() => this.tone(f, 0.5, 'triangle', 0.14), i * 120),
        );
        break;
      case 'lose':
        [440, 392, 349, 294].forEach((f, i) => later(() => this.tone(f, 0.6, 'sawtooth', 0.08), i * 220));
        break;
      case 'error':
        this.tone(200, 0.15, 'square', 0.06);
        break;
    }
  }
  private ambient(): void {
    const c = this.ctx;
    if (!c || !this.master) return;
    const g = c.createGain();
    g.gain.value = 0.05;
    for (const [f, type] of [
      [55, 'sine'],
      [82.5, 'triangle'],
    ] as [number, OscillatorType][]) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.connect(g);
      o.start();
    }
    const lfo = c.createOscillator(),
      lg = c.createGain();
    lfo.frequency.value = 0.08;
    lg.gain.value = 0.03;
    lfo.connect(lg);
    lg.connect(g.gain);
    lfo.start();
    g.connect(this.master);
    const len = c.sampleRate * 4,
      buf = c.createBuffer(1, len, c.sampleRate),
      d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const n = c.createBufferSource();
    n.buffer = buf;
    n.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 220;
    const ng = c.createGain();
    ng.gain.value = 0.04;
    n.connect(f);
    f.connect(ng);
    ng.connect(this.master);
    n.start();
  }

  /** Maps simulation events to sounds (nothing in demo mode). */
  onEvent(e: SimEvent, state: GameState): void {
    if (state.demo) return;
    switch (e.type) {
      case 'launch':
        if (e.manual) this.play('send', 0.15);
        break;
      case 'capture':
        if (e.by === PLAYER) this.play('capture', 0.2);
        else if (e.prev === PLAYER) this.play('lost', 0.3);
        break;
      case 'clash':
        this.play('clash', 0.25);
        break;
      case 'zap':
        this.play('zap', 0.1);
        break;
      case 'cut':
        this.play('cut', 0.1);
        break;
      case 'upgrade':
      case 'convert':
        if (e.owner === PLAYER) this.play('upgrade');
        break;
      case 'ability':
        this.play(e.id === 'frost' ? 'frost' : 'ability');
        break;
      case 'finished':
        this.play(e.won ? 'win' : 'lose');
        break;
    }
  }
}
