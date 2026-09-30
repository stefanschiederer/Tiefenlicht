import { NEUTRAL } from './config';
import { rng } from './geom';
import { addLine, checkLine, dropLine, levelOf, lineLimit, linesFrom, tower } from './sim';
import type { GameState, Tower } from './state';

/**
 * Enemy commander (one per enemy colour). Every few seconds it looks at each of its towers: it cuts
 * hopeless or finished lines, supports towers under attack and attacks the weakest reachable
 * target it can beat, preferring close ones.
 */
export class Enemy {
  private timer: number;
  private rand: () => number;
  /** Target troop count seen at the last decision, per attack line (to spot stalemates). */
  private seen = new Map<number, number>();

  constructor(
    readonly owner: number,
    private readonly interval: number,
    delay: number,
    seed: number,
  ) {
    this.timer = delay;
    this.rand = rng(seed * 31 + owner);
  }

  update(s: GameState, dt: number): void {
    if (s.result) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.interval * (0.8 + this.rand() * 0.4);
    this.think(s);
  }

  private incoming(s: GameState, t: Tower): number {
    return s.troops.filter((u) => u.dst === t.id && u.owner !== t.owner).length;
  }

  think(s: GameState): void {
    const mine = s.towers.filter((t) => t.owner === this.owner);
    for (const t of mine) {
      // cut lines that feed an own tower which no longer needs help, or attack a far stronger target
      for (const l of linesFrom(s, t.id)) {
        const d = tower(s, l.dst);
        const done = d.owner === this.owner && this.incoming(s, d) === 0 && d.troops > 15;
        const hopeless = d.owner !== this.owner && d.troops > t.troops + 25;
        // an attack that makes no progress: pull back, gather troops, strike again later
        const last = this.seen.get(l.id);
        const stuck = d.owner !== this.owner && last !== undefined && d.troops >= last - 0.5;
        this.seen.set(l.id, d.troops);
        if (done || hopeless || (stuck && this.rand() < 0.7)) {
          dropLine(s, l);
          this.seen.delete(l.id);
        }
      }
    }
    // one or two new lines per decision, like a human player
    let budget = 1 + (this.rand() < 0.35 ? 1 : 0);
    const order = [...mine].sort((a, b) => b.troops - a.troops);
    for (const t of order) {
      if (budget <= 0) break;
      if (linesFrom(s, t.id).length >= lineLimit(t) || t.troops < 6) continue;
      const target = this.pick(s, t);
      if (target && addLine(s, t.id, target.id, this.owner) === 'ok') budget--;
    }
  }

  private pick(s: GameState, from: Tower): Tower | null {
    let best: Tower | null = null,
      bestScore = -Infinity;
    for (const d of s.towers) {
      if (checkLine(s, from.id, d.id, this.owner) !== 'ok') continue;
      const dist = Math.hypot(d.x - from.x, d.y - from.y);
      let score: number;
      if (d.owner === this.owner) {
        // support an own tower that is being attacked and weaker than the attack
        const threat = this.incoming(s, d);
        if (threat === 0 || d.troops > threat + 5) continue;
        score = 40 + threat - d.troops;
      } else {
        const margin = from.troops - d.troops;
        if (margin < 2 && !(d.owner !== NEUTRAL && levelOf(from) >= 2)) continue;
        score = margin * 0.8 - dist / 60 + (d.owner === NEUTRAL ? 4 : 8) + this.rand() * 4;
      }
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best;
  }
}

export function enemiesFor(s: GameState): Enemy[] {
  const owners = [...new Set(s.towers.map((t) => t.owner).filter((o) => o >= 2))];
  return owners.map((o) => new Enemy(o, s.def.aiInterval, s.def.aiDelay, s.def.n));
}
