/** Inline SVG icon set (own artwork). Each icon is a 24×24 viewBox using currentColor. */
const wrap = (body: string, extra = ''): string =>
  `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;

export const ICONS = {
  pause: wrap(
    '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
  ),
  play: wrap('<path d="M8 5l11 7-11 7z" fill="currentColor" stroke="none"/>'),
  speed: wrap(
    '<path d="M4 6l7 6-7 6z" fill="currentColor" stroke="none"/><path d="M12 6l7 6-7 6z" fill="currentColor" stroke="none"/>',
  ),
  fullscreen: wrap('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  legend: wrap('<circle cx="7" cy="7" r="2.5"/><circle cx="7" cy="17" r="2.5"/><path d="M12 7h8M12 17h8"/>'),
  back: wrap('<path d="M14 6l-6 6 6 6"/>'),
  upgrade: wrap('<path d="M12 19V6M6 12l6-6 6 6"/>'),
  reserve: wrap('<path d="M4 18h16M6 18V9l6-4 6 4v9"/><path d="M10 18v-5h4v5"/>'),
  convert: wrap(
    '<path d="M4 12a8 8 0 0 1 13.7-5.7M20 12a8 8 0 0 1-13.7 5.7"/><path d="M18 3v4h-4M6 21v-4h4"/>',
  ),
  clear: wrap('<path d="M6 6l12 12M18 6L6 18"/>'),
  route: wrap(
    '<circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="12" r="2.5"/><path d="M7.5 12h9"/><path d="M14 9.5l2.5 2.5-2.5 2.5"/>',
  ),
  stoss: wrap(
    '<path d="M12 2l2.2 6.3L21 10l-6.8 1.7L12 18l-2.2-6.3L3 10l6.8-1.7z" fill="currentColor" stroke="none"/><path d="M19 17l1 3M5 17l-1 3" stroke-width="1.4"/>',
  ),
  frost: wrap(
    '<path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"/><path d="M12 2l-2 3M12 2l2 3M12 22l-2-3M12 22l2-3M2 12l3-2M2 12l3 2M22 12l-3-2M22 12l-3 2" stroke-width="1.4"/>',
  ),
  schild: wrap(
    '<path d="M12 2l8 3.5V11c0 5-3.4 8.6-8 11-4.6-2.4-8-6-8-11V5.5z"/><path d="M12 6v11" stroke-opacity=".6"/>',
  ),
  star: wrap(
    '<path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" fill="currentColor" stroke="none"/>',
  ),
  starEmpty: wrap(
    '<path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/>',
  ),
  lock: wrap('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  sound: wrap(
    '<path d="M4 10v4h4l5 4V6L8 10z" fill="currentColor" stroke="none"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  ),
  soundOff: wrap(
    '<path d="M4 10v4h4l5 4V6L8 10z" fill="currentColor" stroke="none"/><path d="M16 9l5 6M21 9l-5 6"/>',
  ),
  settings: wrap(
    '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  ),
  campaign: wrap('<path d="M3 20l5-14 4 8 3-5 6 11z" fill="currentColor" stroke="none" fill-opacity=".9"/>'),
  endless: wrap('<path d="M7 12a3 3 0 1 0 0 .01M17 12a3 3 0 1 0 0 .01M9.5 10.5l5 3M9.5 13.5l5-3"/>'),
  skills: wrap(
    '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 7.5v4M12 11.5l-5.5 5M12 11.5l5.5 5"/>',
  ),
  help: wrap(
    '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
  ),
  time: wrap('<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>'),
  target: wrap(
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  ),
  trophy: wrap(
    '<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>',
  ),
} as const;
export type IconName = keyof typeof ICONS;

export const icon = (name: IconName, cls = ''): string => `<span class="ic ${cls}">${ICONS[name]}</span>`;
export const stars = (n: number): string =>
  `<span class="stars" aria-label="${n} von 3 Sternen">${[0, 1, 2].map((i) => icon(i < n ? 'star' : 'starEmpty', i < n ? 'on' : 'off')).join('')}</span>`;
