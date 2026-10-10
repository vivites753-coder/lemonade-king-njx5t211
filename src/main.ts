import './styles.css';
import { initAudio } from './audio/sfx';
import { readSave, writeSave } from './core/save';
import { setLang } from './i18n';
import { loadAssets } from './render/assets';
import { Renderer } from './render/renderer';
import { Game } from './sim/game';
import { DebugPanel } from './ui/debug';
import { UI } from './ui/ui';

const game = new Game(1);
// remember the language of the last session for the title screen
const saved = readSave();
if (saved) {
  game.S.lang = saved.S.lang;
  Object.assign(game.S.settings, saved.S.settings);
}
setLang(game.S.lang);

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const renderer = new Renderer(canvas, game);
const ui = new UI(game, renderer);
const debug = new DebugPanel(document.getElementById('debug')!, game);

game.bus.on('save', writeSave);
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

// handy in the browser console while developing
(window as unknown as { LK: unknown }).LK = { game, renderer, ui };
if (import.meta.env.DEV) void import('./dev').then((m) => m.installDevHelpers({ game, renderer, ui }));
