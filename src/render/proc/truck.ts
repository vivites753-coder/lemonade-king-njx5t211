// The food truck (replaces the table): two serving places in a big window, a neon sign on the roof,
// a logo on the side, bar stools along the side and a little bistro table. Colours, logo and sign text
// come from the player's choice (S.truck).
import { CONFIG } from '../../core/config';
import { TRUCK_LOGOS, TRUCK_SKINS } from '../../data/truck';
import artJson from '../../../assets/stand/truck.json';
import { playerLook } from '../../sim/looks';
import { drawSprite, getImage, metaFor, registerProcs, type SpriteCall } from '../assets';
import { ENV } from '../env';
import { box, circle, ellipse, emoji, faceX, faceY, line, P, poly, rrect, shadow, type Ctx } from '../iso';
import { drawCharacter, standSpriteId } from './people';

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

/** Height of a seller picture at scale 1 (world px). */
const SELLER_H = 45;

/** For every colour of the truck picture: the open window and the sign board as corners (fractions of the picture). */
const TRUCK_ART = artJson as unknown as Record<string, { window: number[][]; clip?: number[][]; sign: number[][]; aspect: number }>;

/** Screen position of the truck picture and of the corners of its window and sign. */
function truckPlace(c: SpriteCall, skinId: string) {
  const id = `stand_truck_${skinId}`;
  const img = getImage(id);
  const art = TRUCK_ART[skinId];
  if (!img || !art) return null;
  const m = metaFor(id);
  const h = m.h * c.s;
  const w = h * art.aspect;
  const left = c.sx + (m.dx ?? 0) - w * m.anchor[0];
  const top = c.sy + (m.dy ?? 0) - h * m.anchor[1];
  const pt = (f: number[]): [number, number] => [left + f[0] * w, top + f[1] * h];
  return { id, left, top, w, h, window: art.window.map(pt), clip: (art.clip ?? art.window).map(pt), sign: art.sign.map(pt) };
}

/** Where the speaker stands on the roof of the truck: right next to the sign board (screen px), or null without art. */
export function truckRoofSpot(skin: number, sx: number, sy: number): [number, number] | null {
  const sk = TRUCK_SKINS[skin] ?? TRUCK_SKINS[0];
  const place = truckPlace({ x: 0, y: 0, sx, sy, s: 1 }, sk.id);
  if (!place) return null;
  const br = place.sign[2];
  return [br[0] + 13, br[1] + 3];
}

