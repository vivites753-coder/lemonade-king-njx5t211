import './styles.css';
import { musicFor, playMusic } from './audio/music';
import { initAudio } from './audio/sfx';
import { installErrorLog, logError } from './core/errors';
import { readSave, wipeOnUpdate, writeSave } from './core/save';
import { asLang, setLang, t } from './i18n';
import { loadAssets } from './render/assets';
import { Renderer } from './render/renderer';
import { Game } from './sim/game';
import { DebugPanel } from './ui/debug';
import { initNativeApp, isNativeApp } from './native';
import { updatePhoneClass } from './ui/dom';
import { initFullscreen } from './ui/fullscreen';
import { UI } from './ui/ui';

installErrorLog();
// a published update starts with clean saves (the dev server keeps them)
const wiped = import.meta.env.PROD && wipeOnUpdate(__BUILD_ID__);
updatePhoneClass();
// the app is always full screen (MainActivity); on the website the first tap asks for it
initFullscreen(!isNativeApp());

const game = new Game(1);
// remember the language of the last session for the title screen
const saved = readSave();
if (saved) {
  game.S.lang = asLang(saved.S.lang);
  Object.assign(game.S.settings, saved.S.settings);
}
setLang(game.S.lang);

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const renderer = new Renderer(canvas, game);
const ui = new UI(game, renderer);
const debug = new DebugPanel(document.getElementById('debug')!, game);
ui.debugPanel = () => debug.toggle();

game.bus.on('save', writeSave);
if (wiped) setTimeout(() => ui.toast(t('update.wiped'), 'info'), 600);
loadAssets();
initAudio();

window.addEventListener('resize', () => {
  updatePhoneClass();
  renderer.resize();
  ui.layout();
});

/** One part of a frame: an error in it is noted, and the game goes on (it used to stop the frames for good). */
function step(where: string, fn: () => void): void {
  try {
    fn();
  } catch (e) {
    logError(where, e);
  }
}

let last = performance.now();
function frame(now: number): void {
  // the next frame is asked for first, whatever goes wrong below
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  step('ui', () => ui.update());
  step('music', () => playMusic(musicFor(game)));
  step('game', () => game.update(dt));
  step('render', () => renderer.render(dt));
  step('debug', () => debug.update(dt));
}
requestAnimationFrame(frame);

// The game goes to the background (another app, a locked screen, a hidden tab): save it as it is now. Android may
// end the page there to free memory; the game then starts again from this save (see MainActivity).
document.addEventListener('visibilitychange', () => {
  if (document.hidden) step('save', () => game.saveNow());
});

// A published update is noticed even when the game stays open (a home-screen app is rarely restarted):
// compare the script this page runs with the one the server has now.
async function checkForUpdate(): Promise<void> {
  const mine = document.querySelector<HTMLScriptElement>('script[type="module"][src*="assets/index-"]')?.src;
  if (!mine) return; // the dev server and the single-file build have nothing to compare
  try {
    const html = await (await fetch(`./index.html?v=${Date.now()}`, { cache: 'no-store' })).text();
    const latest = html.match(/assets\/index-[\w-]+\.js/)?.[0];
    if (!latest || mine.endsWith(latest)) return;
    // on the title screen nothing is lost: load the new version at once (only once per version, so a page the
    // browser still keeps in its cache cannot make it reload again and again)
    let tried = '';
    try {
      tried = sessionStorage.getItem('lk-update') ?? '';
    } catch {
      // no session storage: show the bar
    }
    if (game.phase === 'title' && tried !== latest) {
      try {
        sessionStorage.setItem('lk-update', latest);
      } catch {
        // ignore
      }
      location.replace(`${location.pathname}?v=${encodeURIComponent(latest)}`);
      return;
    }
    ui.showUpdate();
  } catch {
    // offline: try again later
  }
}
// (the app carries its game inside: it is updated with a new APK, not from the website)
if (import.meta.env.PROD && !isNativeApp()) {
  setTimeout(() => void checkForUpdate(), 1500);
  setInterval(() => void checkForUpdate(), 10 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void checkForUpdate();
  });
}

void initNativeApp({
  closeTop: () => ui.closeTop(),
  confirmExit: (yes) => ui.confirmExit(yes),
  pause: () => ui.pauseForBackground(),
});

// handy in the browser console while developing
(window as unknown as { LK: unknown }).LK = { game, renderer, ui };
if (import.meta.env.DEV) void import('./dev').then((m) => m.installDevHelpers({ game, renderer, ui }));
