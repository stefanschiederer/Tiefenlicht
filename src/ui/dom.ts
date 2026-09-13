export const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing element ${sel}`);
  return el;
};
export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  text?: string,
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  Object.assign(e, props);
  if (text !== undefined) e.textContent = text;
  return e;
};
