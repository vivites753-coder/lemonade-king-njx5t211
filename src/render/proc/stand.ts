// The lemonade stand. Every upgrade is a separate layer (own asset ID) so it visibly appears when bought.
import { CONFIG } from '../../core/config';
import { LOCATIONS } from '../../data/locations';
import { t } from '../../i18n';
import type { SceneSource } from '../../sim/pointScene';
import { playerLook } from '../../sim/looks';
import { lemonsTotal } from '../../sim/state';
import { drawSprite, getImage, hasImage, metaFor, registerProcs, spriteShadow, type SpriteCall } from '../assets';
import { ENV } from '../env';
import { box, circle, ellipse, faceX, faceY, line, P, poly, rrect, shadow, text, type Ctx } from '../iso';
import { drawCharacter, standSpriteId } from './people';
import { brokenMark } from './standExtras';
import { TRUCK_SKINS } from '../../data/truck';
import { counterDy, DOOR, ROOM_D } from '../../data/storeRoom';
import { drawTruckBistro, drawTruckStools, TRUCK_BISTRO, TRUCK_STOOLS, truckRoofSpot, type TruckWorker } from './truck';

const SX = CONFIG.STAND.x;
const SY = CONFIG.STAND.y;
const TABLE_H = 22;
/** Where the price is written on the picture of the sign, from the picture's anchor point. */
const SIGN_TEXT = { x: 0, y: -24 };
/** Height of the truck roof (the speaker stands on it). */
const TRUCK_SPEAKER_Z = 62;

interface StandCall extends SpriteCall {
  price?: number;
  level?: number;
  on?: boolean;
  lemons?: number;
}

function table(ctx: Ctx): void {
  const x0 = SX - 0.8;
  const y0 = SY - 0.45;
  const [cx, cy] = P(SX, SY);
  shadow(ctx, cx, cy + 4, 46, 0.18);
  box(ctx, x0, y0, 1.6, 0.9, TABLE_H, 0, '#fffaf0', { top: '#fff4cc' });
  faceY(ctx, x0, y0 + 0.9, 0, () => {
    for (let i = 0; i < 8; i++) if (i % 2 === 0) {
      ctx.fillStyle = '#ffd43b';
      ctx.fillRect(i * 6.4, -TABLE_H, 6.4, TABLE_H);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, -3, 51.2, 3);
  });
  faceX(ctx, x0 + 1.6, y0 + 0.9, 0, () => {
    for (let i = 0; i < 5; i++) if (i % 2 === 0) {
      ctx.fillStyle = '#f2c22e';
      ctx.fillRect(i * 5.76, -TABLE_H, 5.76, TABLE_H);
    }
  });
}

/**
 * The counter of the own store (level 4): as long as the big stand (both its tables), with a glass case of lemons in
 * its front and a turquoise trim. The things on it are the stand's, in the same places.
 */
function storeCounter(ctx: Ctx): void {
  const x0 = SX - 2.0;
  const y0 = SY - 0.45;
  const w = 2.8;
  const [cx, cy] = P(SX - 0.6, SY);
  shadow(ctx, cx, cy + 4, 70, 0.18);
  box(ctx, x0, y0, w, 0.9, TABLE_H, 0, '#ffe8a3', { top: '#fffaf0' });
  faceY(ctx, x0, y0 + 0.9, 0, () => {
    const front = w * 32;
    // the glass case on the left, wood on the right
    rrect(ctx, 3, -TABLE_H + 3, front * 0.4, TABLE_H - 6, 2, '#d0ebff', '#ffffff', 1.5);
    for (let i = 0; i < 4; i++) ellipse(ctx, 9 + i * 8, -6, 3.4, 2.6, '#ffd43b', '#e8b500', 0.6);
    line(ctx, 6, -TABLE_H + 6, 14, -TABLE_H + 12, 'rgba(255,255,255,0.8)', 2);
    ctx.fillStyle = '#c58b4f';
    ctx.fillRect(front * 0.43, -TABLE_H + 2, front * 0.57 - 2, TABLE_H - 4);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 4; i++) ctx.fillRect(front * 0.43 + 4 + i * 12, -TABLE_H + 4, 1.5, TABLE_H - 8);
    ctx.fillStyle = '#2bb3a3';
    ctx.fillRect(0, -TABLE_H, front, 2.5);
    ctx.fillRect(0, -2.5, front, 2.5);
  });
}

function chair(ctx: Ctx): void {
  const x = SX + 0.55;
  const y = SY - 1.25;
  for (const [dx, dy] of [
    [0, 0],
    [0.32, 0],
    [0, 0.32],
    [0.32, 0.32],
  ])
    box(ctx, x + dx, y + dy, 0.05, 0.05, 12, 0, '#8a5a35');
  box(ctx, x, y, 0.37, 0.37, 3, 12, '#c58b4f');
  box(ctx, x, y, 0.37, 0.05, 16, 15, '#b07a43');
}

function pitcher(ctx: Ctx, level: number): void {
  const x = SX - 0.32;
  const y = SY - 0.12;
  const h = 26;
  const liquid = Math.max(0, Math.min(1, level));
  if (liquid > 0) box(ctx, x + 0.02, y + 0.02, 0.24, 0.24, (h - 4) * liquid, TABLE_H + 1, '#fcc419', { top: '#ffe066', left: '#fcc419', right: '#f2b705' });
  box(ctx, x, y, 0.28, 0.28, h, TABLE_H, '#d0ebff', { top: 'rgba(208,235,255,0.15)', left: 'rgba(208,235,255,0.22)', right: 'rgba(165,216,255,0.28)', stroke: 'rgba(116,192,252,0.9)' });
  const [hx, hy] = P(x + 0.28, y + 0.14, TABLE_H + 14);
  ctx.beginPath();
  ctx.arc(hx + 3, hy, 6, -Math.PI / 2, Math.PI / 2);
  ctx.strokeStyle = 'rgba(116,192,252,0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (liquid > 0.05) {
    const [lx, ly] = P(x + 0.1, y + 0.1, TABLE_H + 4 + (h - 6) * liquid);
    circle(ctx, lx, ly, 2.5, '#fab005');
  }
}

