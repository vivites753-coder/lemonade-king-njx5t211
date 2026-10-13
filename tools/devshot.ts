// Development helper (not part of the game build): renders a selling scene into an overlay canvas, for checking art.
// In the browser console of the dev server: const { scene, clearShots } = await import('/tools/devshot.ts');
import { Game } from '../src/sim/game';
import { Renderer } from '../src/render/renderer';
import { P } from '../src/render/iso';
import type { LocationId, UpgradeId } from '../src/core/types';
import { cook } from '../tests/bot';

function overlay(): HTMLCanvasElement {
  let z = document.getElementById('dbgz') as HTMLCanvasElement | null;
  if (!z) {
    z = document.createElement('canvas');
    z.id = 'dbgz';
    z.width = 1600;
    z.height = 1000;
    z.style.cssText = 'position:fixed;left:0;top:0;width:1600px;height:1000px;z-index:100000;background:#fff';
    document.body.appendChild(z);
  }
  return z;
}

export function clearShots(): void {
  const z = overlay();
  z.getContext('2d')!.clearRect(0, 0, z.width, z.height);
}

export function removeShots(): void {
  document.getElementById('dbgz')?.remove();
}

/** Draws the stand area of a selling day into slot 0..2 of the overlay. */
export async function scene(
  ups: UpgradeId[],
  helpers: number,
  slot: number,
  opt: { loc?: LocationId; avatar?: 'boy' | 'girl'; keepPeds?: boolean; cx?: number; cy?: number; w?: number; h?: number; dpr?: number } = {},
): Promise<void> {
  const g = new Game(3);
  g.newGame({ ageMode: 'pro', avatar: opt.avatar ?? 'girl', lang: 'uk', seed: 3 });
  g.S.bestRep = 4;
  g.debugAddCoins(3000);
  g.D.coinsStart = g.S.coins;
  g.S.location = opt.loc ?? 'park';
  for (const u of ups) g.S.upgrades[u] = true;
  g.goMarket();
  for (let i = 0; i < 3; i++) g.addPitcherKit();
  g.pay();
  cook(g, 3);
  if (helpers) g.setHelpers(helpers);
  g.startSelling();
  const c = document.createElement('canvas');
  c.style.cssText = 'position:fixed;left:0;top:0;width:1600px;height:1000px;z-index:99990';
  document.body.appendChild(c);
  const r = new Renderer(c, g);
  r.resize();
  for (let i = 0; i < 4; i++) r.render(0.016);
  await new Promise((res) => setTimeout(res, 900));
  if (!opt.keepPeds) {
    g.street.peds.length = 0;
    g.street.queue.length = 0;
  }
  for (let i = 0; i < 3; i++) r.render(0.016);
  const cam = (r as unknown as { cam: { ox: number; oy: number; s: number } }).cam;
  const [px, py] = P(opt.cx ?? 5.5, opt.cy ?? 3.6);
  const sx = cam.ox + px * cam.s;
  const sy = cam.oy + py * cam.s;
  const w = (opt.w ?? 230) * cam.s;
  const h = (opt.h ?? 230) * cam.s;
  overlay().getContext('2d')!.drawImage(c, sx - w / 2, sy - h * 0.8, w, h, slot * 533, 0, 533, (533 * h) / w);
  c.remove();
}
