import type { Page } from '@playwright/test';

/** Clicks through an optional chapter intro ("Weiter") and then "Level starten". */
export async function startLevel(page: Page): Promise<void> {
  const weiter = page.getByRole('button', { name: 'Weiter', exact: true });
  if (await weiter.isVisible().catch(() => false)) await weiter.click();
  await page.getByRole('button', { name: 'Level starten' }).click();
}
