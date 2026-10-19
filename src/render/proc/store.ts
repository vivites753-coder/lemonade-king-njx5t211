// The own store (level 4) seen in a cut, like a doll's house: the floor of the room, its two back walls (windows,
// shelves, the name board, the menu with today's prices), low cut walls on the street sides with a glass door, the
// bar behind the counter, the tables and chairs of the customers.
import { CONFIG } from '../../core/config';
import { DOOR, ROOM_D } from '../../data/storeRoom';
import { t } from '../../i18n';
import { getImage, registerProcs, type SpriteCall } from '../assets';
import { ENV } from '../env';
import { box, circle, ellipse, faceX, faceY, line, P, poly, rrect, shadow, text, type Ctx } from '../iso';
import { clock, clockHands, glassShine, outside, WALL_H } from './indoor';

const N = CONFIG.MAP_SIZE;
const LEN = N * 32;
/** In the wall pictures the left wall runs from the front corner of the island (u = 0) to the back one (u = 384);
 * the room's part of it starts at u = (12 − ROOM_D) × 32. */
const LEFT_U0 = (N - ROOM_D) * 32;
const THICK = 0.22;

/**
 * Where things are on the walls (u along the wall, v from −104 at the top to 0 at the floor): the same in the
 * drawing below, in the template of the generated picture (tools/make_wall_layouts.py) and on the picture itself.
 */
export const STORE_WALL = {
  /** Back wall (u = x × 32): two windows, the name board over the bar, the clock, the menu board. */
  windows: [
    [14, 80],
    [318, 376],
  ] as [number, number][],
  winV: [-86, -30] as [number, number],
  sign: { u0: 100, u1: 214, v0: -102, v1: -86 },
  clock: { u: 236, v: -76, r: 11 },
  menu: { u0: 254, u1: 306, v0: -92, v1: -42 },
  /** Left wall: one window (in the coordinates of the whole wall picture). */
  leftWindow: [262, 346] as [number, number],
};

/** What the menu board says: today's prices. */
function menuText(ctx: Ctx, price: number, cookiePrice: number | null): void {
  const m = STORE_WALL.menu;
  const cx = (m.u0 + m.u1) / 2;
  text(ctx, t('world.menu'), cx, m.v0 + 8, 7, '#fff3bf', 'center', 900);
  line(ctx, m.u0 + 8, m.v0 + 14, m.u1 - 8, m.v0 + 14, 'rgba(255,255,255,0.5)', 1);
  text(ctx, `🍋 ${price}`, cx, m.v0 + 24, 8, '#ffffff', 'center', 900);
  if (cookiePrice !== null) text(ctx, `🍪 ${cookiePrice}`, cx, m.v0 + 37, 8, '#ffffff', 'center', 900);
}

function signText(ctx: Ctx): void {
  const s = STORE_WALL.sign;
  text(ctx, `🍋 ${t('world.storeSign')}`, (s.u0 + s.u1) / 2, (s.v0 + s.v1) / 2 + 0.5, 10, '#c92a2a', 'center', 900);
}

/** A window with the weather behind it. */
function windowPane(ctx: Ctx, u0: number, u1: number): void {
  const [v0, v1] = STORE_WALL.winV;
  outside(ctx, u0, v0, u1 - u0, v1 - v0);
  glassShine(ctx, u0, v0, u1 - u0, v1 - v0);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(u0, v0, u1 - u0, v1 - v0);
  line(ctx, (u0 + u1) / 2, v0, (u0 + u1) / 2, v1, '#ffffff', 2);
  rrect(ctx, u0 - 3, v1, u1 - u0 + 6, 4, 1.5, '#e9dcc3');
}

