import { registerSW } from 'virtual:pwa-register';

/** Registers the service worker; new versions install in the background and apply on the next start. */
export function registerPwa(): void {
  if (!('serviceWorker' in navigator)) return;
  registerSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => void reg.update(), 30 * 60 * 1000);
    },
  });
}
