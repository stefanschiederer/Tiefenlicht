import { ALL_TYPES, PLAYER, TYPES, type HandMap, type LevelDef } from '@/data';
import { buildLevel } from '@/sim/level';
import type { GameState } from '@/sim/state';
import { segmentDistance } from '@/sim/actions';

export type EditorTool =
  'node' | 'edge' | 'rock' | 'barrier' | 'mine' | 'owner' | 'type' | 'units' | 'delete';
export const EDITOR_TOOLS: { id: EditorTool; label: string; hint: string }[] = [
  { id: 'node', label: 'Knoten', hint: 'Tippen setzt einen Knoten, Ziehen verschiebt ihn' },
  { id: 'edge', label: 'Kante', hint: 'Von Knoten zu Knoten ziehen verbindet oder trennt' },
  { id: 'rock', label: 'Fels', hint: 'Tippen setzt einen Felsen, Tippen auf Fels entfernt ihn' },
  { id: 'barrier', label: 'Barriere', hint: 'Tippen auf eine Kante setzt oder entfernt eine Riffbarriere' },
  { id: 'mine', label: 'Mine', hint: 'Tippen auf eine Kante setzt oder entfernt eine Mine' },
  {
    id: 'owner',
    label: 'Besitzer',
    hint: 'Tippen wechselt Neutral → Spieler → Gegner 1 → Gegner 2 → Gegner 3',
  },
  { id: 'type', label: 'Art', hint: 'Tippen wechselt die Knotenart' },
  { id: 'units', label: 'Einheiten', hint: 'Tippen +4 Einheiten, Rechtsklick oder Shift −4' },
  { id: 'delete', label: 'Löschen', hint: 'Tippen entfernt Knoten oder Fels' },
];
export const EDITOR_KEY = 'tiefenlicht:editor';

const EMPTY: HandMap = { nodes: [], edges: [], rocks: [], barriers: [], mines: [] };

/** Level definition used to preview and play-test an editor map. */
export function customDef(map: HandMap, name = 'Eigene Karte'): LevelDef {
  const enemies = new Set(map.nodes.map((n) => n.owner ?? 0).filter((o) => o > 1)).size;
  return {
    ch: 0,
    name,
    nodes: map.nodes.length,
    enemies,
    types: ALL_TYPES,
    ai: 2.2,
    obst: 0,
    seed: 7,
    gar: 20,
    prod: 1,
    par: 180,
    text: 'Eine selbst gebaute Karte.',
    map,
  };
}

/** Editor model: edits a HandMap and rebuilds a preview GameState after each change. */
export class Editor {
  map: HandMap = structuredClone(EMPTY);
  tool: EditorTool = 'node';
  state: GameState;
  private dragNode: number | null = null;
  private edgeFrom: number | null = null;
  onChange: (() => void) | null = null;

  constructor() {
    try {
      const raw = localStorage.getItem(EDITOR_KEY);
      if (raw) this.map = this.sanitize(JSON.parse(raw) as HandMap);
    } catch {
      /* fresh map */
    }
    this.state = this.rebuild();
  }