/** The plaster, the turquoise wainscot under a white rail, the baseboard. */
function plaster(ctx: Ctx, len: number, shade: number): void {
  ctx.fillStyle = '#fff1d6';
  ctx.fillRect(0, -WALL_H, len, WALL_H);
  ctx.fillStyle = '#7fd6c8';
  ctx.fillRect(0, -32, len, 32);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, -34, len, 3);
  ctx.fillStyle = '#b98a5a';
  ctx.fillRect(0, -6, len, 6);
  if (shade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${shade})`;
    ctx.fillRect(0, -WALL_H, len, WALL_H);
  }
}

function backWallDrawn(ctx: Ctx, price: number, cookiePrice: number | null): void {
  plaster(ctx, LEN, 0);
  for (const [u0, u1] of STORE_WALL.windows) windowPane(ctx, u0, u1);
  // shelves with jars of lemonade and lemons, behind the bar
  for (const v of [-66, -50]) {
    ctx.fillStyle = '#c58b4f';
    ctx.fillRect(104, v, 108, 4);
    for (let i = 0; i < 7; i++) {
      const u = 110 + i * 15;
      if ((i + (v === -66 ? 0 : 1)) % 2) rrect(ctx, u - 4, v - 12, 9, 12, 2, 'rgba(255,224,102,0.95)', '#e8b500', 1);
      else ellipse(ctx, u, v - 4, 4.5, 3.6, '#ffd43b', '#e8b500', 0.8);
    }
  }
  const s = STORE_WALL.sign;
  rrect(ctx, s.u0, s.v0, s.u1 - s.u0, s.v1 - s.v0, 5, '#ffd43b', '#e8590c', 2);
  signText(ctx);
  clock(ctx, STORE_WALL.clock.u, STORE_WALL.clock.v, STORE_WALL.clock.r);
  const m = STORE_WALL.menu;
  rrect(ctx, m.u0 - 3, m.v0 - 3, m.u1 - m.u0 + 6, m.v1 - m.v0 + 6, 3, '#8a5a35');
  rrect(ctx, m.u0, m.v0, m.u1 - m.u0, m.v1 - m.v0, 2, '#2f4f3f');
  menuText(ctx, price, cookiePrice);
  // a garland of little lights along the top of the wall
  for (let i = 0; i < 24; i++) {
    const u = 8 + i * 16;
    const sag = Math.sin((i % 6) / 6 * Math.PI) * 5;
    const on = ENV.reduceMotion || Math.sin(ENV.t * 2 + i) > -0.6;
    circle(ctx, u, -96 + sag, 2.2, on ? ['#ffd43b', '#ff7aa8', '#7cc8f0', '#8fd16a'][i % 4] : '#ced4da');
  }
}

function leftWallDrawn(ctx: Ctx): void {
  // drawn from the open front of the room (u = 0 at y = ROOM_D) to the back corner
  plaster(ctx, ROOM_D * 32, 0.06);
  const [w0, w1] = STORE_WALL.leftWindow;
  windowPane(ctx, w0 - LEFT_U0, w1 - LEFT_U0);
  // a framed lemon picture between the window and the corner
  rrect(ctx, 132, -80, 20, 24, 2, '#ffffff', '#c58b4f', 2);
  ellipse(ctx, 142, -68, 6, 5, '#ffd43b', '#e8b500', 1);
}

/** The air conditioner (an upgrade) high on the left wall, over the window; it blows when it is warm outside. */
function airConditioner(ctx: Ctx): void {
  const u = 44;
  const v = -101;
  rrect(ctx, u, v, 56, 12, 4, '#ffffff', '#adb5bd', 1.2);
  for (let i = 0; i < 4; i++) line(ctx, u + 6, v + 6 + i * 1.6, u + 50, v + 6 + i * 1.6, '#ced4da', 0.8);
  circle(ctx, u + 50, v + 3.5, 1.4, '#40c057');
  if (ENV.reduceMotion || (ENV.weather !== 'sunny' && ENV.weather !== 'hot')) return;
  for (let i = 0; i < 3; i++) {
    const k = (ENV.t * 0.8 + i / 3) % 1;
    ctx.strokeStyle = `rgba(116,192,252,${0.7 * (1 - k)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(u + 12 + i * 15, v + 13 + k * 14);
    ctx.quadraticCurveTo(u + 18 + i * 15, v + 18 + k * 14, u + 12 + i * 15, v + 23 + k * 14);
    ctx.stroke();
  }
}

/** The tops of the walls and their cut ends: the room is shown in a cut. */
function wallTops(ctx: Ctx): void {
  const top = '#e9dcc3';
  poly(ctx, [P(0, -THICK, WALL_H), P(N, -THICK, WALL_H), P(N, 0, WALL_H), P(0, 0, WALL_H)], top);
  poly(ctx, [P(-THICK, -THICK, WALL_H), P(0, -THICK, WALL_H), P(0, ROOM_D, WALL_H), P(-THICK, ROOM_D, WALL_H)], top);
  poly(ctx, [P(N, -THICK, 0), P(N, 0, 0), P(N, 0, WALL_H), P(N, -THICK, WALL_H)], '#d8c8a8');
  poly(ctx, [P(-THICK, ROOM_D, 0), P(0, ROOM_D, 0), P(0, ROOM_D, WALL_H), P(-THICK, ROOM_D, WALL_H)], '#cdbd9c');
  // where the front wall would stand: a threshold along the open side
  poly(ctx, [P(0, ROOM_D - 0.07, 0), P(N, ROOM_D - 0.07, 0), P(N, ROOM_D, 0), P(0, ROOM_D, 0)], '#a0714a');
}

