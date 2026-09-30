import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/800.css';
import './styles.css';
import './app/errors';
import { App } from './app/app';
import { registerPwa } from './app/pwa';

const app = new App(document.getElementById('c') as HTMLCanvasElement);
// test hook for the end-to-end tests
(window as unknown as { TW: App }).TW = app;
// wait for the font so tower numbers render in Baloo 2
void document.fonts?.ready.then(() => app.renderer.resize(window.innerWidth, window.innerHeight));
if (import.meta.env.PROD) registerPwa();
