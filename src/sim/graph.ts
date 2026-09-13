export type Edge = [number, number];

export function buildAdjacency(n: number, edges: readonly Edge[]): number[][] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    adj[a]?.push(b);
    adj[b]?.push(a);
  }
  return adj;
}

/** Shortest path (in hops) from `from` to `to`; intermediate nodes must satisfy `allow`. Returns node ids including both ends. */
export function bfsPath(
  adj: readonly number[][],
  from: number,
  to: number,
  allow?: (id: number) => boolean,
): number[] | null {
  const n = adj.length;
  const prev = new Array<number>(n).fill(-1);
  const seen = new Array<boolean>(n).fill(false);
  seen[from] = true;
  const q = [from];
  let head = 0;
  while (head < q.length) {
    const v = q[head++] as number;
    if (v === to) break;
    for (const w of adj[v] ?? []) {
      if (seen[w]) continue;
      if (w !== to && allow && !allow(w)) continue;
      seen[w] = true;
      prev[w] = v;
      q.push(w);
    }
  }
  if (!seen[to]) return null;
  const path: number[] = [];
  for (let v = to; v !== -1; v = prev[v] as number) path.unshift(v);
  return path;
}

export function isConnected(n: number, edges: readonly Edge[]): boolean {
  if (n === 0) return true;
  const adj = buildAdjacency(n, edges);
  const seen = new Array<boolean>(n).fill(false);
  seen[0] = true;
  const st = [0];
  let c = 1;
  while (st.length) {
    const v = st.pop() as number;
    for (const w of adj[v] ?? []) {
      if (!seen[w]) {
        seen[w] = true;
        c++;
        st.push(w);
      }
    }
  }
  return c === n;
}

export function hopDistances(n: number, edges: readonly Edge[], s: number): number[] {
  const adj = buildAdjacency(n, edges);
  const d = new Array<number>(n).fill(Infinity);
  d[s] = 0;
  const q = [s];
  let head = 0;
  while (head < q.length) {
    const v = q[head++] as number;
    for (const w of adj[v] ?? []) {
      if (d[w] === Infinity) {
        d[w] = (d[v] as number) + 1;
        q.push(w);
      }
    }
  }
  return d;
}

/** True if segment AB passes within r of C. */
export function segmentHitsCircle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  r: number,
): boolean {
  const dx = bx - ax,
    dy = by - ay,
    l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / l2));
  return Math.hypot(ax + dx * t - cx, ay + dy * t - cy) < r;
}