/**
 * The room of the store, drawn right after the ground: the generated wall pictures when they are there
 * (wall_store_left / wall_store_right, see tools/make_walls.py), else the walls drawn here.
 */
export function drawStoreRoom(ctx: Ctx, price: number, cookiePrice: number | null, ac: boolean): void {
  const left = getImage('wall_store_left');
  const right = getImage('wall_store_right');
  if (left && right) {
    faceX(ctx, 0, N, 0, () => {
      // what is seen through the window (only the room's part of the wall is painted on the picture)
      ctx.save();
      ctx.beginPath();
      ctx.rect(LEFT_U0, -WALL_H, ROOM_D * 32, WALL_H);
      ctx.clip();
      outside(ctx, LEFT_U0, -WALL_H, ROOM_D * 32, WALL_H);
      ctx.restore();
      ctx.drawImage(left, 0, -WALL_H, LEN, WALL_H);
    });
    faceY(ctx, 0, 0, 0, () => {
      outside(ctx, 0, -WALL_H, LEN, WALL_H);
      ctx.drawImage(right, 0, -WALL_H, LEN, WALL_H);
      signText(ctx);
      clockHands(ctx, STORE_WALL.clock.u, STORE_WALL.clock.v, STORE_WALL.clock.r, STORE_WALL.clock.r);
      menuText(ctx, price, cookiePrice);
    });
  } else {
    faceX(ctx, 0, ROOM_D, 0, () => leftWallDrawn(ctx));
    faceY(ctx, 0, 0, 0, () => backWallDrawn(ctx, price, cookiePrice));
  }
  if (ac) faceX(ctx, 0, ROOM_D, 0, () => airConditioner(ctx));
  wallTops(ctx);
}

// ---------------------------------------------------------------- the low walls on the street sides, the door

/** Height of the cut walls on the street sides (the back walls are WALL_H), of the door and its frame, and the
 * thickness of the walls (tiles). */
const LOW_H = 30;
const DOOR_H = 62;
const LOW_T = 0.16;

/** A piece of the low walls (sorted among the people by its own depth): of the front wall (x from a to b), of the
 * side wall at x = 12 (y from a to b), or the door. */
export interface StorePiece {
  kind: 'front' | 'side' | 'door';
  a: number;
  b: number;
  /** Its middle (tiles), for the depth. */
  cx: number;
  cy: number;
}

function pieces(): StorePiece[] {
  const out: StorePiece[] = [];
  // the front wall tile by tile, with the doorway cut out of it
  for (let x = 0; x < N; x++) {
    for (const [a, b] of [
      [x, Math.min(x + 1, DOOR.x0)],
      [Math.max(x, DOOR.x1), x + 1],
    ]) {
      if (b - a > 1e-6 && (b <= DOOR.x0 || a >= DOOR.x1)) out.push({ kind: 'front', a, b, cx: (a + b) / 2, cy: ROOM_D });
    }
  }
  out.push({ kind: 'door', a: DOOR.x0, b: DOOR.x1, cx: DOOR.x, cy: ROOM_D });
  for (let y = 0; y < ROOM_D; y++) out.push({ kind: 'side', a: y, b: y + 1, cx: N, cy: y + 0.5 });
  return out;
}

/** All the pieces of the low walls of the store. */
export const STORE_PIECES: StorePiece[] = pieces();

const LOW = { top: '#fff6dc', left: '#ffe3a0', right: '#efc979', base: '#2bb3a3', edge: '#c9a25c' };