function cups(ctx: Ctx): void {
  const [x, y] = P(SX + 0.2, SY + 0.15, TABLE_H);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 3 - i * 3);
    ctx.lineTo(x + 5, y - 3 - i * 3);
    ctx.lineTo(x + 4, y - i * 3);
    ctx.lineTo(x - 4, y - i * 3);
    ctx.closePath();
    ctx.fillStyle = i === 3 ? '#ffffff' : '#f1f3f5';
    ctx.fill();
    ctx.strokeStyle = '#ced4da';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
}

function lemonPile(ctx: Ctx, n: number): void {
  const [x, y] = P(SX - 0.62, SY + 0.12, TABLE_H);
  const count = Math.min(6, n);
  const spots = [
    [0, 0],
    [7, 1],
    [-7, 1],
    [3, -4],
    [-3, -4],
    [0, -8],
  ];
  for (let i = 0; i < count; i++) {
    ellipse(ctx, x + spots[i][0], y + spots[i][1] - 3, 5, 4, '#ffd43b', '#e8b500', 0.8);
    circle(ctx, x + spots[i][0] - 1.5, y + spots[i][1] - 4.5, 1.2, 'rgba(255,255,255,0.7)');
  }
}

function coinJar(ctx: Ctx, coins: number): void {
  const [x, y] = P(SX + 0.6, SY - 0.1, TABLE_H);
  rrect(ctx, x - 5, y - 13, 10, 13, 3, 'rgba(208,235,255,0.5)', '#74c0fc', 1);
  const lvl = Math.min(11, coins / 12);
  if (lvl > 0.5) rrect(ctx, x - 4, y - lvl - 1, 8, lvl, 2, '#fcc419');
}

function juicer(ctx: Ctx, lever: boolean): void {
  const x = SX + 0.22;
  const y = SY - 0.3;
  if (lever) {
    box(ctx, x, y, 0.22, 0.22, 4, TABLE_H, '#868e96');
    box(ctx, x + 0.07, y + 0.07, 0.07, 0.07, 22, TABLE_H + 4, '#ced4da');
    box(ctx, x - 0.02, y - 0.02, 0.26, 0.26, 5, TABLE_H + 20, '#fa5252');
    const [px, py] = P(x + 0.11, y + 0.11, TABLE_H + 25);
    const a = ENV.reduceMotion ? 0 : Math.sin(ENV.t * 2) * 0.2;
    line(ctx, px, py, px + Math.cos(-0.6 + a) * 18, py + Math.sin(-0.6 + a) * 18, '#495057', 2.5);
    circle(ctx, px + Math.cos(-0.6 + a) * 18, py + Math.sin(-0.6 + a) * 18, 3, '#212529');
  } else {
    const [cx, cy] = P(x + 0.11, y + 0.11, TABLE_H);
    ellipse(ctx, cx, cy - 2, 9, 4.5, '#ffffff', '#ced4da', 0.8);
    poly(ctx, [[cx - 4, cy - 3], [cx + 4, cy - 3], [cx, cy - 12]], '#f1f3f5', '#ced4da', 0.8);
  }
}

function flyers(ctx: Ctx): void {
  const [x, y] = P(SX + 0.5, SY + 0.28, TABLE_H);
  for (let i = 0; i < 3; i++) poly(ctx, [[x - 7, y - i * 1.5], [x + 1, y - 4 - i * 1.5], [x + 8, y - i * 1.5], [x, y + 4 - i * 1.5]], i === 2 ? '#ffffff' : '#fff3bf', '#ced4da', 0.5);
  circle(ctx, x, y - 3, 2, '#ffd43b');
}

/** The banner hangs on the front of the table, facing the street, so it is never hidden by the umbrella. */
function banner(ctx: Ctx): void {
  faceY(ctx, SX - 0.8, SY + 0.45, 0, () => {
    const w = 1.6 * 32;
    const wave = ENV.reduceMotion ? 0 : Math.sin(ENV.t * 3) * (ENV.weather === 'wind' ? 1.5 : 0.6);
    ctx.beginPath();
    ctx.moveTo(-1, -TABLE_H + 1);
    ctx.lineTo(w + 1, -TABLE_H + 1);
    ctx.lineTo(w + 1, -2 + wave);
    ctx.quadraticCurveTo(w / 2, 3 + wave, -1, -2 + wave);
    ctx.closePath();
    ctx.fillStyle = '#ffd43b';
    ctx.fill();
    ctx.strokeStyle = '#f08c00';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    circle(ctx, 5, -TABLE_H / 2, 3.2, '#fab005');
    circle(ctx, w - 5, -TABLE_H / 2, 3.2, '#fab005');
    text(ctx, t('world.banner'), w / 2, -TABLE_H / 2 + 0.5, 8.5, '#c92a2a', 'center', 900);
  });
}

