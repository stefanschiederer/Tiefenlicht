/**
 * Adaptive, fully procedural music: layered WebAudio voices whose gains follow an intensity value
 * (0 = calm exploration, 1 = full battle). A short victory / defeat motif plays on level end.
 */
export class Music {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private layers: { gain: GainNode; min: number; max: number }[] = [];
  private intensity = 0;
  private target = 0;
  private started = false;
  private seq: ReturnType<typeof setInterval> | null = null;
  private stepIndex = 0;
  volume = 0.5;
  enabled = true;

  attach(ctx: AudioContext, master: AudioNode): void {
    if (this.ctx) return;
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = this.enabled ? this.volume : 0;
    this.out.connect(master);
  }

  /** Builds the drone, pad and pulse layers (called once after a user gesture). */
  start(): void {
    const c = this.ctx,
      out = this.out;
    if (!c || !out || this.started) return;
    this.started = true;
    const layer = (min: number, max: number): GainNode => {
      const g = c.createGain();
      g.gain.value = 0;
      g.connect(out);
      this.layers.push({ gain: g, min, max });
      return g;
    };
    // 1) Deep drone (always audible): two detuned sines with slow tremolo
    const drone = layer(0, 1);
    for (const [f, type, v] of [
      [55, 'sine', 0.2],
      [82.4, 'triangle', 0.08],
      [110.5, 'sine', 0.05],
    ] as [number, OscillatorType, number][]) {
      const o = c.createOscillator(),
        g = c.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.value = v;
      o.connect(g);
      g.connect(drone);
      o.start();
    }
    const lfo = c.createOscillator(),
      lg = c.createGain();
    lfo.frequency.value = 0.07;
    lg.gain.value = 0.35;
    lfo.connect(lg);
    lg.connect(drone.gain);
    lfo.start();
    // 2) Pad chord (calm): filtered saws on a minor 9th, breathes slowly
    const pad = layer(0, 0.6);
    const padFilter = c.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 520;
    padFilter.Q.value = 0.7;
    padFilter.connect(pad);
    for (const f of [164.8, 196, 246.9, 369.9]) {
      const o = c.createOscillator(),
        g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 12;
      g.gain.value = 0.035;
      o.connect(g);
      g.connect(padFilter);
      o.start();
    }
    const padLfo = c.createOscillator(),
      padLg = c.createGain();
    padLfo.frequency.value = 0.05;
    padLg.gain.value = 180;
    padLfo.connect(padLg);
    padLg.connect(padFilter.frequency);
    padLfo.start();
    // 3) Pulse (battle): sequenced plucks driven by a timer, faster and brighter with intensity
    const pulse = layer(0.35, 1);
    const pulseFilter = c.createBiquadFilter();
    pulseFilter.type = 'lowpass';
    pulseFilter.frequency.value = 900;
    pulseFilter.connect(pulse);
    const notes = [110, 130.8, 146.8, 110, 164.8, 130.8, 110, 98];
    const tick = () => {
      if (!this.ctx || this.intensity < 0.2) return;
      const f = notes[this.stepIndex % notes.length] as number;
      this.stepIndex++;
      const o = c.createOscillator(),
        g = c.createGain();
      o.type = 'square';
      o.frequency.value = f * (this.stepIndex % 16 === 0 ? 2 : 1);
      const t = c.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g);
      g.connect(pulseFilter);
      o.start(t);
      o.stop(t + 0.25);
      pulseFilter.frequency.setTargetAtTime(700 + this.intensity * 1600, t, 0.2);
    };
    this.seq = setInterval(tick, 250);
    // 4) Tension layer (high intensity): noisy high shimmer
    const shimmer = layer(0.7, 1);
    const len = c.sampleRate * 2,
      buf = c.createBuffer(1, len, c.sampleRate),
      d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const n = c.createBufferSource();
    n.buffer = buf;
    n.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 6;
    const ng = c.createGain();
    ng.gain.value = 0.05;
    n.connect(bp);
    bp.connect(ng);
    ng.connect(shimmer);
    n.start();
    const shLfo = c.createOscillator(),
      shLg = c.createGain();
    shLfo.frequency.value = 0.9;
    shLg.gain.value = 0.03;
    shLfo.connect(shLg);
    shLg.connect(ng.gain);
    shLfo.start();
    this.apply(true);
  }

  /** 0 = calm, 1 = full battle. Smoothed internally. */
  setIntensity(v: number): void {
    this.target = Math.max(0, Math.min(1, v));
  }
  /** Call every frame with wall-clock dt. */
  update(dt: number): void {
    if (!this.started) return;
    const k = 1 - Math.exp(-dt * 0.8);
    this.intensity += (this.target - this.intensity) * k;
    this.apply(false);
  }
  private apply(immediate: boolean): void {
    const c = this.ctx;
    if (!c) return;
    for (const l of this.layers) {
      const x = (this.intensity - l.min) / Math.max(0.0001, l.max - l.min);
      const g = l.min === 0 && l.max === 1 ? 1 : Math.max(0, Math.min(1, x));
      if (immediate) l.gain.gain.value = g;
      else l.gain.gain.setTargetAtTime(g, c.currentTime, 0.4);
    }
  }
  setVolume(v: number): void {
    this.volume = v;
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(this.enabled ? v : 0, this.ctx.currentTime, 0.1);
  }
  setEnabled(on: boolean): void {
    this.enabled = on;
    this.setVolume(this.volume);
  }
  /** Short end-of-level motif played over the layers. */
  motif(won: boolean): void {
    const c = this.ctx,
      out = this.out;
    if (!c || !out) return;
    const seq = won ? [261.6, 329.6, 392, 523.3, 659.3, 784] : [392, 349.2, 311.1, 261.6, 233.1];
    seq.forEach((f, i) => {
      const o = c.createOscillator(),
        g = c.createGain(),
        t = c.currentTime + i * (won ? 0.13 : 0.26);
      o.type = won ? 'triangle' : 'sawtooth';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(won ? 0.16 : 0.08, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (won ? 0.6 : 0.9));
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + 1);
    });
    this.setIntensity(0);
  }
  destroy(): void {
    if (this.seq) clearInterval(this.seq);
  }
}
