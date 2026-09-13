import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the service worker. Updates are applied automatically: a new version is downloaded in the
 * background and takes over on the next start (the page reloads once when it is installed while idle).
 */
export function registerPwa(): void {
  if (!('serviceWorker' in navigator)) return;
  registerSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      // Check for a new version every 30 minutes while the app stays open.
      if (reg) setInterval(() => void reg.update(), 30 * 60 * 1000);
    },
    onOfflineReady() {
      console.info('Tiefenlicht ist offline verfügbar.');
    },
  });
}

/** Requests fullscreen and tries to lock landscape orientation; resolves to whether fullscreen is active. */
export async function enterFullscreen(): Promise<boolean> {
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  try {
    if (typeof el.requestFullscreen === 'function') await el.requestFullscreen({ navigationUI: 'hide' });
    else if (typeof el.webkitRequestFullscreen === 'function') await el.webkitRequestFullscreen();
    else return false;
  } catch {
    return false;
  }
  try {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o.lock?.('landscape');
  } catch {
    /* orientation lock is optional (unsupported on iOS Safari) */
  }
  return true;
}
