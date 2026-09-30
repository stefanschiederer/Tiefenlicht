import { PALETTES } from '@/render/sprites';
import { themeOf } from '@/game/config';
import { towerIcon } from '@/render/sprites';

/** Vertical distance between two levels on the map (px). */
const STEP = 118;
const BOTTOM = 170;

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

/** Small SVG decoration (tree, cactus, pine) for a world, in a 40×50 box anchored bottom-centre. */
function deco(theme: string, x: number, y: number, s: number): string {
  const t = `transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)})"`;
  const shadow = '<ellipse cx="3" cy="1" rx="18" ry="6" fill="rgba(20,40,20,.22)"/>';
  if (theme === 'desert')
    return `<g ${t}>${shadow}<rect x="-6" y="-42" width="12" height="44" rx="6" fill="#4f9d4a" stroke="#1d2530" stroke-width="2.5"/><rect x="-18" y="-32" width="8" height="16" rx="4" fill="#4f9d4a" stroke="#1d2530" stroke-width="2.5"/><rect x="10" y="-38" width="8" height="18" rx="4" fill="#4f9d4a" stroke="#1d2530" stroke-width="2.5"/></g>`;
  if (theme === 'snow')
    return `<g ${t}>${shadow}<rect x="-3" y="-14" width="6" height="16" fill="#7a4b25"/><path d="M-20 -12 H20 L0 -34Z M-16 -26 H16 L0 -46Z M-11 -40 H11 L0 -58Z" fill="#2f7d5c" stroke="#1d2530" stroke-width="2.5" stroke-linejoin="round"/><path d="M-6 -46 H6 L0 -58Z M-8 -32 H8 L0 -46Z" fill="#fff"/></g>`;
  const [a, b] = theme === 'autumn' ? ['#e0702a', '#f59a3d'] : ['#3aa24a', '#5cc463'];
  return `<g ${t}>${shadow}<rect x="-4" y="-20" width="8" height="22" rx="3" fill="#7a4b25" stroke="#1d2530" stroke-width="2.5"/><circle cy="-32" r="19" fill="${a}" stroke="#1d2530" stroke-width="2.5"/><circle cx="-5" cy="-37" r="10" fill="${b}"/></g>`;
}

/** Number of levels shown: all reached ones plus a few ahead, always whole worlds. */
export function mapLevels(current: number): number {
  return Math.ceil((current + 8) / 10) * 10;
}

/** Campaign map HTML: worlds as coloured bands, a winding road and a button per level. */
export function mapHtml(current: number, width: number): string {
  const count = mapLevels(current);
  const H = BOTTOM + (count - 1) * STEP + 170;
  const yOf = (n: number) => H - BOTTOM - (n - 1) * STEP;
  let bands = '',
    decos = '';
  for (let w = 0; w * 10 < count; w++) {
    const first = w * 10 + 1,
      last = w * 10 + 10;
    const theme = themeOf(first);
    const p = PALETTES[theme.id];
    const top = w === Math.ceil(count / 10) - 1 ? 0 : yOf(last) - STEP / 2;
    const bottom = w === 0 ? H : yOf(first) + STEP / 2;
    bands += `<div class="band" style="top:${top}px;height:${bottom - top}px;background-color:${p.field}">
      <span class="band-name">Welt ${w + 1}: ${theme.name}</span></div>`;
    const r = rand(first * 97);
    for (let i = 0; i < 16; i++) {
      const side = i % 2;
      const xp = side ? 80 + r() * 17 : 3 + r() * 17;
      const y = top + 50 + r() * (bottom - top - 60);
      decos += deco(theme.id, (xp / 100) * width, y, 0.8 + r() * 0.5);
    }
  }
  // road through all levels (smooth curve), finished part highlighted
  const pts = Array.from({ length: count }, (_, i) => ({ x: (xOf(i + 1) / 100) * width, y: yOf(i + 1) }));
  const seg = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const my = (a.y + b.y) / 2;
    return ` C${a.x},${my} ${b.x},${my} ${b.x},${b.y}`;
  };
  let road = `M${pts[0]?.x ?? 0},${H}  L${pts[0]?.x ?? 0},${pts[0]?.y ?? 0}`,
    done = road;
  for (let i = 1; i < pts.length; i++) {
    const s = seg(pts[i - 1] as { x: number; y: number }, pts[i] as { x: number; y: number });
    road += s;
    if (i < current) done += s;
  }
  let nodes = '';
  for (let n = 1; n <= count; n++) {
    const state = n < current ? 'done' : n === current ? 'current' : 'locked';
    const boss = n % 10 === 0;
    const icon =
      state === 'current'
        ? `<img class="marker" src="${towerIcon(1, 1, 'tower')}" alt="" />`
        : boss && state === 'locked'
          ? `<img class="marker boss" src="${towerIcon(2, 3, 'tower')}" alt="" />`
          : '';
    nodes += `<div class="node-wrap" style="left:${xOf(n)}%;top:${yOf(n)}px">${icon}
      <button class="lvl ${state}${boss ? ' boss' : ''}" data-lv="${n}" ${state === 'locked' ? 'disabled' : ''} aria-label="Level ${n}">${n}</button></div>`;
  }
  return `<div class="map-inner" style="height:${H}px">${bands}
    <svg class="road" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}" aria-hidden="true">
      ${decos}
      <path d="${road}" class="r1"/><path d="${road}" class="r2"/><path d="${road}" class="r3"/>
      <path d="${done}" class="r4"/>
    </svg>${nodes}</div>`;
}

/** Scrolls the map so the current level sits a bit below the middle of the screen. */
export function scrollToCurrent(el: HTMLElement): void {
  const cur = el.querySelector<HTMLElement>('.lvl.current')?.parentElement;
  if (cur) el.scrollTop = cur.offsetTop - el.clientHeight * 0.58;
  else el.scrollTop = el.scrollHeight;
}
