// The food truck (replaces the table): two serving places in a big window, a neon sign on the roof,
// a logo on the side, bar stools along the side and a little bistro table. Colours, logo and sign text
// come from the player's choice (S.truck).
import { CONFIG } from '../../core/config';
import { TRUCK_LOGOS, TRUCK_SKINS } from '../../data/truck';
import { registerProcs, type SpriteCall } from '../assets';
import { ENV } from '../env';
import { box, circle, ellipse, emoji, faceX, faceY, line, P, poly, rrect, shadow, type Ctx } from '../iso';

const SX = CONFIG.STAND.x;
const SY = CONFIG.STAND.y;
/** Footprint (tiles) and body height (px); the body stands on wheels 8 px above the ground. */
export const TRUCK = { x0: SX - 1.35, y0: SY - 1.05, w: 2.6, d: 1.1, h: 62, z0: 8 };

export interface TruckWorker {
  kind: 'player' | 'helper';
  /** Place in the window: 0 = right counter, 1 = left counter, 2 = in the middle at the back. */
  slot: number;
  serving: boolean;
  girl: boolean;
}

interface TruckCall extends SpriteCall {
  skin: number;
  logo: number;
  label: string;
  level: number;
  workers: TruckWorker[];
}

/** A worker seen through the window: head and shoulders. */
function bust(ctx: Ctx, u: number, w: TruckWorker): void {
  const bob = w.serving && !ENV.reduceMotion ? Math.sin(ENV.t * 12) * 1.2 : 0;
  const shirt = w.kind === 'helper' ? '#51cf66' : '#4dabf7';
  const back = w.slot === 2;
  const v = back ? -32 : -26;
  const s = back ? 0.85 : 1;
  rrect(ctx, u - 9 * s, v - 14 * s + bob, 18 * s, 16 * s, 6 * s, shirt);
  if (w.kind === 'helper') rrect(ctx, u - 6 * s, v - 10 * s + bob, 12 * s, 12 * s, 3 * s, '#69db7c');
  circle(ctx, u, v - 20 * s + bob, 7 * s, '#f6cfae');
  ctx.fillStyle = w.girl ? '#8a4b2a' : '#4a3020';
  ctx.beginPath();
  ctx.arc(u, v - 22 * s + bob, 7.4 * s, Math.PI, 0);
  ctx.fill();
  if (w.girl) rrect(ctx, u + 4 * s, v - 22 * s + bob, 4 * s, 12 * s, 2 * s, '#8a4b2a');
  circle(ctx, u - 2.4 * s, v - 20 * s + bob, 1 * s, '#2b2b2b');
  circle(ctx, u + 2.4 * s, v - 20 * s + bob, 1 * s, '#2b2b2b');
  if (w.serving) {
    // pouring a cup
    rrect(ctx, u + 7 * s, v - 8 * s + bob, 5 * s, 7 * s, 1.5, '#ffffff', '#ced4da', 0.6);
    rrect(ctx, u + 7.5 * s, v - 5 * s + bob, 4 * s, 3.5 * s, 1, '#fcc419');
  }
}

function wheel(ctx: Ctx, x: number, y: number): void {
  const [wx, wy] = P(x, y, 7);
  ellipse(ctx, wx, wy, 8, 7, '#212529');
  ellipse(ctx, wx, wy, 3.5, 3, '#adb5bd');
}

function stool(ctx: Ctx, x: number, y: number, seat: string): void {
  const [bx, by] = P(x, y);
  shadow(ctx, bx, by, 7, 0.14);
  line(ctx, bx, by, bx, by - 20, '#868e96', 2);
  line(ctx, bx - 4, by - 1, bx + 4, by - 1, '#868e96', 1.5);
  ellipse(ctx, bx, by - 21, 7, 3.4, seat, 'rgba(0,0,0,0.25)', 1);
}

function bistro(ctx: Ctx, x: number, y: number, trim: string): void {
  const [bx, by] = P(x, y);
  shadow(ctx, bx, by, 16, 0.14);
  line(ctx, bx, by, bx, by - 18, '#495057', 2.5);
  ellipse(ctx, bx, by - 19, 13, 6.5, '#ffffff', trim, 1.5);
  for (const dx of [-0.42, 0.42]) {
    const [cx, cy] = P(x + dx, y + 0.12);
    line(ctx, cx, cy, cx, cy - 11, '#868e96', 1.5);
    rrect(ctx, cx - 5, cy - 14, 10, 4, 2, trim);
    rrect(ctx, cx - 5, cy - 24, 3, 11, 1.5, trim);
  }
  // a cup of lemonade on the table
  rrect(ctx, bx - 2, by - 26, 4, 6, 1, '#fff3bf', '#ced4da', 0.6);
}

