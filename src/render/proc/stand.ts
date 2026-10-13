// The lemonade stand. Every upgrade is a separate layer (own asset ID) so it visibly appears when bought.
import { CONFIG } from '../../core/config';
import { LOCATIONS } from '../../data/locations';
import { t } from '../../i18n';
import type { Game } from '../../sim/game';
import { playerLook } from '../../sim/looks';
import { lemonsTotal } from '../../sim/state';
import { drawSprite, hasImage, metaFor, registerProcs, type SpriteCall } from '../assets';
import { ENV } from '../env';
import { box, circle, ellipse, faceX, faceY, line, P, poly, rrect, shadow, text, type Ctx } from '../iso';
import { drawCharacter, standSpriteId } from './people';
import { brokenMark } from './standExtras';
import { type TruckWorker } from './truck';

const SX = CONFIG.STAND.x;
const SY = CONFIG.STAND.y;
const TABLE_H = 22;
/** Where the price is written on the picture of the sign, from the picture's anchor point. */
const SIGN_TEXT = { x: 0, y: -24 };

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

/** The second counter of the big stand: a table section to the left with its own pitcher and cups. */
function table2(ctx: Ctx, level: number): void {
  const x0 = SX - 2.0;
  const y0 = SY - 0.45;
  box(ctx, x0, y0, 1.2, 0.9, TABLE_H, 0, '#fffaf0', { top: '#fff4cc' });
  faceY(ctx, x0, y0 + 0.9, 0, () => {
    for (let i = 0; i < 6; i++) if (i % 2 === 0) {
      ctx.fillStyle = '#74c0fc';
      ctx.fillRect(i * 6.4, -TABLE_H, 6.4, TABLE_H);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, -3, 38.4, 3);
  });
  // a pitcher and cups for the second queue
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

/** Where people stand at a stand with two counters (0: right counter, 1: left counter, back: the player when two helpers work). */
const SPOTS = {
  single: { player: [SX - 0.1, SY - 0.85], helper: [SX + 0.62, SY - 0.8] },
  wide: { c0: [SX - 0.1, SY - 0.85], c1: [SX - 1.35, SY - 0.85], back: [SX - 0.75, SY - 1.5] },
};

/** Draws the whole stand for the current game state, back to front. */
export function drawStand(ctx: Ctx, g: Game, playing: boolean): void {
  const S = g.S;
  const up = S.upgrades;
  const [sx, sy] = P(SX, SY);
  const call = (extra: Partial<StandCall> = {}): StandCall => ({ x: SX, y: SY, sx, sy, s: 1, ...extra });
  const br = S.broken;
  const wide = g.counters() >= 2;
  const isTruck = !!g.active().truck;
  // the fastest vehicle is parked at the stand; boxes and vehicles make room for a wide stand
  shifted(ctx, wide, -0.95, 0, () => {
    if (up.scooter) drawSprite(ctx, 'stand_scooter', call());
    else if (up.bike) drawSprite(ctx, 'stand_bike', call());
  });
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
    if (helpers >= 2) {
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
    drawSprite(ctx, 'stand_chair', call());
    const people: { id: string; kind: 'player' | 'helper'; x: number; y: number; serving: boolean; juicing: boolean }[] = [];
    if (!wide) {
      if (helpers > 0) people.push({ id: `char_helper_${S.avatar === 'boy' ? 'girl' : 'boy'}`, kind: 'helper', x: SPOTS.single.helper[0], y: SPOTS.single.helper[1], serving: pouring(0), juicing: false });
      people.push({ id: `char_player_${S.avatar}`, kind: 'player', x: SPOTS.single.player[0], y: SPOTS.single.player[1], serving: pouring(0) && helpers === 0, juicing: making });
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
      const helperLook = { ...playerLook(S.avatar === 'boy' ? 'girl' : 'boy'), shirt: '#51cf66', hair: '#3b2a20' };
      const pick = standSpriteId(p.id, p.serving, p.juicing);
      drawCharacter(ctx, pick.id, p.x, p.y, px, py, {
        kind: 'player',
        hasCup: pick.cup,
        look: p.kind === 'helper' ? helperLook : playerLook(S.avatar),
        scale: p.kind === 'helper' ? 0.95 : 1,
        moving: false,
        anim: 0,
        facingCam: true,
        dirX: 1,
        serving: p.serving,
        juicing: p.juicing && !ENV.reduceMotion,
        apron: p.kind === 'helper' ? '#69db7c' : undefined,
        t: ENV.t,
      });
    }

    if (wide) table2(ctx, level);
    drawSprite(ctx, 'stand_table', call());
    if (up.banner) drawSprite(ctx, 'stand_banner', call());
    const lemons = lemonsTotal(S.stock);
    drawSprite(ctx, 'item_lemon_pile', call({ lemons: playing ? Math.max(lemons, 3) : lemons }));
    drawSprite(ctx, up.dispenser ? 'stand_dispenser' : 'item_pitcher', call({ level: Math.min(1, level) }));
    drawSprite(ctx, up.branded_cups ? 'item_cups_branded' : 'item_cups_pack', call());
    if (up.cash_lock) drawSprite(ctx, 'stand_cashbox', call());
    else coinJar(ctx, playing ? g.D.sales : 0);
    if (up.juicer_lever) drawSprite(ctx, 'stand_juicer_lever', call());
    else if (up.juicer_hand) drawSprite(ctx, 'stand_juicer_hand', call());
    if (playing && g.D.flyers) drawSprite(ctx, 'stand_flyers', call());
    if ((S.stock.cookies ?? 0) > 0) drawSprite(ctx, 'item_cookies', call({ level: S.stock.cookies }));
  }
  // the price sign stands at the side when the second queue needs the space in front
  if (up.sign)
    shifted(ctx, wide, -1.2, -0.45, () => {
      drawSprite(ctx, 'stand_sign', call({ price: S.price }));
      if (hasImage('stand_sign')) {
        // the picture has a blank board: the game writes the price on it
        const m = metaFor('stand_sign');
        text(ctx, String(S.price), sx + (m.dx ?? 0) + SIGN_TEXT.x, sy + (m.dy ?? 0) + SIGN_TEXT.y, 10, '#ffffff', 'center', 900, '#3b2a1c');
      }
    });
  // next to the truck the speaker moves off the bar stools
  if (up.speaker) shifted(ctx, isTruck, 0.75, 0.55, () => drawSprite(ctx, 'stand_speaker', call({ on: S.speakerOn && !br.speaker })));
  if (up.mascot) drawSprite(ctx, 'stand_mascot', call());
  if (up.tv) drawSprite(ctx, 'stand_tv', call({ on: !!br.tv }));
  if (playing && g.isSoldOut() && !isTruck) soldOutPlate(ctx);
  // under a roof the umbrella and the tent stay folded; the truck has its own awning
  const outdoor = !LOCATIONS[S.location].indoor && !isTruck;
  if (up.tent && outdoor) drawSprite(ctx, 'stand_tent', call({ on: !!br.tent }));
  else if (up.umbrella && outdoor) {
    ctx.save();
    if (br.umbrella) ctx.globalAlpha = 0.5;
    drawSprite(ctx, 'stand_umbrella', call());
    ctx.restore();
  }

  // broken equipment gets a wrench bubble
  if (br.speaker) brokenMark(ctx, SX + 1.23 + (isTruck ? 0.75 : 0), SY - 0.42 + (isTruck ? 0.55 : 0), 44);
  if (br.umbrella && !up.tent && outdoor) brokenMark(ctx, SX + 0.15, SY - 0.25, 108);
  if (br.tent && outdoor) brokenMark(ctx, SX, SY - 0.35, 128);
  if (br.dispenser && !isTruck) brokenMark(ctx, SX - 0.2, SY - 0.05, 66);
  if ((br.juicer_hand || br.juicer_lever) && !isTruck) brokenMark(ctx, SX + 0.33, SY - 0.2, 56);
  const vx = wide ? -0.95 : 0;
  if (br.bike && !up.scooter) brokenMark(ctx, SX - 1.75 + vx, SY - 0.9, 40);
  if (br.scooter) brokenMark(ctx, SX - 1.6 + vx, SY - 0.7, 44);
  if (br.tv) brokenMark(ctx, SX + 2.6, SY - 0.8, 76);
}