  private sanitize(m: Partial<HandMap>): HandMap {
    const nodes = Array.isArray(m.nodes)
      ? m.nodes.filter((n) => typeof n.x === 'number' && typeof n.y === 'number')
      : [];
    const ok = (i: number) => Number.isInteger(i) && i >= 0 && i < nodes.length;
    const edges = (Array.isArray(m.edges) ? m.edges : []).filter(
      (e) => Array.isArray(e) && ok(e[0]) && ok(e[1]) && e[0] !== e[1],
    );
    const edgeSet = new Set(edges.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`));
    const hasEdge = (e: [number, number]) => edgeSet.has(`${Math.min(e[0], e[1])}-${Math.max(e[0], e[1])}`);
    return {
      nodes,
      edges,
      rocks: (m.rocks ?? []).filter((r) => typeof r.x === 'number' && typeof r.r === 'number'),
      barriers: (m.barriers ?? []).filter((b) => Array.isArray(b.edge) && hasEdge(b.edge)),
      mines: (m.mines ?? []).filter((x) => Array.isArray(x.edge) && hasEdge(x.edge)),
    };
  }

  /** Rebuilds the preview state (neutral sim, never stepped). */
  rebuild(): GameState {
    let s: GameState;
    if (this.map.nodes.length) s = buildLevel(customDef(this.map), { demo: false });
    else s = buildLevel(customDef({ ...EMPTY, nodes: [{ x: -1000, y: -1000 }] }), { demo: false });
    if (!this.map.nodes.length) s.nodes = [];
    this.state = s;
    this.persist();
    this.onChange?.();
    return s;
  }
  persist(): void {
    try {
      localStorage.setItem(EDITOR_KEY, JSON.stringify(this.map));
    } catch {
      /* ignore */
    }
  }
  export(): string {
    return JSON.stringify(this.map);
  }
  import(json: string): boolean {
    try {
      this.map = this.sanitize(JSON.parse(json) as HandMap);
      this.rebuild();
      return true;
    } catch {
      return false;
    }
  }
  clear(): void {
    this.map = structuredClone(EMPTY);
    this.rebuild();
  }
  /** Problems that would make the map unplayable. */
  validate(): string[] {
    const out: string[] = [];
    const owners = this.map.nodes.map((n) => n.owner ?? 0);
    if (!owners.includes(PLAYER)) out.push('Kein Spielerknoten (Besitzer: Spieler).');
    if (!owners.some((o) => o > 1)) out.push('Kein Gegnerknoten.');
    if (this.map.nodes.length < 3) out.push('Mindestens drei Knoten.');
    return out;
  }

  // ---- hit tests (world coordinates) ----
  nodeAt(x: number, y: number, r = 34): number | null {
    let best = null,
      bd = r;
    this.map.nodes.forEach((n, i) => {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }
  rockAt(x: number, y: number): number | null {
    const rocks = this.map.rocks ?? [];
    for (let i = rocks.length - 1; i >= 0; i--) {
      const r = rocks[i] as { x: number; y: number; r: number };
      if (Math.hypot(r.x - x, r.y - y) <= r.r) return i;
    }
    return null;
  }
  edgeAt(x: number, y: number, tol = 18): [number, number] | null {
    let best: [number, number] | null = null,
      bd = tol;
    for (const e of this.map.edges) {
      const a = this.map.nodes[e[0]],
        b = this.map.nodes[e[1]];
      if (!a || !b) continue;
      const d = segmentDistance(x, y, x, y, a.x, a.y, b.x, b.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  // ---- pointer actions ----
  down(x: number, y: number, alt: boolean): void {
    const hit = this.nodeAt(x, y);
    switch (this.tool) {
      case 'node':
        if (hit !== null) this.dragNode = hit;
        else {
          this.map.nodes.push({ x: Math.round(x), y: Math.round(y) });
          this.rebuild();
        }
        break;
      case 'edge':
        this.edgeFrom = hit;
        break;
      case 'rock': {
        const ri = this.rockAt(x, y);
        const rocks = (this.map.rocks ??= []);
        if (ri !== null) rocks.splice(ri, 1);
        else rocks.push({ x: Math.round(x), y: Math.round(y), r: 34, c: rocks.length });
        this.rebuild();
        break;
      }
      case 'barrier':
      case 'mine': {
        const e = this.edgeAt(x, y);
        if (!e) break;
        const list = this.tool === 'barrier' ? (this.map.barriers ??= []) : (this.map.mines ??= []);
        const idx = list.findIndex(
          (o) => (o.edge[0] === e[0] && o.edge[1] === e[1]) || (o.edge[0] === e[1] && o.edge[1] === e[0]),
        );
        if (idx >= 0) list.splice(idx, 1);
        else list.push({ edge: [e[0], e[1]] });
        this.rebuild();
        break;
      }
      case 'owner':
        if (hit !== null) {
          const n = this.map.nodes[hit] as HandMap['nodes'][number];
          n.owner = ((n.owner ?? 0) + 1) % 5;
          if (n.owner === 0) delete n.owner;
          this.rebuild();
        }
        break;
      case 'type':
        if (hit !== null) {
          const n = this.map.nodes[hit] as HandMap['nodes'][number];
          const i = ALL_TYPES.indexOf(n.type ?? 'nest');
          n.type = ALL_TYPES[(i + 1) % ALL_TYPES.length] ?? 'nest';
          this.rebuild();
        }
        break;
      case 'units':
        if (hit !== null) {
          const n = this.map.nodes[hit] as HandMap['nodes'][number];
          const cap = TYPES[n.type ?? 'nest'].cap[(n.level ?? 1) - 1] ?? 40;
          n.units = Math.max(0, Math.min(cap, (n.units ?? 0) + (alt ? -4 : 4)));
          this.rebuild();
        }
        break;
      case 'delete': {
        if (hit !== null) this.removeNode(hit);
        else {
          const ri = this.rockAt(x, y);
          if (ri !== null) {
            this.map.rocks?.splice(ri, 1);
            this.rebuild();
          }
        }
        break;
      }
    }
  }
  move(x: number, y: number): void {
    if (this.dragNode !== null) {
      const n = this.map.nodes[this.dragNode];
      if (n) {
        n.x = Math.round(Math.max(20, Math.min(1580, x)));
        n.y = Math.round(Math.max(20, Math.min(780, y)));
        // live preview without a full rebuild
        const sn = this.state.nodes[this.dragNode];
        if (sn) {
          sn.x = n.x;
          sn.y = n.y;
        }
      }
    }
  }
  up(x: number, y: number): void {
    if (this.dragNode !== null) {
      this.dragNode = null;
      this.rebuild();
    }
    if (this.edgeFrom !== null) {
      const to = this.nodeAt(x, y);
      if (to !== null && to !== this.edgeFrom) this.toggleEdge(this.edgeFrom, to);
      this.edgeFrom = null;
    }
  }
  private toggleEdge(a: number, b: number): void {
    const i = this.map.edges.findIndex((e) => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a));
    if (i >= 0) {
      this.map.edges.splice(i, 1);
      const drop = (o: { edge: [number, number] }) =>
        !((o.edge[0] === a && o.edge[1] === b) || (o.edge[0] === b && o.edge[1] === a));
      this.map.barriers = (this.map.barriers ?? []).filter(drop);
      this.map.mines = (this.map.mines ?? []).filter(drop);
    } else this.map.edges.push([a, b]);
    this.rebuild();
  }
  private removeNode(i: number): void {
    this.map.nodes.splice(i, 1);
    const remap = (k: number) => (k > i ? k - 1 : k);
    this.map.edges = this.map.edges
      .filter((e) => e[0] !== i && e[1] !== i)
      .map(([a, b]) => [remap(a), remap(b)] as [number, number]);
    const fix = <T extends { edge: [number, number] }>(list: T[] | undefined) =>
      (list ?? [])
        .filter((o) => o.edge[0] !== i && o.edge[1] !== i)
        .map((o) => ({ ...o, edge: [remap(o.edge[0]), remap(o.edge[1])] as [number, number] }));
    this.map.barriers = fix(this.map.barriers);
    this.map.mines = fix(this.map.mines);
    this.rebuild();
  }
}
