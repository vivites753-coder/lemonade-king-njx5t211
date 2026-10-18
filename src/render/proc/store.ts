// The own store (level 4) seen in a cut, like a doll's house: the floor of the room, its two back walls (windows,
// shelves, the name board, the menu with today's prices), the bar behind the counter and the tables of the customers.
// The front of the room is open to the street, where the people walk past.
import { CONFIG } from '../../core/config';
import { t } from '../../i18n';
import { getImage, registerProcs, type SpriteCall } from '../assets';
import { ENV } from '../env';
import { box, circle, ellipse, faceX, faceY, line, P, poly, rrect, shadow, text, type Ctx } from '../iso';
import { clock, clockHands, glassShine, outside, WALL_H } from './indoor';

/** The room: x from 0 to 12 along the back wall, y from 0 to ROOM_D along the left wall; its front is open. */
export const ROOM_D = 5;
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
export function drawStoreRoom(ctx: Ctx, price: number, cookiePrice: number | null): void {
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
  wallTops(ctx);
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

/** A round table for the customers, with a chair on each side: a vase and a glass of lemonade on it, or (`cake`) a
 * slice of cake and a cup. */
function cafeTable(ctx: Ctx, c: SpriteCall, cake: boolean): void {
  const { x, y, sx, sy } = c;
  shadow(ctx, sx, sy, 26, 0.12);
  chair(ctx, x - 0.42, y, -1);
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
  chair(ctx, x + 0.42, y, 1);
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
  prop_store_backbar: backBar,
});
