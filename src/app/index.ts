import { CAMPAIGN } from '@/data';
import { $ } from '@/ui/dom';
import { buildLegend, renderAbilities, renderSendbar, setGameUi, tip, updateHud } from '@/ui/hud';
import { renderPanel } from '@/ui/panel';
import { hideScreen, showScreen, type ScreenActions, type ScreenKind } from '@/ui/screens';
import { Game } from './game';
import { bindInput } from './input';
import { registerPwa } from './pwa';

export function startApp(): Game {
  const canvas = $<HTMLCanvasElement>('#c');
  const game = new Game(canvas, {
    onHud: () => {
      updateHud(game);
      if (game.ui.selected.length) renderPanel(game);
    },
    onPanel: () => renderPanel(game),
    onTip: tip,
    onLegend: () => buildLegend(game),
    onAbilities: () => renderAbilities(game),
    onFinish: (won) => showScreen(game, won ? 'win' : 'lose', actions),
  });

  const toMenu = (kind: ScreenKind) => {
    if (game.mode !== 'menu' || !game.demo) game.startDemo();
    setGameUi(false);
    showScreen(game, kind, actions);
  };
  const actions: ScreenActions = {
    toMenu,
    play: (kind, i) => {
      game.prepareLevel(kind, i);
      setGameUi(true);
      renderSendbar(game);
      showScreen(game, 'intro', actions);
    },
    resume: () => {
      hideScreen();
      game.resumePlay();
      setGameUi(true);
    },
    restart: () => actions.play(game.levelKind, game.levelIndex),
    next: () => {
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
  const toggleSpeed = () => {
    const sp = game.toggleSpeed();
    $('#speedBtn').textContent = `Tempo ${sp}×`;
    $('#speedBtn').setAttribute('aria-pressed', String(sp === 2));
  };
  bindInput(canvas, game, { togglePause, toggleSpeed, onSendMode: () => renderSendbar(game) });

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
    game.renderer.resize(innerWidth, innerHeight);
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
