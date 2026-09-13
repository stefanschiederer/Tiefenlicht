import { CAMPAIGN } from '@/data';
import { $ } from '@/ui/dom';
import {
  buildLegend,
  initHud,
  renderAbilities,
  renderSendbar,
  setGameUi,
  setSpeedButton,
  tip,
  updateHud,
} from '@/ui/hud';
import { positionPanel, renderPanel, updatePanel } from '@/ui/panel';
import { hideScreen, showScreen, type ScreenActions, type ScreenKind } from '@/ui/screens';
import { hideEditorUi, renderEditorUi } from '@/ui/editor';
import { customDef } from './editor';
import { Game, isTouch } from './game';
import { createRenderer, type GraphicsQuality } from '@/render/renderer';
import { readSave } from './save';
import { bindInput } from './input';
import { registerPwa } from './pwa';

export async function startApp(): Promise<Game> {
  const canvas = $<HTMLCanvasElement>('#c');
  const pref = readSave().graphics;
  const quality: GraphicsQuality = pref === 'auto' ? (isTouch() ? 'mittel' : 'hoch') : pref;
  const renderer = await createRenderer(canvas, quality);
  if ('onQualityChange' in renderer)
    (renderer as { onQualityChange: ((q: string) => void) | null }).onQualityChange = () =>
      tip('Grafik auf „Mittel“ gesenkt, damit es flüssig bleibt. In den Einstellungen änderbar.', 4000);
  const game = new Game(renderer, {
    onHud: () => {
      updateHud(game);
      if (game.ui.selected.length) updatePanel(game);
    },
    onPanel: () => renderPanel(game),
    onFrame: () => positionPanel(game),
    onTip: tip,
    onLegend: () => buildLegend(game),
    onAbilities: () => renderAbilities(game),
    onFinish: (won) => showScreen(game, won ? 'win' : 'lose', actions),
  });

  let chapterPending = false;
  const toMenu = (kind: ScreenKind) => {
    if (game.mode !== 'menu' || !game.demo) game.startDemo();
    setGameUi(false);
    showScreen(game, kind, actions);
  };
  const openEditor = () => {
    hideScreen();
    setGameUi(false);
    const ed = game.openEditor();
    renderEditorUi(ed, {
      play: () => {
        hideEditorUi();
        game.playCustom(customDef(ed.map));
        setGameUi(true);
        renderSendbar(game);
        showScreen(game, 'intro', actions);
      },
      close: () => {
        hideEditorUi();
        toMenu('menu');
      },
    });
  };
  const actions: ScreenActions = {
    toMenu,
    editor: openEditor,
    play: (kind, i) => {
      game.prepareLevel(kind, i);
      setGameUi(true);
      renderSendbar(game);
      // First level of a chapter without any stars yet: narrative chapter intro first.
      const def = game.def;
      const firstOfChapter = kind === 'campaign' && CAMPAIGN.findIndex((l) => l.ch === def.ch) === i;
      if (firstOfChapter && !game.save.stars[i]) {
        chapterPending = true;
        showScreen(game, 'chapter', actions);
      } else showScreen(game, 'intro', actions);
    },
    resume: () => {
      if (chapterPending) {
        chapterPending = false;
        showScreen(game, 'intro', actions);
        return;
      }
      hideScreen();
      game.resumePlay();
      setGameUi(true);
    },
    restart: () => {
      if (game.levelKind === 'custom') {
        game.restartLevel();
        setGameUi(true);
        renderSendbar(game);
        showScreen(game, 'intro', actions);
      } else actions.play(game.levelKind, game.levelIndex);
    },
    next: () => {
      if (game.levelKind === 'custom') {
        openEditor();
        return;
      }
      if (game.levelKind === 'campaign') {
        if (game.levelIndex + 1 < CAMPAIGN.length) actions.play('campaign', game.levelIndex + 1);
        else toMenu('campaign');
      } else actions.play('endless', game.levelIndex + 1);
    },
  };
  const togglePause = () => {
    if (game.paused) actions.resume();
    else {
      game.pause();
      showScreen(game, 'pause', actions);
    }
  };
  const toggleSpeed = () => setSpeedButton(game.toggleSpeed());
  initHud();
  setSpeedButton(1);
  bindInput(renderer.canvas, game, { togglePause, toggleSpeed, onSendMode: () => renderSendbar(game) });

  $('#legendBtn').addEventListener('click', () => {
    const b = $('#legend');
    b.hidden = !b.hidden;
    $('#legendBtn').setAttribute('aria-pressed', String(!b.hidden));
  });
  $('#speedBtn').addEventListener('click', toggleSpeed);
  $('#pauseBtn').addEventListener('click', () => {
    if (game.running) togglePause();
  });
  $('#fsBtn').addEventListener('click', () => {
    void import('./pwa').then(({ enterFullscreen }) =>
      enterFullscreen().then((ok) => {
        if (!ok)
          tip(
            'Vollbild wird hier nicht unterstützt. Auf dem iPhone: Teilen → „Zum Home-Bildschirm“, dann startet Tiefenlicht bildschirmfüllend.',
            6000,
          );
      }),
    );
  });

  const resize = () => {
    // Short screens (phones in landscape) get a compact one-line HUD and the map is fitted below it.
    const compact = innerHeight < 500;
    document.documentElement.classList.toggle('compact', compact);
    const safeTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0;
    game.renderer.resize(innerWidth, innerHeight, { top: compact ? 44 + safeTop : 0 });
    if (game.ui.selected.length) renderPanel(game);
  };
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  window.visualViewport?.addEventListener('resize', resize);
  resize();

  game.startDemo();
  showScreen(game, 'menu', actions);
  const loop = (now: number) => {
    game.frame(now);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  registerPwa();

  // Test hook (used by Playwright).
  (window as unknown as { TL: unknown }).TL = {
    game,
    get nodes() {
      return game.state.nodes;
    },
    get groups() {
      return game.state.groups;
    },
    get edges() {
      return game.state.edges;
    },
    get view() {
      return game.renderer.view;
    },
  };
  return game;
}