function neonSign(ctx: Ctx, w: number, label: string, neon: string): void {
  rrect(ctx, 0, -24, w, 22, 5, '#1a1b26', neon, 2);
  // neon flickers now and then and glows brighter in the evening
  const k = ENV.t % 4.3;
  const flick = !ENV.reduceMotion && k > 4.0 && k < 4.12 ? 0.3 : 1;
  ctx.save();
  ctx.shadowColor = neon;
  ctx.shadowBlur = (8 + 10 * ENV.dusk) * flick;
  ctx.globalAlpha = 0.35 + 0.65 * flick;
  ctx.font = `900 ${label.length > 10 ? 10 : 12}px "Nunito", "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = neon;
  ctx.fillText(label, w / 2, -12.5);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(label, w / 2, -12.5);
  ctx.restore();
}

function truck(ctx: Ctx, c: TruckCall): void {
  const sk = TRUCK_SKINS[c.skin] ?? TRUCK_SKINS[0];
  const { x0, y0, w, d, h, z0 } = TRUCK;
  const W = w * 32;
  const D = d * 32;
  const [cx, cy] = P(x0 + w / 2, y0 + d / 2);
  ellipse(ctx, cx, cy + 6, 92, 30, 'rgba(0,0,0,0.16)');
  wheel(ctx, x0 + 0.45, y0 + d);
  wheel(ctx, x0 + w - 0.45, y0 + d);
  box(ctx, x0, y0, w, d, h, z0, sk.body, { top: '#f8f9fa' });
  // front: the serving window with the workers, a shelf and an awning
  faceY(ctx, x0, y0 + d, z0, () => {
    ctx.fillStyle = sk.trim;
    ctx.fillRect(0, -12, W, 6);
    rrect(ctx, 10, -56, W - 20, 32, 4, '#3b2f2f');
    ctx.save();
    ctx.beginPath();
    ctx.rect(10, -56, W - 20, 32);
    ctx.clip();
    const slotU = [W - 24, 24, W / 2];
    for (const wk of [...c.workers].sort((a, b) => Number(b.slot === 2) - Number(a.slot === 2))) bust(ctx, slotU[wk.slot] ?? W / 2, wk);
    ctx.restore();
    rrect(ctx, 6, -26, W - 12, 5, 2, sk.trim);
    // pitcher and cups on the shelf
    const lvl = Math.max(0, Math.min(1, c.level));
    rrect(ctx, W / 2 - 14, -37, 9, 12, 2, 'rgba(208,235,255,0.6)', '#74c0fc', 1);
    if (lvl > 0) rrect(ctx, W / 2 - 13, -26 - 10 * lvl, 7, 10 * lvl, 1.5, '#fcc419');
    for (let i = 0; i < 3; i++) rrect(ctx, W / 2 + 4, -30 - i * 3, 7, 3, 1, i === 2 ? '#ffffff' : '#f1f3f5', '#ced4da', 0.5);
    // striped awning
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (W - 8) / n;
      poly(ctx, [[4 + i * a, -60], [4 + (i + 1) * a, -60], [6 + (i + 1) * a, -50], [2 + i * a, -50]], i % 2 ? '#ffffff' : sk.awning);
    }
  });
  // side: logo and stripe, a fold-out bar shelf
  faceX(ctx, x0 + w, y0 + d, z0, () => {
    ctx.fillStyle = sk.trim;
    ctx.fillRect(0, -12, D, 6);
    circle(ctx, D / 2, -38, 13, '#ffffff', sk.trim, 2);
    emoji(ctx, TRUCK_LOGOS[c.logo] ?? TRUCK_LOGOS[0], D / 2, -38, 15);
    rrect(ctx, 3, -24, D - 6, 4, 2, '#8a5a35');
  });
  wheel(ctx, x0 + w, y0 + 0.3);
  // the neon sign on the roof
  faceY(ctx, x0 + 0.12, y0 + d - 0.08, z0 + h, () => neonSign(ctx, W - 8, c.label, sk.neon));
}

/** Where the bistro table and the bar stools of the truck stand (tiles): they are sorted among the people by depth. */
export const TRUCK_BISTRO = { x: TRUCK.x0 - 0.75, y: TRUCK.y0 + TRUCK.d + 0.4 };
export const TRUCK_STOOLS = { x: TRUCK.x0 + TRUCK.w + 0.3, y: TRUCK.y0 + 0.47 };

export function drawTruckBistro(ctx: Ctx, skin: number): void {
  const sk = TRUCK_SKINS[skin] ?? TRUCK_SKINS[0];
  bistro(ctx, TRUCK_BISTRO.x, TRUCK_BISTRO.y, sk.trim);
}

export function drawTruckStools(ctx: Ctx, skin: number): void {
  const sk = TRUCK_SKINS[skin] ?? TRUCK_SKINS[0];
  for (let i = 0; i < 3; i++) stool(ctx, TRUCK.x0 + TRUCK.w + 0.3, TRUCK.y0 + 0.15 + i * 0.32, sk.awning);
}

registerProcs({
  stand_truck: (ctx, c) => truck(ctx, c as TruckCall),
});