/** One piece of the low walls; `open` (0..1) slides the glass door open; `neon`: the lit sign over the door (upgrade). */
export function drawStorePiece(ctx: Ctx, p: StorePiece, open: number, neon: boolean): void {
  if (p.kind === 'door') {
    door(ctx, p.a, p.b, open, neon);
    return;
  }
  if (p.kind === 'front') {
    const y0 = ROOM_D - LOW_T / 2;
    // the corner with the side wall reaches over the end of the front wall
    const b = p.b >= N ? N + LOW_T / 2 : p.b;
    box(ctx, p.a, y0, b - p.a, LOW_T, LOW_H, 0, LOW.left, LOW);
    faceY(ctx, p.a, y0 + LOW_T, 0, () => {
      ctx.fillStyle = LOW.base;
      ctx.fillRect(0, -8, (b - p.a) * 32, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, -10, (b - p.a) * 32, 2);
    });
  } else {
    const x0 = N - LOW_T / 2;
    box(ctx, x0, p.a, LOW_T, p.b - p.a, LOW_H, 0, LOW.left, LOW);
    faceX(ctx, x0 + LOW_T, p.b, 0, () => {
      ctx.fillStyle = LOW.base;
      ctx.fillRect(0, -8, (p.b - p.a) * 32, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, -10, (p.b - p.a) * 32, 2);
    });
  }
  // the cut: a darker line along the top shows that the wall goes on upwards
  const [ax, ay] = p.kind === 'front' ? P(p.a, ROOM_D + LOW_T / 2, LOW_H) : P(N + LOW_T / 2, p.a, LOW_H);
  const [bx, by] = p.kind === 'front' ? P(Math.min(p.b, N + LOW_T / 2), ROOM_D + LOW_T / 2, LOW_H) : P(N + LOW_T / 2, p.b, LOW_H);
  line(ctx, ax, ay, bx, by, LOW.edge, 1.2);
}

/** The door: a wooden frame higher than the cut walls, two glass panels that slide apart when somebody comes. */
function door(ctx: Ctx, a: number, b: number, open: number, neon: boolean): void {
  const y = ROOM_D;
  const w = (b - a) * 32;
  // the threshold, the posts and the beam over them
  poly(ctx, [P(a, y - LOW_T / 2), P(b, y - LOW_T / 2), P(b, y + LOW_T / 2), P(a, y + LOW_T / 2)], '#a0714a');
  box(ctx, a - 0.05, y - LOW_T / 2, 0.07, LOW_T, DOOR_H, 0, '#8a5a35');
  faceY(ctx, a, y, 0, () => {
    // two glass panels; open, each one slides behind its post
    const pw = (w / 2) * (1 - 0.85 * open);
    for (const [u, side] of [
      [0, 0],
      [w - pw, 1],
    ] as [number, number][]) {
      ctx.fillStyle = 'rgba(190,228,255,0.35)';
      ctx.fillRect(u, -DOOR_H + 6, pw, DOOR_H - 6);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(u, -DOOR_H + 6, pw, DOOR_H - 6);
      if (pw > 6) line(ctx, u + pw * 0.3, -DOOR_H + 14, u + pw * 0.3 + 6, -DOOR_H + 30, 'rgba(255,255,255,0.8)', 2);
      // a little lemon on the glass, and the handle
      if (pw > 10) {
        circle(ctx, u + pw / 2, -DOOR_H / 2, 3, 'rgba(255,212,59,0.85)');
        line(ctx, side ? u + 3 : u + pw - 3, -34, side ? u + 3 : u + pw - 3, -24, '#868e96', 2);
      }
    }
  });
  box(ctx, b - 0.02, y - LOW_T / 2, 0.07, LOW_T, DOOR_H, 0, '#8a5a35');
  box(ctx, a - 0.05, y - LOW_T / 2, b - a + 0.12, LOW_T, 7, DOOR_H - 7, '#a0714a');
  if (!neon) return;
  // the lit sign over the door: it glows (more at dusk)
  faceY(ctx, a - 0.25, y + LOW_T / 2, DOOR_H + 2, () => {
    const len = (b - a + 0.5) * 32;
    rrect(ctx, 0, -16, len, 15, 4, '#2b2140', '#ff7aa8', 1.2);
    const pulse = ENV.reduceMotion ? 1 : 0.85 + Math.sin(ENV.t * 3) * 0.15;
    ctx.globalAlpha *= 0.35 + 0.35 * ENV.dusk;
    text(ctx, t('world.open'), len / 2, -8.5, 8, '#ff7aa8', 'center', 900, 'rgba(255,122,168,0.6)');
    ctx.globalAlpha /= 0.35 + 0.35 * ENV.dusk;
    ctx.globalAlpha *= pulse;
    text(ctx, t('world.open'), len / 2, -8.5, 8, '#ffe3ef', 'center', 900);
    ctx.globalAlpha /= pulse;
  });
}

// ---------------------------------------------------------------- the furniture

/** A chair facing the table: its back is on the left (side −1) or on the right (side 1). */
function chair(ctx: Ctx, x: number, y: number, side: -1 | 1): void {
  const c = '#2bb3a3';
  for (const [dx, dy] of [
    [-0.12, -0.12],
    [0.1, -0.12],
    [-0.12, 0.1],
    [0.1, 0.1],
  ])
    box(ctx, x + dx, y + dy, 0.03, 0.03, 13, 0, '#5c3d1e');
  box(ctx, x - 0.14, y - 0.14, 0.28, 0.28, 3, 13, c, { top: '#5fd3c2' });
  box(ctx, side < 0 ? x - 0.16 : x + 0.12, y - 0.14, 0.04, 0.28, 17, 16, c);
}

