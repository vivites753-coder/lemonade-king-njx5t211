import './styles.css';
import { initAudio } from './audio/sfx';
import { readSave, wipeOnUpdate, writeSave } from './core/save';
import { asLang, setLang, t } from './i18n';
import { loadAssets } from './render/assets';
import { Renderer } from './render/renderer';
import { Game } from './sim/game';
import { DebugPanel } from './ui/debug';
import { UI } from './ui/ui';

// a published update starts with clean saves (the dev server keeps them)
const wiped = import.meta.env.PROD && wipeOnUpdate(__BUILD_ID__);

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
  renderer.resize();
  ui.layout();
});

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  ui.update();
  game.update(dt);
  renderer.render(dt);
  debug.update(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// A published update is noticed even when the game stays open (a home-screen app is rarely restarted):
// compare the script this page runs with the one the server has now.
async function checkForUpdate(): Promise<void> {
  const mine = document.querySelector<HTMLScriptElement>('script[type="module"][src*="assets/index-"]')?.src;
  if (!mine) return; // the dev server and the single-file build have nothing to compare
  try {
    const html = await (await fetch(`./index.html?v=${Date.now()}`, { cache: 'no-store' })).text();
    const latest = html.match(/assets\/index-[\w-]+\.js/)?.[0];
    if (latest && !mine.endsWith(latest)) ui.showUpdate();
  } catch {
    // offline: try again later
  }
}
if (import.meta.env.PROD) {
  setTimeout(() => void checkForUpdate(), 4000);
  setInterval(() => void checkForUpdate(), 10 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void checkForUpdate();
  });
}

// handy in the browser console while developing
(window as unknown as { LK: unknown }).LK = { game, renderer, ui };
if (import.meta.env.DEV) void import('./dev').then((m) => m.installDevHelpers({ game, renderer, ui }));