/** The sign board of the truck: the text (and the chosen logo) glow on the dark board, lying on its surface. */
function signText(ctx: Ctx, sign: [number, number][], text: string, neon: string): void {
  const [tl, tr, , bl] = sign;
  const BW = 100;
  const BH = 26;
  ctx.save();
  ctx.transform((tr[0] - tl[0]) / BW, (tr[1] - tl[1]) / BW, (bl[0] - tl[0]) / BH, (bl[1] - tl[1]) / BH, tl[0], tl[1]);
  const k = ENV.t % 4.3;
  const flick = !ENV.reduceMotion && k > 4.0 && k < 4.12 ? 0.3 : 1;
  ctx.shadowColor = neon;
  ctx.shadowBlur = (6 + 8 * ENV.dusk) * flick;
  ctx.globalAlpha = 0.4 + 0.6 * flick;
  let size = 15;
  ctx.font = `900 ${size}px "Nunito", "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
  const wide = ctx.measureText(text).width;
  if (wide > BW - 12) {
    size = Math.max(7, (size * (BW - 12)) / wide);
    ctx.font = `900 ${size}px "Nunito", "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = neon;
  ctx.fillText(text, BW / 2, BH / 2 + 0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fillText(text, BW / 2, BH / 2 + 0.5);
  ctx.restore();
}

/** The truck as a picture: the sellers are seen only through the open window, the sign board shows the text. */
function truckPicture(ctx: Ctx, c: TruckCall): boolean {
  const sk = TRUCK_SKINS[c.skin] ?? TRUCK_SKINS[0];
  const place = truckPlace(c, sk.id);
  if (!place) return false;
  drawSprite(ctx, place.id, c);
  // the sellers: only what is inside the window shows; the awning over the window is drawn again over them (it covers
  // the tops of their heads), and so is the shelf
  const win = place.window as [number, number][];
  const clip = place.clip as [number, number][];
  const xs = win.map((p) => p[0]);
  const ys = win.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const topAt = (x: number) => {
    const t = (x - win[0][0]) / Math.max(1, win[1][0] - win[0][0]);
    return win[0][1] + (win[1][1] - win[0][1]) * Math.max(0, Math.min(1, t));
  };
  const bottomAt = (x: number) => {
    const t = (x - win[3][0]) / Math.max(1, win[2][0] - win[3][0]);
    return win[3][1] + (win[2][1] - win[3][1]) * Math.max(0, Math.min(1, t));
  };
  const n = c.workers.length;
  const spots = n >= 3 ? [0.18, 0.5, 0.82] : n === 2 ? [0.3, 0.72] : [0.58];
  // the sellers are sized to the window: the head, the shoulders and the chest show over the shelf
  const mid = x0 + (x1 - x0) * 0.5;
  const winH = (bottomAt(mid) - topAt(mid)) / c.s;
  const sc = Math.max(0.45, Math.min(0.9, winH / (SELLER_H * 0.55))) * (n >= 3 ? 0.86 : n === 2 ? 0.94 : 1);
  const girlId = (w: TruckWorker) => (w.girl ? 'girl' : 'boy');
  ctx.save();
  ctx.beginPath();
  clip.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  ctx.clip();
  // the one in the middle at the back is drawn first
  const order = [...c.workers].sort((a, b) => Number(b.slot === 2) - Number(a.slot === 2));
  order.forEach((wk, i) => {
    const x = x0 + (x1 - x0) * spots[Math.min(i, spots.length - 1)];
    const base = `char_${wk.kind}_${girlId(wk)}`;
    const pick = standSpriteId(base, wk.serving, false);
    // the top of the head is a little above the window, behind the awning
    const m = metaFor(pick.id);
    const feet = topAt(x) - 3.5 * c.s + m.h * m.anchor[1] * sc;
    drawCharacter(ctx, pick.id, 0, 0, x, feet, {
      kind: 'player',
      hasCup: pick.cup,
      look: playerLook(girlId(wk)),
      scale: sc,
      moving: false,
      anim: 0,
      facingCam: true,
      dirX: -1,
      serving: wk.serving,
      t: ENV.t,
    });
  });
  ctx.restore();
  const front = getImage(`${place.id}_front`);
  if (front) ctx.drawImage(front, place.left, place.top, place.w, place.h);

  // the text of the neon sign (with the chosen logo in front of it)
  const logo = TRUCK_LOGOS[c.logo] ?? TRUCK_LOGOS[0];
  signText(ctx, place.sign as [number, number][], `${logo} ${c.label}`, sk.neon);
  void ys;
  return true;
}

function truck(ctx: Ctx, c: TruckCall): void {
  if (truckPicture(ctx, c)) return;
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

/** Warm trucks get orange stools, cool ones mint green. */
const STOOL_OF: Record<string, string> = { lemon: 'a', retro: 'a', berry: 'a', mint: 'b', sky: 'b', lilac: 'b' };

export function drawTruckBistro(ctx: Ctx, skin: number): void {
  const sk = TRUCK_SKINS[skin] ?? TRUCK_SKINS[0];
  const [bx, by] = P(TRUCK_BISTRO.x, TRUCK_BISTRO.y);
  if (getImage('stand_truck_bistro')) {
    drawSprite(ctx, 'stand_truck_bistro', { x: TRUCK_BISTRO.x, y: TRUCK_BISTRO.y, sx: bx, sy: by, s: 1 });
    return;
  }
  bistro(ctx, TRUCK_BISTRO.x, TRUCK_BISTRO.y, sk.trim);
}

export function drawTruckStools(ctx: Ctx, skin: number): void {
  const sk = TRUCK_SKINS[skin] ?? TRUCK_SKINS[0];
  const id = `stand_truck_stool_${STOOL_OF[sk.id] ?? 'a'}`;
  for (let i = 0; i < 3; i++) {
    const x = TRUCK.x0 + TRUCK.w + 0.3;
    const y = TRUCK.y0 + 0.15 + i * 0.32;
    if (getImage(id)) {
      const [sx, sy] = P(x, y);
      drawSprite(ctx, id, { x, y, sx, sy, s: 1 });
    } else stool(ctx, x, y, sk.awning);
  }
}

registerProcs({
  stand_truck: (ctx, c) => truck(ctx, c as TruckCall),
});
