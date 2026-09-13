import { registerSW } from 'virtual:pwa-register';

/** Registers the service worker and shows a small "new version" toast when an update is waiting. */
export function registerPwa(): void {
  if (!('serviceWorker' in navigator)) return;
  const toast = document.getElementById('pwaToast');
  const reload = document.getElementById('pwaReload');
  const later = document.getElementById('pwaLater');
  const update = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (!toast) return;
      toast.hidden = false;
      reload?.addEventListener('click', () => void update(true), { once: true });
      later?.addEventListener('click', () => (toast.hidden = true), { once: true });
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
