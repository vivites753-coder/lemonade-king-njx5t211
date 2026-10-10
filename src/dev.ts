// Development-only console helpers (not included in production builds).
// __play(seconds) runs the game loop by hand (useful when the tab is hidden and requestAnimationFrame is paused),
// auto-closing tips and serving customers. __zoom(x, y, scale) / __unzoom() inspect a spot of the diorama.
import type { Renderer } from './render/renderer';
import type { Game } from './sim/game';
import type { UI } from './ui/ui';

interface LK {
  game: Game;
  renderer: Renderer;
  ui: UI;
}

export function installDevHelpers(lk: LK): void {
  const w = window as unknown as Record<string, unknown>;
  w.__play = (sec: number, opts: { serve?: boolean; closeOverlays?: boolean; stopOnPhase?: boolean } = {}) => {
    const { game: g, ui } = lk;
    const n = Math.round(sec * 30);
    for (let i = 0; i < n; i++) {
      if (opts.closeOverlays !== false) ui.closeOverlaysForDev();
      ui.update();
      g.update(1 / 30);
      if (opts.serve !== false && g.phase === 'sell' && !g.serving && !g.making) {
        if (g.D.cupsReady === 0 && g.canMakePitcher()) g.makePitcher();
        else g.serve();
      }
      if (g.phase !== 'sell' && opts.stopOnPhase !== false) break;
    }
    for (let k = 0; k < 3; k++) lk.renderer.render(1 / 30);
    return { phase: g.phase, day: g.S.day, hour: g.D.hour.toFixed(2), coins: g.S.coins, rep: g.S.rep.toFixed(2), f: { ...g.D.funnel }, queue: g.street.queue.length, cups: g.D.cupsReady };
  };
  w.__zoom = (x: number, y: number, s: number) => {
    const r = lk.renderer as unknown as { targetCam?: unknown; w: number; h: number; render(dt: number): void };
    const px = (x - y) * 32;
    const py = (x + y) * 16;
    r.targetCam = () => ({ s, ox: r.w / 2 - px * s, oy: r.h / 2 - py * s + 40 });
    r.render(1 / 30);
    r.render(1 / 30);
  };
  w.__unzoom = () => {
    const r = lk.renderer as unknown as { targetCam?: unknown; render(dt: number): void };
    delete r.targetCam;
    r.render(1 / 30);
  };
}
