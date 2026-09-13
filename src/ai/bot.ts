import { TYPES, UNITS } from '@/data';
import { bfsPath } from '@/sim/graph';
import { addRoute, doConvert, doUpgrade, launch } from '@/sim/actions';
import type { GameState, SimNode } from '@/sim/state';
import { capOf, convertCost, defOf, incoming, rateOf, upgradeCost } from '@/sim/stats';

/** All non-own nodes reachable through own territory from `src`, with the path (excluding src). */
export function frontier(s: GameState, src: SimNode, F: number): Map<number, number[]> {
  const paths = new Map<number, number[]>();
  const prev = new Map<number, number>([[src.id, -1]]);
  const q = [src.id];
  let head = 0;
  while (head < q.length) {
    const v = q[head++] as number;
    for (const w of s.adj[v] ?? []) {
      const m = s.nodes[w] as SimNode;
      if (m.owner === F) {
        if (!prev.has(w)) {
          prev.set(w, v);
          q.push(w);
        }
      } else if (!paths.has(w)) {
        const p = [w];
        for (let u = v; u !== src.id; u = prev.get(u) as number) p.unshift(u);
        paths.set(w, p);
      }
    }
  }
  return paths;
}

/** One AI decision for faction F. Same heuristic as the prototype, with the state's RNG. */
export function aiAct(s: GameState, F: number): void {
  const rng = s.rng;
  const mine = s.nodes.filter((n) => n.owner === F);
  if (!mine.length) return;
  const aiUpg = s.demo || (s.def.aiUpgrades ?? true);
  // Supply lines: drop routes whose target is ours and no longer at the front.
  for (const n of mine) {
    if (!n.routes.length) continue;
    n.routes = n.routes.filter((r) => {
      const t = s.nodes[r[r.length - 1] as number] as SimNode;
      return t.owner !== F || (s.adj[t.id] ?? []).some((j) => (s.nodes[j] as SimNode).owner !== F);
    });
  }
  // Reinforce threatened nodes
  for (const n of mine) {
    const threat = incoming(s, n.id, (g) => g.owner !== F);
    if (threat > 3 && threat > n.units * defOf(s, n) * 0.9) {
      const helper = (s.adj[n.id] ?? [])
        .map((j) => s.nodes[j] as SimNode)
        .filter((m) => m.owner === F && m.units >= 6)
        .sort((a, b) => b.units - a.units)[0];
      if (helper) {
        launch(s, helper, [n.id], Math.floor(helper.units * 0.6));
        return;
      }
    }
  }
  // Upgrade when rich
  if (aiUpg && rng.next() < 0.45) {
    const cand = mine
      .filter((n) => n.level < 3 && n.units >= upgradeCost(s, n) + 8 && n.units >= capOf(s, n) * 0.65)
      .sort((a, b) => TYPES[b.type].value - TYPES[a.type].value)[0];
    if (cand) {
      doUpgrade(s, cand);
      return;
    }
  }
  // Convert: a rich frontline nest becomes a tower or bastion
  if (aiUpg && s.def.types.includes('waechter') && rng.next() < 0.12) {
    const cand = mine.filter(
      (n) =>
        n.type === 'nest' &&
        n.units >= convertCost(s, n) + 10 &&
        (s.adj[n.id] ?? []).some(
          (j) => (s.nodes[j] as SimNode).owner !== F && (s.nodes[j] as SimNode).owner !== 0,
        ),
    )[0];
    if (
      cand &&
      !(s.adj[cand.id] ?? []).some(
        (j) => (s.nodes[j] as SimNode).owner === F && (s.nodes[j] as SimNode).type === 'waechter',
      )
    ) {
      doConvert(s, cand, rng.next() < 0.6 ? 'waechter' : 'bastion');
      return;
    }
  }
  // Attack the most rewarding reachable target
  let best: { src: SimNode; path: number[]; avail: number } | null = null,
    bs = -Infinity;
  const sources = mine
    .filter((n) => n.units >= 8)
    .sort((a, b) => b.units - a.units)
    .slice(0, 4);
  for (const src of sources) {
    const u = UNITS[TYPES[src.type].unit],
      avail = Math.floor(src.units * 0.75),
      availPow = avail * u.str;
    for (const [tid, path] of frontier(s, src, F)) {
      const t = s.nodes[tid] as SimNode,
        hops = path.length,
        def = defOf(s, t);
      const grow = t.owner > 0 ? (rateOf(s, t) * hops * 1.6) / u.speed : 0;
      const defenders =
        (t.units + grow) * def +
        incoming(s, tid, (g) => g.owner === t.owner) -
        incoming(s, tid, (g) => g.owner === F);
      if (availPow <= defenders * 1.15 + 1) continue;
      const hostileTower = t.type === 'waechter' && t.owner > 0 ? 8 : 0;
      const score =
        TYPES[t.type].value +
        t.level * 6 +
        (t.owner === 1 ? 10 : 0) +
        (t.owner === 0 ? 5 : 0) -
        defenders * 0.7 -
        hops * 7 -
        hostileTower +
        rng.next() * 6;
      if (score > bs) {
        bs = score;
        best = { src, path, avail };
      }
    }
  }
  if (best) {
    launch(s, best.src, best.path, best.avail);
    // Keep the attack as one visible supply line (Tower-War style bots draw a single line).
    if (aiUpg) addRoute(best.src, best.path, 1);
    return;
  }
  // Otherwise shift surplus from a full node to the weakest frontline node
  const rich = mine.filter((n) => n.units >= capOf(s, n) * 0.8).sort((a, b) => b.units - a.units)[0];
  if (!rich) return;
  const front = mine
    .filter((n) => n !== rich && (s.adj[n.id] ?? []).some((j) => (s.nodes[j] as SimNode).owner !== F))
    .sort((a, b) => a.units - b.units)[0];
  if (!front) return;
  const p = bfsPath(s.adj, rich.id, front.id, (id) => (s.nodes[id] as SimNode).owner === F);
  if (p && p.length > 1) launch(s, rich, p.slice(1), Math.floor(rich.units * 0.5));
}
