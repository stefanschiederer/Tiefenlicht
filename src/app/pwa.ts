import { registerSW } from 'virtual:pwa-register';

let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;

/**
 * Registers the service worker. A new version downloads in the background; it is applied only
 * between levels (see applyPendingUpdate), so nobody is thrown out of a running level.
 */
export function registerPwa(isIdle: () => boolean): void {
  if (!('serviceWorker' in navigator)) return;
  const update = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (isIdle()) void update(true);
      else applyUpdate = update;
    },
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => void reg.update(), 30 * 60 * 1000);
    },
  });
  // ask the browser to keep the save game (localStorage) even when space runs low
  void navigator.storage?.persist?.().catch(() => undefined);
}

/** Installs a downloaded update (reloads the page). Returns true if one was pending. */
export function applyPendingUpdate(): boolean {
  if (!applyUpdate) return false;
  void applyUpdate(true);
  applyUpdate = null;
  return true;
}
