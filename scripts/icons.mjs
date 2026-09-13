// Rasterises public/logo.svg into all PWA icon sizes using Playwright's bundled Chromium (no native deps).
import { chromium } from '@playwright/test';
import './chromium-env.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sizes = [48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512, 1024];
const maskable = [192, 512];
const out = resolve('public/icons');
await mkdir(out, { recursive: true });
const svg = await readFile(resolve('public/logo.svg'), 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function render(size, pad, file) {
  // Maskable icons keep the artwork inside the 80 % safe zone by padding it on the background colour.
  const inner = Math.round(size * (1 - 2 * pad));
  const off = Math.round(size * pad);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:#050d17;width:${size}px;height:${size}px;overflow:hidden">
       <div style="position:absolute;left:${off}px;top:${off}px;width:${inner}px;height:${inner}px">${svg.replace(
         /width="512" height="512"/,
         `width="${inner}" height="${inner}"`,
       )}</div></body></html>`,
  );
  const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: size, height: size } });
  await writeFile(resolve(out, file), png);
  console.log(`icons: ${file}`);
}

for (const s of sizes) await render(s, 0, `icon-${s}.png`);
for (const s of maskable) await render(s, 0.1, `maskable-${s}.png`);
await browser.close();
