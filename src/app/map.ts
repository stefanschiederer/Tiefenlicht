import { themeOf, type Theme } from '@/game/config';
import { PALETTES, towerIcon } from '@/render/sprites';

/* Campaign map: one tall SVG landscape (worlds, decorations, road, fog) with DOM level buttons on top. */

/** Vertical distance between two levels on the map (px). */
const STEP = 118;
const BOTTOM = 170;
const OUT = '#1d2530';

function rand(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Horizontal position (percent) of level n on the winding road. */
function xOf(n: number): number {
  return 50 + Math.sin((n - 1) * 1.05) * 27;
}

/** Number of levels shown: all reached ones plus a few ahead, always whole worlds. */
export function mapLevels(current: number): number {
  return Math.ceil((current + 8) / 10) * 10;
}

const f = (n: number) => n.toFixed(1);
const at = (x: number, y: number, s: number) =>
  `transform="translate(${f(x)} ${f(y)}) scale(${s.toFixed(2)})"`;
const SHADOW = (rx: number) =>
  `<ellipse cx="3" cy="1" rx="${rx}" ry="${rx * 0.32}" fill="rgba(20,40,20,.22)"/>`;
const S = `stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"`;

/* ------------------------------------------------------------------ decorations (anchored bottom-centre) */
const DECO: Record<Theme, ((x: number, y: number, s: number, r: () => number) => string)[]> = {
  grass: [
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(18)}<rect x="-4" y="-20" width="8" height="22" rx="3" fill="#7a4b25" ${S}/><circle cy="-32" r="19" fill="#3aa24a" ${S}/><circle cx="-5" cy="-37" r="10" fill="#5cc463"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(26)}<circle cx="-12" cy="-18" r="13" fill="#3aa24a" ${S}/><circle cx="12" cy="-16" r="12" fill="#3aa24a" ${S}/><circle cy="-28" r="15" fill="#46b354" ${S}/><circle cx="-4" cy="-33" r="7" fill="#6fd27a"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(24)}<rect x="-18" y="-26" width="36" height="26" fill="#f3ead8" ${S}/><path d="M-23 -24 L0 -44 L23 -24Z" fill="#e2574a" ${S}/><rect x="-5" y="-14" width="10" height="14" fill="#7a4b25" ${S}/><rect x="-14" y="-20" width="7" height="7" fill="#8fc6ff" stroke="${OUT}" stroke-width="2"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}><ellipse cx="0" cy="-6" rx="38" ry="16" fill="#5fb7e8" ${S}/><ellipse cx="-6" cy="-9" rx="26" ry="9" fill="#8fd3f5"/><path d="M-30 -10 l-3 -12 M-26 -9 l1 -13 M30 -8 l3 -11" stroke="#3f8f3a" stroke-width="2.5" stroke-linecap="round"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}><circle cx="-6" cy="-3" r="3" fill="#fff"/><circle cx="4" cy="-5" r="3" fill="#ffe066"/><circle cx="0" cy="2" r="3" fill="#ff9ec7"/><circle cx="9" cy="1" r="2.5" fill="#fff"/></g>`,
  ],
  desert: [
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(16)}<rect x="-6" y="-42" width="12" height="44" rx="6" fill="#4f9d4a" ${S}/><rect x="-18" y="-32" width="8" height="16" rx="4" fill="#4f9d4a" ${S}/><rect x="10" y="-38" width="8" height="18" rx="4" fill="#4f9d4a" ${S}/><rect x="-3" y="-38" width="3" height="34" fill="#6fbf63"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}><path d="M-46 0 Q-10 -26 46 0Z" fill="#e2b96c"/><path d="M-30 -6 Q-6 -20 22 -8" stroke="#f6dca0" stroke-width="3" fill="none" stroke-linecap="round"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(30)}<path d="M-34 0 L0 -40 L34 0Z" fill="#e7c27a" ${S}/><path d="M0 -40 L34 0 L8 0Z" fill="#c99a52"/><path d="M-34 0 L0 -40 L34 0Z" fill="none" ${S}/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}><ellipse cy="-6" rx="30" ry="12" fill="#5fb7e8" ${S}/><path d="M18 -10 q6 -26 2 -40" stroke="#8a5a32" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M20 -50 q-16 -2 -24 8 M20 -50 q14 -6 24 2 M20 -50 q-4 -12 -14 -14 M20 -50 q10 -10 18 -8" stroke="#3aa24a" stroke-width="5" fill="none" stroke-linecap="round"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(14)}<path d="M-14 0 L-11 -11 L-2 -16 L9 -12 L14 -1Z" fill="#b9835a" ${S}/><path d="M-8 -10 L-2 -14 L6 -11 L-2 -7Z" fill="#d9a47a"/></g>`,
  ],
  snow: [
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(18)}<rect x="-3" y="-14" width="6" height="16" fill="#7a4b25"/><path d="M-20 -12 H20 L0 -34Z M-16 -26 H16 L0 -46Z M-11 -40 H11 L0 -58Z" fill="#2f7d5c" ${S}/><path d="M-6 -46 H6 L0 -58Z M-8 -32 H8 L0 -46Z" fill="#fff"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}><path d="M-60 0 L-8 -84 L44 0Z" fill="#8b9bb0" ${S}/><path d="M-8 -84 L44 0 L16 0Z" fill="#6d7d93"/><path d="M-24 -58 L-8 -84 L8 -58 L0 -62 L-8 -54 L-16 -62Z" fill="#fff" ${S}/><path d="M-60 0 L-8 -84 L44 0Z" fill="none" ${S}/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}><ellipse cy="-6" rx="36" ry="14" fill="#bfe3ff" ${S}/><path d="M-20 -8 l14 -4 M4 -4 l16 -5" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(12)}<circle cy="-10" r="11" fill="#fff" ${S}/><circle cy="-28" r="8" fill="#fff" ${S}/><path d="M0 -28 l9 2 l-9 2Z" fill="#ff8a3d"/><rect x="-7" y="-41" width="14" height="6" rx="2" fill="#2d3440"/><circle cx="-3" cy="-30" r="1.4" fill="${OUT}"/></g>`,
  ],
  swamp: [
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(14)}<path d="M0 0 L-2 -30 L-14 -44 M-2 -30 L12 -46 M4 -38 L4 -54" stroke="#5a4630" stroke-width="6" stroke-linecap="round" fill="none"/><ellipse cx="-14" cy="-46" rx="8" ry="5" fill="#7fa25a"/><ellipse cx="12" cy="-48" rx="8" ry="5" fill="#7fa25a"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}><ellipse cy="-6" rx="34" ry="13" fill="#4f7a5a" ${S}/><ellipse cx="-10" cy="-8" rx="6" ry="3" fill="#7fc46a"/><ellipse cx="12" cy="-4" rx="5" ry="2.6" fill="#7fc46a"/><circle cx="12" cy="-6" r="1.8" fill="#ff9ec7"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}><path d="M-8 0 q-2 -18 -6 -26 M0 0 q0 -20 2 -30 M8 0 q2 -16 6 -24" stroke="#5b7a34" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="-14" cy="-28" rx="2.5" ry="6" fill="#8a5a32"/><ellipse cx="2" cy="-32" rx="2.5" ry="6" fill="#8a5a32"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(12)}<ellipse cy="-8" rx="14" ry="9" fill="#3e6b34" ${S}/><ellipse cx="-4" cy="-11" rx="6" ry="4" fill="#5b8a45"/></g>`,
  ],
  beach: [
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(16)}<path d="M0 0 Q8 -24 2 -46" stroke="#8a5a32" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M2 -46 Q-10 -56 -20 -40 M2 -46 Q14 -58 22 -42 M2 -46 Q-6 -66 -14 -56 M2 -46 Q8 -68 16 -58 M2 -46 Q2 -70 0 -62" stroke="#3aa24a" stroke-width="6" fill="none" stroke-linecap="round"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}><path d="M-46 -4 q12 -8 24 0 t24 0 t24 0 t24 0" stroke="#4fb7e3" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M-40 -8 q10 -6 20 0 t20 0 t20 0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}><path d="M-8 0 a8 8 0 0 1 16 0z" fill="#ffd6e0" ${S}/><path d="M-4 0 l2 -6 M0 0 v-7 M4 0 l-2 -6" stroke="#e8a0b4" stroke-width="1.5"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(14)}<rect x="-12" y="-22" width="24" height="4" rx="2" fill="#ff6b6b" ${S}/><path d="M0 -20 v20" stroke="#8a5a32" stroke-width="3"/><path d="M-16 -22 Q0 -40 16 -22Z" fill="#ffffff" ${S}/><path d="M-6 -22 Q0 -38 6 -22" fill="#ff6b6b"/></g>`,
  ],
  volcano: [
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(16)}<path d="M-16 0 L-6 -46 L4 -30 L10 -52 L18 0Z" fill="#3a2f2f" ${S}/><path d="M-4 -6 L0 -22 L6 -34" stroke="#ff7a2b" stroke-width="2" fill="none"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}><ellipse cy="-6" rx="30" ry="12" fill="#ff6b1a" ${S}/><ellipse cx="-6" cy="-8" rx="18" ry="6" fill="#ffb21a"/><circle cx="10" cy="-6" r="2.5" fill="#fff1b0"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}><path d="M-60 0 L-10 -80 L40 0Z" fill="#4a3b3b" ${S}/><path d="M-22 -60 L-10 -80 L2 -60 Q-10 -54 -22 -60Z" fill="#ff7a2b"/><circle cx="-6" cy="-92" r="8" fill="rgba(120,120,120,.6)"/><circle cx="4" cy="-104" r="11" fill="rgba(140,140,140,.45)"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(14)}<path d="M-14 0 L-11 -11 L-2 -16 L9 -12 L14 -1Z" fill="#4a3b3b" ${S}/><path d="M-6 -10 L0 -6 L6 -11" stroke="#ff7a2b" stroke-width="1.6" fill="none"/></g>`,
  ],
  magic: [
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(16)}<rect x="-5" y="-26" width="10" height="28" rx="4" fill="#f3ead8" ${S}/><path d="M-22 -28 A22 14 0 0 1 22 -28Z" fill="#c45cff" ${S}/><circle cx="-10" cy="-33" r="2.6" fill="#ffe8ff"/><circle cx="6" cy="-37" r="2.6" fill="#ffe8ff"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(14)}<path d="M-8 0 L-4 -30 L2 0Z M2 0 L8 -22 L12 0Z M-14 0 L-12 -16 L-6 0Z" fill="#9ff0ff" ${S}/><path d="M-4 -30 L-2 -10" stroke="#fff" stroke-width="2"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(18)}<rect x="-4" y="-20" width="8" height="22" rx="3" fill="#6b4a8a" ${S}/><circle cy="-32" r="19" fill="#4fb38f" ${S}/><circle cx="-5" cy="-37" r="10" fill="#7fe0b9"/><circle cx="8" cy="-28" r="2" fill="#ffe8ff"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}><circle cx="-6" cy="-4" r="3" fill="#ffe8ff"/><circle cx="5" cy="-6" r="3" fill="#9ff0ff"/><circle cx="0" cy="2" r="3" fill="#ffd166"/></g>`,
  ],
  autumn: [
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(18)}<rect x="-4" y="-20" width="8" height="22" rx="3" fill="#7a4b25" ${S}/><circle cy="-32" r="19" fill="#e0702a" ${S}/><circle cx="-5" cy="-37" r="10" fill="#f59a3d"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(18)}<rect x="-4" y="-20" width="8" height="22" rx="3" fill="#7a4b25" ${S}/><circle cy="-32" r="19" fill="#c9412a" ${S}/><circle cx="-5" cy="-37" r="10" fill="#e8613f"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(18)}<ellipse cy="-12" rx="18" ry="13" fill="#e8c35a" ${S}/><path d="M-12 -14 q12 -6 24 0 M-14 -6 q14 -5 28 0" stroke="#c99a2e" stroke-width="2" fill="none"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}>${SHADOW(12)}<ellipse cx="-6" cy="-8" rx="9" ry="8" fill="#ff8a3d" ${S}/><ellipse cx="6" cy="-8" rx="9" ry="8" fill="#ff8a3d" ${S}/><ellipse cy="-8" rx="7" ry="8" fill="#ffa25a" ${S}/><path d="M0 -16 l2 -6" stroke="#3f7d2a" stroke-width="3" stroke-linecap="round"/></g>`,
    (x, y, s) =>
      `<g ${at(x, y, s)}><rect x="-3" y="-12" width="6" height="12" fill="#f3ead8" ${S}/><path d="M-12 -10 Q0 -26 12 -10Z" fill="#e2574a" ${S}/><circle cx="-4" cy="-15" r="1.8" fill="#fff"/><circle cx="4" cy="-13" r="1.5" fill="#fff"/></g>`,
  ],
};

/** How often each decoration of a world is picked (same order as DECO). */
const WEIGHTS: Record<Theme, number[]> = {
  grass: [4, 3, 1, 1, 2],
  desert: [4, 2, 1, 1, 2],
  snow: [5, 1, 1, 1],
  autumn: [3, 3, 1, 1, 1],
  swamp: [4, 2, 2, 3],
  beach: [4, 1, 2, 1],
  volcano: [4, 1, 1, 3],
  magic: [4, 2, 3, 2],
};
function pick<T>(items: T[], weights: number[], r: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i] ?? 1;
    if (x < 0) return items[i] as T;
  }
  return items[items.length - 1] as T;
}

/** Wooden signpost naming the world (anchored at its foot). */
function signpost(x: number, y: number, world: number, name: string): string {
  const w = Math.max(120, name.length * 8.6 + 26);
  return `<g transform="translate(${f(x)} ${f(y)})">
    <ellipse cx="4" cy="2" rx="16" ry="5" fill="rgba(20,40,20,.25)"/>
    <rect x="-4" y="-46" width="8" height="48" fill="#8a5a32" ${S}/>
    <rect x="-12" y="-74" width="${f(w)}" height="38" rx="6" fill="#c48f58" ${S}/>
    <rect x="-8" y="-70" width="${f(w - 8)}" height="30" rx="4" fill="#d9a873"/>
    <text x="${f(w / 2 - 12)}" y="-58" text-anchor="middle" class="sign-a">Welt ${world}</text>
    <text x="${f(w / 2 - 12)}" y="-44" text-anchor="middle" class="sign-b">${name}</text>
  </g>`;
}

/** Campaign map HTML: worlds as painted landscapes, a winding road and a button per level. */
export function mapHtml(current: number, width: number, stars: number[] = []): string {
  const count = mapLevels(current);
  const H = BOTTOM + (count - 1) * STEP + 170;
  const yOf = (n: number) => H - BOTTOM - (n - 1) * STEP;
  const worlds = Math.ceil(count / 10);
  // road points (sampled along the curves) to keep decorations off the road
  const pts = Array.from({ length: count }, (_, i) => ({ x: (xOf(i + 1) / 100) * width, y: yOf(i + 1) }));
  const samples: { x: number; y: number }[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1] as { x: number; y: number },
      b = pts[i] as { x: number; y: number };
    const my = (a.y + b.y) / 2;
    for (let k = 0; k <= 12; k++) {
      const t = k / 12,
        u = 1 - t;
      samples.push({
        x: u * u * u * a.x + 3 * u * u * t * a.x + 3 * u * t * t * b.x + t * t * t * b.x,
        y: u * u * u * a.y + 3 * u * u * t * my + 3 * u * t * t * my + t * t * t * b.y,
      });
    }
  }
  const clearOfRoad = (x: number, y: number, d: number) =>
    samples.every((p) => Math.hypot(p.x - x, p.y - y) > d);

  let ground = '',
    decos = '',
    signs = '';
  for (let w = 0; w < worlds; w++) {
    const first = w * 10 + 1;
    const theme = themeOf(first);
    const p = PALETTES[theme.id];
    const top = w === worlds - 1 ? 0 : yOf(w * 10 + 10) - STEP / 2;
    const bottom = w === 0 ? H : yOf(first) + STEP / 2;
    const r = rand(first * 97 + 13);
    // band with a wavy upper edge reaching into the next world
    let edge = `M0 ${f(bottom)} L0 ${f(top + 14)}`;
    for (let x = 0; x <= width; x += 20)
      edge += ` L${x} ${f(top + 8 + Math.sin(x / 34 + w) * 9 + Math.sin(x / 13) * 3)}`;
    edge += ` L${width} ${f(bottom)}Z`;
    ground += `<path d="${edge}" fill="${p.field}"/>`;
    // soft light and shade patches
    for (let i = 0; i < 12; i++)
      ground += `<ellipse cx="${f(r() * width)}" cy="${f(top + r() * (bottom - top))}" rx="${f(40 + r() * 90)}" ry="${f(18 + r() * 34)}" fill="${i % 3 ? p.light : p.dark}"/>`;
    // tufts
    for (let i = 0; i < 40; i++) {
      const x = r() * width,
        y = top + 10 + r() * (bottom - top - 10);
      ground += `<path d="M${f(x - 3)} ${f(y - 5)} L${f(x)} ${f(y)} L${f(x + 3)} ${f(y - 5)}" stroke="${p.tuft}" stroke-width="1.6" fill="none"/>`;
    }
    // decorations away from the road and the level buttons
    const kinds = DECO[theme.id];
    const placed: { x: number; y: number; s: string }[] = [];
    for (let i = 0; i < 260 && placed.length < 28; i++) {
      const x = 16 + r() * (width - 32),
        y = top + 40 + r() * (bottom - top - 50);
      if (!clearOfRoad(x, y, 56)) continue;
      if (placed.some((q) => Math.hypot(q.x - x, q.y - y) < 40)) continue;
      const k = pick(kinds, WEIGHTS[theme.id], r);
      placed.push({ x, y, s: k(x, y, 0.75 + r() * 0.45, r) });
    }
    decos += placed
      .sort((a, b) => a.y - b.y)
      .map((q) => q.s)
      .join('');
    // signpost at the start of the world, on the side away from the road
    const sx = xOf(first) > 50 ? 22 : width - 150;
    signs += signpost(sx, bottom - STEP * 1.05, w + 1, theme.name);
  }

  // road: dark rim, sand, centre dashes, finished part in blue
  const seg = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const my = (a.y + b.y) / 2;
    return ` C${f(a.x)},${f(my)} ${f(b.x)},${f(my)} ${f(b.x)},${f(b.y)}`;
  };
  let road = `M${f(pts[0]?.x ?? 0)},${H} L${f(pts[0]?.x ?? 0)},${f(pts[0]?.y ?? 0)}`,
    done = road;
  for (let i = 1; i < pts.length; i++) {
    const s = seg(pts[i - 1] as { x: number; y: number }, pts[i] as { x: number; y: number });
    road += s;
    if (i < current) done += s;
  }
  // fog over the levels that are not reached yet
  const fogY = yOf(current) - STEP * 0.7;
  const fog = `<defs><linearGradient id="fog" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eef3f8" stop-opacity="0.75"/><stop offset="1" stop-color="#eef3f8" stop-opacity="0"/></linearGradient></defs>
    <rect x="0" y="0" width="${width}" height="${f(Math.max(0, fogY))}" fill="url(#fog)"/>`;

  let nodes = '';
  for (let n = 1; n <= count; n++) {
    const state = n < current ? 'done' : n === current ? 'current' : 'locked';
    const boss = n % 10 === 0;
    const icon =
      state === 'current'
        ? `<img class="marker" src="${towerIcon(1, 1, 'tower')}" alt="" />`
        : boss
          ? `<img class="marker boss" src="${towerIcon(state === 'done' ? 1 : 2, 3, 'castle')}" alt="" />`
          : '';
    const got = stars[n - 1] ?? 0;
    const starRow =
      state === 'done'
        ? `<div class="node-stars">${[1, 2, 3].map((i) => `<i class="${i <= got ? 'on' : ''}"></i>`).join('')}</div>`
        : '';
    nodes += `<div class="node-wrap" style="left:${xOf(n)}%;top:${yOf(n)}px">${icon}
      <button class="lvl ${state}${boss ? ' boss' : ''}" data-lv="${n}" ${state === 'locked' ? 'disabled' : ''} aria-label="Level ${n}">${n}</button>${starRow}</div>`;
  }
  return `<div class="map-inner" style="height:${H}px">
    <svg class="road" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}" preserveAspectRatio="none" aria-hidden="true">
      ${ground}
      <path d="${road}" class="r0"/><path d="${road}" class="r1"/><path d="${road}" class="r2"/><path d="${road}" class="r3"/>
      <path d="${done}" class="r4"/>
      ${decos}${signs}${fog}
    </svg>${nodes}</div>`;
}

/** Scrolls the map so the current level sits a bit below the middle of the screen. */
export function scrollToCurrent(el: HTMLElement): void {
  const cur = el.querySelector<HTMLElement>('.lvl.current')?.parentElement;
  if (cur) el.scrollTop = cur.offsetTop - el.clientHeight * 0.58;
  else el.scrollTop = el.scrollHeight;
}