function sign(ctx: Ctx, price: number): void {
  const x = SX - 1.62;
  const y = SY + 0.5;
  box(ctx, x + 0.02, y - 0.1, 0.04, 0.04, 34, 0, '#8a5a35');
  box(ctx, x + 0.46, y - 0.1, 0.04, 0.04, 34, 0, '#8a5a35');
  faceY(ctx, x, y, 6, () => {
    rrect(ctx, -1, -33, 18, 33, 2, '#b07a43');
    rrect(ctx, 1, -31, 14, 29, 1.5, '#2f4f3f');
    text(ctx, '🍋', 8, -24, 7, '#ffffff', 'center', 400);
    text(ctx, String(price), 8, -12, 9, '#ffffff', 'center', 900);
    circle(ctx, 8, -5, 2, '#fcc419');
  });
}

function speaker(ctx: Ctx, on: boolean): void {
  const x = SX + 1.05;
  const y = SY - 0.6;
  box(ctx, x, y, 0.36, 0.36, 30, 0, '#343a40');
  faceY(ctx, x, y + 0.36, 0, () => {
    circle(ctx, 6, -20, 3.4, '#868e96', '#212529', 1);
    circle(ctx, 6, -9, 4.6, '#868e96', '#212529', 1);
  });
  const [sx, sy] = P(x + 0.18, y + 0.36, 20);
  if (on && !ENV.reduceMotion) {
    for (let i = 0; i < 3; i++) {
      const k = (ENV.t * 0.9 + i / 3) % 1;
      ctx.beginPath();
      ctx.arc(sx - 4, sy, 8 + k * 26, Math.PI * 0.55, Math.PI * 1.1);
      ctx.strokeStyle = `rgba(255,146,43,${0.9 * (1 - k)})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    const k = (ENV.t * 0.6) % 1;
    text(ctx, '♪', sx - 18 - k * 10, sy - 18 - k * 22, 12, `rgba(255,146,43,${1 - k})`);
  }
  if (on) circle(ctx, sx + 4, sy - 22, 1.8, '#51cf66');
}

function umbrella(ctx: Ctx): void {
  const [px, py] = P(SX + 0.7, SY - 0.15);
  line(ctx, px, py, px, py - 96, '#dee2e6', 3);
  const [cx, cy] = P(SX + 0.15, SY - 0.25, 92);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.5);
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 62, (i / 10) * Math.PI * 2, ((i + 1) / 10) * Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? '#ffffff' : '#ff922b';
    ctx.fill();
  }
  ctx.restore();
  ellipse(ctx, cx, cy - 2, 62, 31, undefined, 'rgba(0,0,0,0.08)', 2);
  circle(ctx, cx, cy - 3, 3, '#e8590c');
}

function bike(ctx: Ctx): void {
  const x = SX - 2.05;
  const y = SY - 0.95;
  faceY(ctx, x, y, 0, () => {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#212529';
    ctx.beginPath();
    ctx.arc(6, -8, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(30, -8, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#4dabf7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(6, -8);
    ctx.lineTo(16, -20);
    ctx.lineTo(27, -20);
    ctx.lineTo(30, -8);
    ctx.moveTo(16, -20);
    ctx.lineTo(18, -8);
    ctx.lineTo(6, -8);
    ctx.stroke();
    rrect(ctx, 26, -30, 10, 7, 2, '#ffd43b');
    line(ctx, 14, -22, 13, -26, '#212529', 2);
  });
}

function soldOutPlate(ctx: Ctx): void {
  faceY(ctx, SX - 0.55, SY + 0.45, 6, () => {
    rrect(ctx, 0, -14, 35, 12, 3, '#fa5252');
    text(ctx, t('world.soldout'), 17.5, -8, 5.5, '#ffffff');
  });
}

registerProcs({
  stand_table: (ctx) => table(ctx),
  stand_store_counter: (ctx) => storeCounter(ctx),
  stand_store_terminal: (ctx) => {
    const [x, y] = P(SX + 0.55, SY + 0.22, TABLE_H);
    rrect(ctx, x - 5, y - 11, 10, 11, 2, '#343a40');
    rrect(ctx, x - 3.5, y - 9.5, 7, 4, 1, '#74c0fc');
    for (let i = 0; i < 3; i++) circle(ctx, x - 2.5 + i * 2.5, y - 3, 0.9, '#ced4da');
  },
  stand_chair: (ctx) => chair(ctx),
  stand_banner: (ctx) => banner(ctx),
  stand_sign: (ctx, c) => sign(ctx, (c as StandCall).price ?? 0),
  stand_speaker: (ctx, c) => speaker(ctx, !!(c as StandCall).on),
  stand_umbrella: (ctx) => umbrella(ctx),
  stand_bike: (ctx) => bike(ctx),
  stand_flyers: (ctx) => flyers(ctx),
  stand_juicer_hand: (ctx) => juicer(ctx, false),
  stand_juicer_lever: (ctx) => juicer(ctx, true),
  item_pitcher: (ctx, c) => pitcher(ctx, (c as StandCall).level ?? 0),
  item_cups_pack: (ctx) => cups(ctx),
  item_lemon_pile: (ctx, c) => lemonPile(ctx, (c as StandCall).lemons ?? 0),
});

/** The three visible legs of the tent picture: a strip of the picture (fractions) and the point where the leg stands. */
const TENT_LEGS = [
  { x0: 0.0155, x1: 0.0654, top: 0.385, fx: 0.0396, fy: 0.76 },
  { x0: 0.4664, x1: 0.5164, top: 0.582, fx: 0.4905, fy: 0.985 },
  { x0: 0.9225, x1: 0.9725, top: 0.385, fx: 0.9466, fy: 0.758 },
];

/** Screen box of the tent picture (over a big stand it moves left and grows so it covers both tables). */
function tentBox(wide: boolean): { left: number; top: number; w: number; h: number } | null {
  const img = getImage('stand_tent');
  if (!img) return null;
  const m = metaFor('stand_tent');
  const h = m.h * (wide ? 1.22 : 1);
  const w = (h * img.naturalWidth) / img.naturalHeight;
  const [sx, sy] = P(SX, SY);
  const [ox, oy] = wide ? P(-0.6, 0) : [0, 0];
  const ax = sx + ox + (m.dx ?? 0);
  const ay = sy + oy + (m.dy ?? 0);
  return { left: ax - w * m.anchor[0], top: ay - h * m.anchor[1], w, h };
}

/** World px on the ground back to tiles (the inverse of P with z = 0). */
function toTile(px: number, py: number): [number, number] {
  return [(px / 32 + py / 16) / 2, (py / 16 - px / 32) / 2];
}

/** The top part of the umbrella picture (the canopy), drawn again over the people at the stand. */
const CANOPY_SHARE = 0.54;
function umbrellaCanopy(ctx: Ctx, sx: number, sy: number, wide: boolean, alpha: number): void {
  const img = getImage('stand_umbrella');
  if (!img) return;
  const m = metaFor('stand_umbrella');
  const h = m.h;
  const w = (h * img.naturalWidth) / img.naturalHeight;
  const left = sx + (m.dx ?? 0) - w * m.anchor[0];
  const top = sy + (m.dy ?? 0) - h * m.anchor[1];
  shifted(ctx, wide, -0.6, 0, () => {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.beginPath();
    ctx.rect(left - 2, top - 2, w + 4, h * CANOPY_SHARE + 2);
    ctx.clip();
    ctx.drawImage(img, left, top, w, h);
    ctx.restore();
  });
}

/** The pitcher picture: the empty one, with the full one shown up to the lemonade level. */
function pitcherPicture(ctx: Ctx, sx: number, sy: number, level: number): void {
  const call = { x: SX, y: SY, sx, sy, s: 1 };
  drawSprite(ctx, 'item_pitcher_empty', call);
  const img = getImage('item_pitcher_full');
  if (!img || level <= 0.02) return;
  const m = metaFor('item_pitcher_full');
  const h = m.h;
  const w = (h * img.naturalWidth) / img.naturalHeight;
  const left = sx + (m.dx ?? 0) - w * m.anchor[0];
  const top = sy + (m.dy ?? 0) - h * m.anchor[1];
  // the liquid fills the lower 80 % of the picture
  const cut = top + h * (0.18 + 0.8 * (1 - level));
  ctx.save();
  ctx.beginPath();
  ctx.rect(left - 2, cut, w + 4, top + h - cut + 2);
  ctx.clip();
  ctx.drawImage(img, left, top, w, h);
  ctx.restore();
}

/** The second counter of the big stand: a table section to the left with its own pitcher and cups. */
function table2(ctx: Ctx, level: number): void {
  const x0 = SX - 2.0;
  const y0 = SY - 0.45;
  if (hasImage('stand_table_blue')) {
    const [sx, sy] = P(SX, SY);
    drawSprite(ctx, 'stand_table_blue', { x: SX, y: SY, sx, sy, s: 1 });
  } else {
    box(ctx, x0, y0, 1.2, 0.9, TABLE_H, 0, '#fffaf0', { top: '#fff4cc' });
    faceY(ctx, x0, y0 + 0.9, 0, () => {
      for (let i = 0; i < 6; i++) if (i % 2 === 0) {
        ctx.fillStyle = '#74c0fc';
        ctx.fillRect(i * 6.4, -TABLE_H, 6.4, TABLE_H);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, -3, 38.4, 3);
    });
  }
  table2Items(ctx, level);
}

/** The pitcher and the cups of the second counter (on the blue table, or on the left of the store's counter). */
function table2Items(ctx: Ctx, level: number): void {
  if (hasImage('item_pitcher_full') && hasImage('item_cups_pack')) {
    // the same pictures as on the main table, moved onto the blue one
    const [sx, sy] = P(SX, SY);
    pitcherPicture(ctx, sx - 40, sy - 21.6, Math.max(0, Math.min(1, level)));
    drawSprite(ctx, 'item_cups_pack', { x: SX, y: SY, sx: sx - 42.2, sy: sy - 22.1, s: 1 });
    return;
  }
  const px = SX - 1.6;
  const py = SY - 0.15;
  const liquid = Math.max(0, Math.min(1, level));
  if (liquid > 0) box(ctx, px + 0.02, py + 0.02, 0.2, 0.2, 18 * liquid, TABLE_H + 1, '#fcc419', { top: '#ffe066', left: '#fcc419', right: '#f2b705' });
  box(ctx, px, py, 0.24, 0.24, 22, TABLE_H, '#d0ebff', { top: 'rgba(208,235,255,0.15)', left: 'rgba(208,235,255,0.22)', right: 'rgba(165,216,255,0.28)', stroke: 'rgba(116,192,252,0.9)' });
  const [cx, cy] = P(SX - 1.15, SY + 0.12, TABLE_H);
  for (let i = 0; i < 3; i++) rrect(ctx, cx - 4, cy - 3 - i * 3, 8, 3, 1, i === 2 ? '#ffffff' : '#f1f3f5', '#ced4da', 0.6);
}

/** Draws something moved by (dx, dy) tiles: equipment makes room for a wide stand. */
function shifted(ctx: Ctx, on: boolean, dx: number, dy: number, draw: () => void): void {
  if (!on) {
    draw();
    return;
  }
  const [ox, oy] = P(dx, dy);
  ctx.save();
  ctx.translate(ox, oy);
  draw();
  ctx.restore();
}

/** Where the price sign stands, from its place in front of a small table: beside a wide stand, beside the truck, or
 * outside the store at its door (inside it would stand in the way of the queue). */
function signShift(g: SceneSource): [number, number] {
  if (LOCATIONS[g.S.location].store) return [DOOR.x0 - 0.75 - (SX - 0.9), ROOM_D + 0.85 - (SY + 1.0)];
  if (g.counters() < 2) return [0, 0];
  return g.active().truck ? [-2.3, 0.5] : [-1.9, -0.2];
}

/** Where people stand at a stand with two counters (0: right counter, 1: left counter, back: the player when two helpers work). */
const SPOTS = {
  single: { player: [SX - 0.1, SY - 0.85], playerWithHelper: [SX + 0.28, SY - 0.85], helper: [SX - 0.48, SY - 0.85] },
  wide: { c0: [SX - 0.1, SY - 0.85], c1: [SX - 1.35, SY - 0.85], back: [SX - 0.75, SY - 1.5] },
};

/** Things of the stand that stand apart from the table: each is sorted among the people by its own depth. */
export type StandPart = 'sign' | 'mascot' | 'tv' | 'table2' | 'tentleg0' | 'tentleg1' | 'tentleg2' | 'bistro' | 'stools';

/** How far back the whole stand stands here (tiles): in the own store its counter is at the back wall. */
export function standDy(g: SceneSource): number {
  return counterDy(!!LOCATIONS[g.S.location].store);
}

/** What stays where it is when the stand stands further back: the price sign and the mascot wait outside the store. */
const STAYS: StandPart[] = ['sign', 'mascot'];

/** Where the side parts of the stand stand now (tiles), for depth sorting. */
export function standSideParts(g: SceneSource): { part: StandPart; x: number; y: number }[] {
  const up = g.S.upgrades;
  const wide = g.counters() >= 2;
  const isTruck = !!g.active().truck;
  // the own store has one long counter (no blue table), and its awning instead of the tent
  const store = !!LOCATIONS[g.S.location].store;
  const out: { part: StandPart; x: number; y: number }[] = [];
  // the sign stands in front of the left end of the table: it is drawn after the table
  if (up.sign) {
    const [dx, dy] = signShift(g);
    out.push({ part: 'sign', x: SX - 0.9 + dx, y: SY + 1.0 + dy });
  }
  if (up.mascot) out.push({ part: 'mascot', x: SX - 1.55 + (wide ? -0.3 : 0), y: SY + 1.25 + (wide ? 1.0 : 0) });
  // next to the table, in front of the speaker and the scooter
  // next to a truck the TV moves further right, behind the bar stools
  if (up.tv) out.push({ part: 'tv', x: SX + 2.2 + (isTruck ? 0.8 : 0), y: SY + 0.35 });
  // the blue table of the big stand stands behind the people of the second queue, but in front of what is behind it
  if (wide && !isTruck && !store) out.push({ part: 'table2', x: SX - 1.0, y: SY });
  // the legs of the tent stand where they touch the ground: people pass in front of or behind each one
  const outdoor = !LOCATIONS[g.S.location].indoor && !isTruck && !store;
  const box = up.tent && outdoor ? tentBox(wide) : null;
  if (box) {
    TENT_LEGS.forEach((leg, i) => {
      const [tx, ty] = toTile(box.left + leg.fx * box.w, box.top + leg.fy * box.h);
      out.push({ part: `tentleg${i}` as StandPart, x: tx, y: ty });
    });
  }
  // the truck's bistro table and bar stools
  if (isTruck) {
    out.push({ part: 'bistro', x: TRUCK_BISTRO.x, y: TRUCK_BISTRO.y });
    out.push({ part: 'stools', x: TRUCK_STOOLS.x, y: TRUCK_STOOLS.y });
  }
  // in the store the rest stands at the counter, at the back
  const dy = standDy(g);
  return dy ? out.map((p) => (STAYS.includes(p.part) ? p : { ...p, y: p.y + dy })) : out;
}

/**
 * The price on the wooden board: a cream plaque with the number and a coin, lying in the slanted plane of the board
 * (the board of the picture falls to the right by about 20 degrees).
 */
function priceLabel(ctx: Ctx, cx: number, cy: number, price: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(1, 0.36, 0, 1, 0, 0);
  rrect(ctx, -11, -6.5, 22, 13, 3, '#fff3c4', '#7a4a22', 1.2);
  text(ctx, String(price), -3.5, 0.5, price >= 10 ? 9 : 10.5, '#5c3310', 'center', 900);
  circle(ctx, 6.5, 0, 3.3, '#fcc419', '#b8860b', 0.9);
  circle(ctx, 6.5, 0, 1.2, '#fff3c4');
  ctx.restore();
}

const TRUCK_SKIN_IDS = TRUCK_SKINS.map((s) => s.id);

/** The shadows of the stand on the ground (drawn before the stand and the people). */
export function drawStandShadows(ctx: Ctx, g: SceneSource): void {
  const S = g.S;
  const up = S.upgrades;
  const [sx, sy] = P(SX, SY);
  const wide = g.counters() >= 2;
  const isTruck = !!g.active().truck;
  const store = !!LOCATIONS[S.location].store;
  const outdoor = !LOCATIONS[S.location].indoor && !isTruck && !store;
  const dy = standDy(g);
  shifted(ctx, dy !== 0, 0, dy, () => {
    if (isTruck) {
      const skinId = TRUCK_SKIN_IDS[S.truck.skin] ?? TRUCK_SKIN_IDS[0];
      spriteShadow(ctx, `stand_truck_${skinId}`, sx, sy);
      const [bx, by] = P(TRUCK_BISTRO.x, TRUCK_BISTRO.y);
      spriteShadow(ctx, 'stand_truck_bistro', bx, by);
      for (let i = 0; i < 3; i++) {
        const [tx, ty] = P(TRUCK_STOOLS.x, TRUCK_STOOLS.y - 0.32 + i * 0.32);
        spriteShadow(ctx, 'stand_truck_stool_a', tx, ty);
      }
    } else {
      drawTableShadows(ctx, g, sx, sy, wide, outdoor, store);
    }
    // the parts that stand apart (next to the truck too): where drawStandPart draws them
    if (up.tv) shifted(ctx, isTruck, 0.8, 0, () => spriteShadow(ctx, 'stand_tv', sx, sy));
  });
  // (the sign and the mascot stay outside the store)
  if (up.sign) shifted(ctx, true, ...signShift(g), () => spriteShadow(ctx, 'stand_sign', sx, sy));
  if (up.mascot) shifted(ctx, wide, -0.3, 1.0, () => spriteShadow(ctx, 'stand_mascot', sx, sy));
}

/** The shadows of the table stand and what stands on and around it. */
function drawTableShadows(ctx: Ctx, g: SceneSource, sx: number, sy: number, wide: boolean, outdoor: boolean, store: boolean): void {
  const up = g.S.upgrades;
  if (up.tent && outdoor) shifted(ctx, wide, -0.6, 0, () => spriteShadow(ctx, 'stand_tent', sx, sy, wide ? 1.22 : 1));
  else if (up.umbrella && outdoor) shifted(ctx, wide, -0.6, 0, () => spriteShadow(ctx, 'stand_umbrella', sx, sy));
  if (store) spriteShadow(ctx, 'stand_store_counter', sx, sy);
  else {
    if (wide) spriteShadow(ctx, 'stand_table_blue', sx, sy);
    spriteShadow(ctx, 'stand_table', sx, sy);
  }
  if (up.scooter) spriteShadow(ctx, 'stand_scooter', sx, sy);
  else if (up.bike) spriteShadow(ctx, 'stand_bike', sx, sy);
  if (up.speaker) spriteShadow(ctx, 'stand_speaker', sx, sy);
  if (up.cooler) spriteShadow(ctx, 'stand_cooler', sx, sy);
}

/** Draws one side part of the stand (see standSideParts). */
export function drawStandPart(ctx: Ctx, g: SceneSource, part: StandPart): void {
  const dy = STAYS.includes(part) ? 0 : standDy(g);
  shifted(ctx, dy !== 0, 0, dy, () => drawPartHere(ctx, g, part));
}

function drawPartHere(ctx: Ctx, g: SceneSource, part: StandPart): void {
  const S = g.S;
  const br = S.broken;
  const [sx, sy] = P(SX, SY);
  const call = (extra: Partial<StandCall> = {}): StandCall => ({ x: SX, y: SY, sx, sy, s: 1, ...extra });
  const wide = g.counters() >= 2;
  const isTruck = !!g.active().truck;
  if (part === 'sign') {
    // the price sign stands at the side when the second queue needs the space in front
    shifted(ctx, true, ...signShift(g), () => {
      drawSprite(ctx, 'stand_sign', call({ price: S.price }));
      if (hasImage('stand_sign')) {
        // the picture has a blank board: the game writes the price on it
        const m = metaFor('stand_sign');
        priceLabel(ctx, sx + (m.dx ?? 0) + SIGN_TEXT.x, sy + (m.dy ?? 0) + SIGN_TEXT.y, S.price);
      }
    });
  } else if (part === 'tentleg0' || part === 'tentleg1' || part === 'tentleg2') {
    const box = tentBox(wide);
    const img = getImage('stand_tent');
    if (!box || !img) return;
    const leg = TENT_LEGS[Number(part.slice(-1))];
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.left + leg.x0 * box.w, box.top + leg.top * box.h, (leg.x1 - leg.x0) * box.w, (1 - leg.top) * box.h + 1);
    ctx.clip();
    ctx.drawImage(img, box.left, box.top, box.w, box.h);
    ctx.restore();
  } else if (part === 'bistro') {
    drawTruckBistro(ctx, S.truck.skin);
  } else if (part === 'stools') {
    drawTruckStools(ctx, S.truck.skin);
  } else if (part === 'table2') {
    table2(ctx, g.phase === 'sell' ? g.D.cupsReady / CONFIG.CUPS_PER_PITCHER : 0.6);
  } else if (part === 'mascot') {
    const hop = hasImage('stand_mascot') && !ENV.reduceMotion ? Math.abs(Math.sin(ENV.t * 4)) * 4 : 0;
    shifted(ctx, wide, -0.3, 1.0, () => drawSprite(ctx, 'stand_mascot', call({ sy: sy - hop })));
  } else {
    shifted(ctx, isTruck, 0.8, 0, () => drawSprite(ctx, 'stand_tv', call({ on: !!br.tv })));
    if (br.tv) brokenMark(ctx, SX + 2.2 + (isTruck ? 0.8 : 0), SY + 0.35, 76);
  }
}

/** Draws the stand itself (the table or the truck, the people and everything near the table), back to front. */
export function drawStand(ctx: Ctx, g: SceneSource, playing: boolean): void {
  const dy = standDy(g);
  shifted(ctx, dy !== 0, 0, dy, () => drawStandHere(ctx, g, playing));
}

function drawStandHere(ctx: Ctx, g: SceneSource, playing: boolean): void {
  const S = g.S;
  const up = S.upgrades;
  const [sx, sy] = P(SX, SY);
  const call = (extra: Partial<StandCall> = {}): StandCall => ({ x: SX, y: SY, sx, sy, s: 1, ...extra });
  const br = S.broken;
  const wide = g.counters() >= 2;
  const isTruck = !!g.active().truck;
  // the own store: its counter instead of the tables (the awning is the store's)
  const store = !!LOCATIONS[S.location].store;
  // under a roof the umbrella and the tent stay folded; the truck and the store have their own awnings
  const outdoor = !LOCATIONS[S.location].indoor && !isTruck && !store;
  // the fastest vehicle is parked at the stand; boxes and vehicles make room for a wide stand
  // the fastest vehicle is parked on the right of the table (on the left it would hang over the house)
  if (up.scooter) drawSprite(ctx, 'stand_scooter', call());
  else if (up.bike) drawSprite(ctx, 'stand_bike', call());
  shifted(ctx, wide, -0.35, -1.0, () => {
    if (up.toolkit) drawSprite(ctx, 'stand_toolkit', call());
    if (up.cooler) drawSprite(ctx, 'stand_cooler', call());
  });

  const making = playing && !!g.making;
  const helpers = playing ? g.D.helpers : 0;
  const pouring = (c: number) => playing && !!g.servings[c];
  const level = playing ? g.D.cupsReady / CONFIG.CUPS_PER_PITCHER : 0.6;

  if (isTruck) {
    // who stands at which window: helpers take their counters, the player the rest
    const girl = S.avatar === 'girl';
    const workers: TruckWorker[] = [];
    // another stand of the player's: its hired seller works alone (or nobody, when it is closed)
    if (g.seller !== undefined) {
      if (g.seller) workers.push({ kind: 'helper', slot: 0, serving: pouring(0), girl: g.seller.girl });
      if (g.helper2) workers.push({ kind: 'helper', slot: 1, serving: pouring(1), girl: g.helper2.girl });
    } else if (helpers >= 2) {
      workers.push({ kind: 'helper', slot: 0, serving: pouring(0), girl: !girl });
      workers.push({ kind: 'helper', slot: 1, serving: pouring(1), girl });
      workers.push({ kind: 'player', slot: 2, serving: false, girl });
    } else {
      workers.push({ kind: 'player', slot: 0, serving: pouring(0) || making, girl });
      if (helpers === 1) workers.push({ kind: 'helper', slot: 1, serving: pouring(1), girl: !girl });
    }
    const label = S.truck.text.trim() || t('world.truckDefault');
    drawSprite(ctx, 'stand_truck', call({ skin: S.truck.skin, logo: S.truck.logo, label, level: Math.min(1, level), workers }));
  } else {
    if (!up.tent && up.umbrella && outdoor) {
      ctx.save();
      if (br.umbrella) ctx.globalAlpha = 0.5;
      shifted(ctx, wide, -0.6, 0, () => drawSprite(ctx, 'stand_umbrella', call()));
      ctx.restore();
    }
    const people: { id: string; kind: 'player' | 'helper'; x: number; y: number; serving: boolean; juicing: boolean }[] = [];
    if (g.seller !== undefined) {
      // another stand of the player's: its hired seller stands where the player would (nobody when it is closed),
      // a second worker beside them (at the second counter of a wide stand)
      const two = !!g.helper2;
      const spot = wide ? SPOTS.wide.c0 : two ? [SPOTS.single.playerWithHelper[0], SPOTS.single.player[1]] : SPOTS.single.player;
      if (g.seller) people.push({ id: `char_helper_${g.seller.girl ? 'girl' : 'boy'}`, kind: 'helper', x: spot[0], y: spot[1], serving: pouring(0), juicing: false });
      if (g.helper2) {
        const s2 = wide ? SPOTS.wide.c1 : SPOTS.single.helper;
        people.push({ id: `char_helper_${g.helper2.girl ? 'girl' : 'boy'}`, kind: 'helper', x: s2[0], y: s2[1], serving: pouring(1), juicing: false });
      }
    } else if (!wide) {
      if (helpers > 0) people.push({ id: `char_helper_${S.avatar === 'boy' ? 'girl' : 'boy'}`, kind: 'helper', x: SPOTS.single.helper[0], y: SPOTS.single.helper[1], serving: pouring(0), juicing: false });
      people.push({ id: `char_player_${S.avatar}`, kind: 'player', x: (helpers > 0 ? SPOTS.single.playerWithHelper : SPOTS.single.player)[0], y: SPOTS.single.player[1], serving: pouring(0) && helpers === 0, juicing: making });
    } else if (helpers >= 2) {
      people.push({ id: `char_player_${S.avatar}`, kind: 'player', x: SPOTS.wide.back[0], y: SPOTS.wide.back[1], serving: false, juicing: making });
      people.push({ id: `char_helper_${S.avatar === 'boy' ? 'girl' : 'boy'}`, kind: 'helper', x: SPOTS.wide.c1[0], y: SPOTS.wide.c1[1], serving: pouring(1), juicing: false });
      people.push({ id: `char_helper_${S.avatar === 'boy' ? 'girl' : 'boy'}`, kind: 'helper', x: SPOTS.wide.c0[0], y: SPOTS.wide.c0[1], serving: pouring(0), juicing: false });
    } else {
      if (helpers === 1) people.push({ id: `char_helper_${S.avatar === 'boy' ? 'girl' : 'boy'}`, kind: 'helper', x: SPOTS.wide.c1[0], y: SPOTS.wide.c1[1], serving: pouring(1), juicing: false });
      people.push({ id: `char_player_${S.avatar}`, kind: 'player', x: SPOTS.wide.c0[0], y: SPOTS.wide.c0[1], serving: pouring(0) || (helpers === 0 && pouring(1)), juicing: making });
    }
    for (const p of people) {
      const [px, py] = P(p.x, p.y);
      const helperGirl = g.seller ? g.seller.girl : S.avatar === 'boy';
      const helperLook = { ...playerLook(helperGirl ? 'girl' : 'boy'), shirt: '#51cf66', hair: '#3b2a20' };
      const pick = standSpriteId(p.id, p.serving, p.juicing);
      drawCharacter(ctx, pick.id, p.x, p.y, px, py, {
        kind: 'player',
        hasCup: pick.cup,
        look: p.kind === 'helper' ? helperLook : playerLook(S.avatar),
        scale: p.kind === 'helper' ? 0.95 : 1,
        moving: false,
        anim: 0,
        facingCam: true,
        dirX: -1, // the seller looks at the customers, who stand in front of the table (toward the lower left)
        serving: p.serving,
        juicing: p.juicing && !ENV.reduceMotion,
        apron: p.kind === 'helper' ? '#69db7c' : undefined,
        t: ENV.t,
      });
    }

    if (up.speaker) drawSprite(ctx, 'stand_speaker', call({ on: S.speakerOn && !br.speaker }));
    drawSprite(ctx, store ? 'stand_store_counter' : 'stand_table', call());
    if (up.banner) drawSprite(ctx, 'stand_banner', call());
    // on the table, from the back to the front
    const lemons = playing ? Math.max(lemonsTotal(S.stock), 3) : lemonsTotal(S.stock);
    if (lemons > 0 || !hasImage('item_lemon_pile')) drawSprite(ctx, 'item_lemon_pile', call({ lemons }));
    if (up.dispenser) drawSprite(ctx, 'stand_dispenser', call({ level: Math.min(1, level) }));
    else if (hasImage('item_pitcher_full')) pitcherPicture(ctx, sx, sy, Math.min(1, level));
    else drawSprite(ctx, 'item_pitcher', call({ level: Math.min(1, level) }));
    if (up.juicer_lever) drawSprite(ctx, 'stand_juicer_lever', call());
    else if (up.juicer_hand) drawSprite(ctx, 'stand_juicer_hand', call());
    // the card terminal of the store (an upgrade), at the front of the counter
    if (store && g.active().store_terminal) drawSprite(ctx, 'stand_store_terminal', call());
    if (up.cash_lock) drawSprite(ctx, 'stand_cashbox', call());
    else if (hasImage('item_coin_jar')) drawSprite(ctx, 'item_coin_jar', call());
    else coinJar(ctx, playing ? g.D.sales : 0);
    drawSprite(ctx, up.branded_cups ? 'item_cups_branded' : 'item_cups_pack', call());
    if ((S.stock.cookies ?? 0) > 0) drawSprite(ctx, 'item_cookies', call({ level: S.stock.cookies }));
    if (playing && g.D.flyers) drawSprite(ctx, 'stand_flyers', call());
    // the second place of the store's counter has its own pitcher and cups
    if (store) table2Items(ctx, level);
    // the canopy of the umbrella is over the heads of the sellers (its pole stays behind the table)
    if (!up.tent && up.umbrella && outdoor) umbrellaCanopy(ctx, sx, sy, wide, br.umbrella ? 0.5 : 1);
  }
  // the truck carries its speaker on the roof, at the right end (the bar stools take the space in front)
  if (up.speaker && isTruck) {
    const spot = truckRoofSpot(S.truck.skin, sx, sy);
    const sm = metaFor('stand_speaker');
    const [ox, oy] = spot ? [spot[0] - sx - (sm.dx ?? 0), spot[1] - sy - (sm.dy ?? 0)] : P(-0.42, -0.3, TRUCK_SPEAKER_Z + 2);
    ctx.save();
    ctx.translate(ox, oy);
    drawSprite(ctx, 'stand_speaker', call({ on: S.speakerOn && !br.speaker }));
    ctx.restore();
  }
  if (playing && g.isSoldOut() && !isTruck) soldOutPlate(ctx);
  // the tent covers the whole stand, so it is drawn last (the umbrella is drawn behind the table, above)
  if (up.tent && outdoor) {
    // the picture is drawn a little taller than the footprint so the seller's head shows under the roof;
    // over a big stand it moves left and grows so it covers both tables
    const box = tentBox(wide);
    const img = getImage('stand_tent');
    if (box && img) {
      // the roof and everything but the three visible legs (each leg is drawn at its own depth, see standSideParts)
      ctx.save();
      ctx.beginPath();
      ctx.rect(box.left - 2, box.top - 2, box.w + 4, box.h + 4);
      for (const leg of TENT_LEGS) ctx.rect(box.left + leg.x0 * box.w, box.top + leg.top * box.h, (leg.x1 - leg.x0) * box.w, (1 - leg.top) * box.h + 2);
      ctx.clip('evenodd');
      ctx.drawImage(img, box.left, box.top, box.w, box.h);
      ctx.restore();
    } else drawSprite(ctx, 'stand_tent', call({ on: !!br.tent }));
  }

  // broken equipment gets a wrench bubble
  if (br.speaker) brokenMark(ctx, SX + 1.23 + (isTruck ? -0.28 : 0), SY - 0.42 + (isTruck ? -0.08 : 0), 44 + (isTruck ? TRUCK_SPEAKER_Z : 0));
  if (br.umbrella && !up.tent && outdoor) brokenMark(ctx, SX + 0.15, SY - 0.25, 108);
  if (br.tent && outdoor) brokenMark(ctx, SX, SY - 0.35, 128);
  if (br.dispenser && !isTruck) brokenMark(ctx, SX - 0.2, SY - 0.05, 66);
  if ((br.juicer_hand || br.juicer_lever) && !isTruck) brokenMark(ctx, SX + 0.33, SY - 0.2, 56);
  if (br.bike && !up.scooter) brokenMark(ctx, SX + 1.87, SY - 0.53, 40);
  if (br.scooter) brokenMark(ctx, SX + 1.87, SY - 0.53, 44);
}