/** A round table for the customers (its chairs are their own pictures: people sit on them): a vase and a glass of
 * lemonade on it, or (`cake`) a slice of cake and a cup. */
function cafeTable(ctx: Ctx, c: SpriteCall, cake: boolean): void {
  const { sx, sy } = c;
  shadow(ctx, sx, sy, 18, 0.12);
  ellipse(ctx, sx, sy - 1, 7, 3.2, '#868e96');
  line(ctx, sx, sy - 1, sx, sy - 24, '#868e96', 3);
  ellipse(ctx, sx, sy - 25, 15, 7.5, '#fffaf0', '#e9c46a', 1.5);
  if (cake) {
    ellipse(ctx, sx - 4, sy - 27, 6, 2.6, '#ffffff', '#ced4da', 0.8);
    poly(ctx, [[sx - 8, sy - 28], [sx - 1, sy - 30], [sx - 2, sy - 34], [sx - 8, sy - 32]], '#ffe8a3', '#e9c46a', 0.8);
    rrect(ctx, sx + 3, sy - 32, 5, 6, 1.5, '#ffffff', '#ced4da', 0.8);
  } else {
    rrect(ctx, sx - 7, sy - 36, 4, 9, 1.5, 'rgba(208,235,255,0.9)', '#74c0fc', 0.8);
    circle(ctx, sx - 5, sy - 38, 3, '#ff7aa8');
    rrect(ctx, sx + 3, sy - 32, 5, 7, 1.5, 'rgba(255,224,102,0.95)', '#ced4da', 0.8);
  }
}

/** The bar along the back wall behind the counter: a coffee machine, a big jar of lemonade, a cake under a dome. */
function backBar(ctx: Ctx, c: SpriteCall): void {
  const x0 = c.x - 1.6;
  const y0 = c.y - 0.28;
  const h = 30;
  box(ctx, x0, y0, 3.2, 0.55, h, 0, '#c58b4f', { top: '#fffaf0' });
  faceY(ctx, x0, y0 + 0.55, 0, () => {
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(4 + i * 25, -h + 5, 21, h - 10);
      circle(ctx, 14.5 + i * 25, -h / 2, 1.4, '#e9c46a');
    }
  });
  // the coffee machine
  box(ctx, x0 + 0.25, y0 + 0.08, 0.5, 0.36, 26, h, '#adb5bd');
  const [mx, my] = P(x0 + 0.5, y0 + 0.44, h + 18);
  circle(ctx, mx, my, 2, '#fa5252');
  // the big jar of lemonade with a tap
  const [jx, jy] = P(x0 + 1.5, y0 + 0.28, h);
  rrect(ctx, jx - 9, jy - 30, 18, 30, 5, 'rgba(208,235,255,0.6)', '#74c0fc', 1.2);
  rrect(ctx, jx - 8, jy - 20, 16, 19, 4, 'rgba(255,212,59,0.95)');
  for (let i = 0; i < 3; i++) circle(ctx, jx - 4 + i * 4, jy - 14 + (i % 2) * 4, 2, '#fff3bf');
  // a cake under a glass dome
  const [kx, ky] = P(x0 + 2.6, y0 + 0.28, h);
  ellipse(ctx, kx, ky - 1, 10, 4, '#ffffff', '#ced4da', 1);
  rrect(ctx, kx - 7, ky - 10, 14, 8, 3, '#ffd8a8');
  ellipse(ctx, kx, ky - 10, 7, 2.5, '#ff7aa8');
  ctx.beginPath();
  ctx.ellipse(kx, ky - 4, 10, 13, 0, Math.PI, 0);
  ctx.strokeStyle = 'rgba(165,216,255,0.9)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

registerProcs({
  prop_cafe_table: (ctx, c) => cafeTable(ctx, c, false),
  prop_cafe_table_b: (ctx, c) => cafeTable(ctx, c, true),
  prop_cafe_chair_l: (ctx, c) => {
    shadow(ctx, c.sx, c.sy, 8, 0.1);
    chair(ctx, c.x, c.y, -1);
  },
  prop_cafe_chair_r: (ctx, c) => {
    shadow(ctx, c.sx, c.sy, 8, 0.1);
    chair(ctx, c.x, c.y, 1);
  },
  prop_store_backbar: backBar,
});
