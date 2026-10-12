// Indoor places (station, mall): the two back walls of the hall and the props inside.
import { CONFIG } from '../../core/config';
import type { WallStyle } from '../../data/locations';
import { t } from '../../i18n';
import { drawSprite, registerProcs, type SpriteCall } from '../assets';
import { ENV } from '../env';
import { box, circle, ellipse, faceX, faceY, line, P, poly, rrect, shadow, text, type Ctx } from '../iso';

/** Wall height in px (the compact camera shows exactly this much above the back corner). */
export const WALL_H = 104;
const N = CONFIG.MAP_SIZE;
const LEN = N * 32;
const THICK = 0.22;

const SKY_IN: Record<string, [string, string]> = {
  sunny: ['#74c0fc', '#d0ebff'],
  hot: ['#4dabf7', '#fff3bf'],
  cloudy: ['#adb5bd', '#e9ecef'],
  rain: ['#6c7a89', '#aab4be'],
  wind: ['#8ec5ee', '#e7f5ff'],
  cold: ['#a5c0d8', '#eef4f9'],
};

/** What you see through a window: the sky and today's weather. */
function outside(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const [top, bottom] = SKY_IN[ENV.weather] ?? SKY_IN.sunny;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  if (ENV.weather === 'rain') {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const off = ENV.reduceMotion ? 0 : (ENV.t * 90) % 14;
    for (let i = 0; i < w / 7; i++) {
      for (let j = -1; j < h / 14; j++) {
        const px = x + ((i * 7 + j * 3) % w);
        const py = y + j * 14 + off + (i % 3) * 4;
        ctx.moveTo(px, py);
        ctx.lineTo(px - 2, py + 6);
      }
    }
    ctx.stroke();
  } else if (ENV.weather === 'sunny' || ENV.weather === 'hot') {
    circle(ctx, x + w * 0.8, y + h * 0.25, 7, '#ffe066');
  } else {
    ellipse(ctx, x + w * 0.35, y + h * 0.3, 14, 5, 'rgba(255,255,255,0.85)');
  }
}

function glassShine(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 5;
  for (const k of [0.2, 0.55]) {
    ctx.beginPath();
    ctx.moveTo(x + w * k, y + h);
    ctx.lineTo(x + w * k + h * 0.6, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Wall slab, its baseboard and the top edge. `face` draws the decoration in local wall coordinates. */
function wallBack(ctx: Ctx, color: string, base: string): void {
  // wall along y = 0 (facing +y) and wall along x = 0 (facing +x)
  faceY(ctx, 0, 0, 0, () => {
    ctx.fillStyle = color;
    ctx.fillRect(0, -WALL_H, LEN, WALL_H);
    ctx.fillStyle = base;
    ctx.fillRect(0, -7, LEN, 7);
  });
  faceX(ctx, 0, N, 0, () => {
    ctx.fillStyle = color;
    ctx.fillRect(0, -WALL_H, LEN, WALL_H);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, -WALL_H, LEN, WALL_H);
    ctx.fillStyle = base;
    ctx.fillRect(0, -7, LEN, 7);
  });
}

function wallTop(ctx: Ctx, color: string): void {
  poly(ctx, [P(0, -THICK, WALL_H), P(N, -THICK, WALL_H), P(N, 0, WALL_H), P(0, 0, WALL_H)], color);
  poly(ctx, [P(-THICK, -THICK, WALL_H), P(0, -THICK, WALL_H), P(0, N, WALL_H), P(-THICK, N, WALL_H)], color);
  // the cut ends of the walls at the sides of the diorama
  poly(ctx, [P(N, -THICK, 0), P(N, 0, 0), P(N, 0, WALL_H), P(N, -THICK, WALL_H)], 'rgba(0,0,0,0.25)');
  poly(ctx, [P(-THICK, N, 0), P(0, N, 0), P(0, N, WALL_H), P(-THICK, N, WALL_H)], 'rgba(0,0,0,0.12)');
}

/**
 * People walk in along the two walkways (tile rows 5.5 and 8.5), so the left wall has an open doorway at each
 * of them; windows sit between the doors. In wall coordinates u = (12 − y) × 32.
 */
const DOOR_W = 58;
const DOOR_H = 74;
const DOORS = CONFIG.LANES.map((l) => (N - l.y) * 32 - DOOR_W / 2);

/** Doormats on the floor in front of the doorways. */
function doormats(ctx: Ctx): void {
  for (const lane of CONFIG.LANES) {
    poly(ctx, [P(0, lane.y - 0.75), P(0.55, lane.y - 0.75), P(0.55, lane.y + 0.75), P(0, lane.y + 0.75)], 'rgba(73,80,87,0.55)');
  }
}

/** Door frames drawn over the opening (the opening itself is cut out together with the windows). */
function doorFrames(ctx: Ctx, color: string, arch: boolean): void {
  for (const u of DOORS) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(u, 0);
    if (arch) {
      ctx.lineTo(u, -DOOR_H + DOOR_W / 2);
      ctx.arc(u + DOOR_W / 2, -DOOR_H + DOOR_W / 2, DOOR_W / 2, Math.PI, 0);
    } else {
      ctx.lineTo(u, -DOOR_H);
      ctx.lineTo(u + DOOR_W, -DOOR_H);
    }
    ctx.lineTo(u + DOOR_W, 0);
    ctx.stroke();
  }
}

function doorPath(ctx: Ctx, arch: boolean): void {
  for (const u of DOORS) {
    ctx.moveTo(u, 0);
    if (arch) {
      ctx.lineTo(u, -DOOR_H + DOOR_W / 2);
      ctx.arc(u + DOOR_W / 2, -DOOR_H + DOOR_W / 2, DOOR_W / 2, Math.PI, 0);
    } else {
      ctx.lineTo(u, -DOOR_H);
      ctx.lineTo(u + DOOR_W, -DOOR_H);
    }
    ctx.lineTo(u + DOOR_W, 0);
    ctx.closePath();
  }
}

/** The street behind an open doorway: sky and weather above, pavement below. */
function streetView(ctx: Ctx, u: number, w: number): void {
  outside(ctx, u, -DOOR_H, w, DOOR_H);
  ctx.fillStyle = '#ced4da';
  ctx.fillRect(u, -16, w, 16);
}

// ---------------------------------------------------------------- mall

function shopFront(ctx: Ctx, u: number, label: string, color: string, goods: (x: number, y: number) => void): void {
  const w = 108;
  rrect(ctx, u, -92, w, 18, 4, color);
  text(ctx, label, u + w / 2, -83, 10, '#ffffff', 'center', 900);
  ctx.fillStyle = '#e7f5ff';
  ctx.fillRect(u + 4, -72, w - 8, 65);
  goods(u + 4, -72);
  glassShine(ctx, u + 4, -72, w - 8, 65);
  ctx.strokeStyle = '#868e96';
  ctx.lineWidth = 2;
  ctx.strokeRect(u + 4, -72, w - 8, 65);
  // door
  ctx.fillStyle = 'rgba(165,216,255,0.6)';
  ctx.fillRect(u + w / 2 - 12, -44, 24, 37);
  line(ctx, u + w / 2, -44, u + w / 2, -7, '#868e96', 1.5);
}

function mallWalls(ctx: Ctx): void {
  wallBack(ctx, '#fdf1dc', '#d9c7a7');
  faceY(ctx, 0, 0, 0, () => {
    shopFront(ctx, 16, t('world.shopToys'), '#f03e3e', (x, y) => {
      circle(ctx, x + 20, y + 40, 9, '#b07842');
      circle(ctx, x + 14, y + 31, 4, '#b07842');
      circle(ctx, x + 26, y + 31, 4, '#b07842');
      circle(ctx, x + 78, y + 46, 8, '#4dabf7', '#1971c2', 1.5);
      rrect(ctx, x + 72, y + 18, 16, 12, 3, '#ffd43b');
    });
    shopFront(ctx, 138, t('world.shopClothes'), '#7048e8', (x, y) => {
      line(ctx, x + 8, y + 14, x + 92, y + 14, '#868e96', 2);
      for (const [dx, c] of [
        [14, '#ff8787'],
        [70, '#69db7c'],
      ] as [number, string][]) {
        poly(ctx, [[x + dx, y + 18], [x + dx + 16, y + 18], [x + dx + 22, y + 24], [x + dx + 18, y + 28], [x + dx + 16, y + 26], [x + dx + 16, y + 44], [x + dx, y + 44], [x + dx, y + 26], [x + dx - 2, y + 28], [x + dx - 6, y + 24]], c);
      }
    });
    shopFront(ctx, 260, t('world.shopCafe'), '#e8590c', (x, y) => {
      rrect(ctx, x + 14, y + 34, 16, 18, 3, '#ffffff', '#adb5bd', 1);
      rrect(ctx, x + 72, y + 34, 16, 18, 3, '#ffffff', '#adb5bd', 1);
      for (let i = 0; i < 3; i++) circle(ctx, x + 22 + i * 3, y + 26 - i * 5, 2.5, 'rgba(134,142,150,0.5)');
    });
  });
  faceX(ctx, 0, N, 0, () => {
    // windows between the two entrance doors: the weather outside
    const wins: [number, number][] = [
      [10, DOORS[1] - 16],
      [DOORS[1] + DOOR_W + 6, DOORS[0] - (DOORS[1] + DOOR_W) - 12],
    ];
    for (const [u, w] of wins) {
      outside(ctx, u, -88, w, 66);
      glassShine(ctx, u, -88, w, 66);
      ctx.strokeStyle = '#adb5bd';
      ctx.lineWidth = 3;
      ctx.strokeRect(u, -88, w, 66);
    }
    // open glass doors where people come in
    for (const u of DOORS) {
      streetView(ctx, u, DOOR_W);
      ctx.fillStyle = 'rgba(208,235,255,0.35)';
      ctx.fillRect(u, -DOOR_H, 10, DOOR_H);
      ctx.fillRect(u + DOOR_W - 10, -DOOR_H, 10, DOOR_H);
      rrect(ctx, u + 6, -DOOR_H - 14, DOOR_W - 12, 11, 3, '#40c057');
      text(ctx, '⇄', u + DOOR_W / 2, -DOOR_H - 8.5, 9, '#ffffff', 'center', 900);
    }
    doorFrames(ctx, '#adb5bd', false);
    // the mall logo: an orange
    circle(ctx, 318, -70, 17, '#ff922b', '#e8590c', 2);
    ellipse(ctx, 323, -88, 6, 3, '#51cf66');
    text(ctx, t('world.mall'), 318, -38, 9, '#e8590c', 'center', 900);
  });
  doormats(ctx);
  wallTop(ctx, '#e9dcc3');
}

// ---------------------------------------------------------------- station

function departures(ctx: Ctx, u: number, v: number, w: number, h: number): void {
  rrect(ctx, u, v, w, h, 4, '#212529', '#495057', 2);
  text(ctx, t('world.departures'), u + w / 2, v + 9, 8, '#ffd43b', 'center', 900);
  const now = ENV.hour;
  for (let i = 0; i < 3; i++) {
    const at = Math.ceil((now + 0.25 + i * 0.7) * 4) / 4;
    const hh = Math.floor(at) % 24;
    const mm = Math.round((at - Math.floor(at)) * 60);
    const y = v + 22 + i * 11;
    // a different city on each line; the list moves on every hour
    text(ctx, t(`world.city${((Math.floor(now) + i * 3) % 4) + 1}`), u + 8, y, 8, '#ffa94d', 'left', 800);
    text(ctx, `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, u + w - 8, y, 8, '#ffa94d', 'right', 800);
  }
}

function clock(ctx: Ctx, u: number, v: number, r: number): void {
  circle(ctx, u, v, r + 2, '#495057');
  circle(ctx, u, v, r, '#ffffff');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    circle(ctx, u + Math.sin(a) * (r - 3), v - Math.cos(a) * (r - 3), 0.9, '#495057');
  }
  const h = ENV.hour;
  const ah = ((h % 12) / 12) * Math.PI * 2;
  const am = ((h % 1) * Math.PI * 2);
  line(ctx, u, v, u + Math.sin(ah) * r * 0.5, v - Math.cos(ah) * r * 0.5, '#212529', 2);
  line(ctx, u, v, u + Math.sin(am) * r * 0.8, v - Math.cos(am) * r * 0.8, '#212529', 1.3);
}

function stationWalls(ctx: Ctx): void {
  wallBack(ctx, '#efe3cc', '#b5a68b');
  faceY(ctx, 0, 0, 0, () => {
    // ticket offices
    rrect(ctx, 14, -96, 132, 16, 3, '#1971c2');
    text(ctx, t('world.tickets'), 80, -88, 10, '#ffffff', 'center', 900);
    for (let i = 0; i < 3; i++) {
      const u = 20 + i * 42;
      rrect(ctx, u, -66, 36, 34, 4, '#d0ebff', '#868e96', 2);
      circle(ctx, u + 18, -50, 6, '#f1c8a5');
      rrect(ctx, u + 9, -44, 18, 12, 4, i === 1 ? '#e64980' : '#4c6ef5');
      ctx.fillStyle = '#8d6e52';
      ctx.fillRect(u - 2, -32, 40, 5);
    }
    clock(ctx, 196, -74, 15);
    departures(ctx, 232, -96, 138, 58);
  });
  faceX(ctx, 0, N, 0, () => {
    text(ctx, t('world.station'), LEN / 2, -95, 12, '#8d6e52', 'center', 900);
    // tall arched windows and two arched doorways (where people come in) with the platform behind them
    const wins: [number, number][] = [
      [12, 64],
      [DOORS[1] + DOOR_W + 8, DOORS[0] - (DOORS[1] + DOOR_W) - 16],
      [DOORS[0] + DOOR_W + 22, 72],
    ];
    const winPath = () => {
      for (const [u, w] of wins) {
        ctx.moveTo(u, -12);
        ctx.lineTo(u, -88 + w / 2);
        ctx.arc(u + w / 2, -88 + w / 2, w / 2, Math.PI, 0);
        ctx.lineTo(u + w, -12);
        ctx.closePath();
      }
    };
    ctx.save();
    ctx.beginPath();
    winPath();
    doorPath(ctx, true);
    ctx.clip();
    outside(ctx, 0, -104, LEN, 92);
    ctx.fillStyle = '#adb5bd';
    ctx.fillRect(0, -26, LEN, 14);
    // a train rolls past now and then (more often when trains come from the city)
    const period = ENV.trains ? 9 : 16;
    const k = ENV.reduceMotion ? 0.4 : (ENV.t % period) / period;
    const tx = -520 + k * (LEN + 760);
    for (let c = 0; c < 4; c++) {
      const x = tx + c * 128;
      rrect(ctx, x, -60, 122, 36, 8, c === 0 ? '#e03131' : '#1c7ed6');
      ctx.fillStyle = '#ffd43b';
      ctx.fillRect(x, -36, 122, 4);
      for (let w = 0; w < 4; w++) rrect(ctx, x + 10 + w * 28, -54, 20, 12, 3, '#e7f5ff');
    }
    ctx.restore();
    ctx.strokeStyle = '#8d6e52';
    ctx.lineWidth = 3;
    ctx.beginPath();
    winPath();
    ctx.stroke();
    for (const [u, w] of wins) line(ctx, u + w / 2, -88, u + w / 2, -12, '#8d6e52', 2);
    doorFrames(ctx, '#8d6e52', true);
  });
  doormats(ctx);
  wallTop(ctx, '#d8c9ad');
}

/** Back walls of an indoor place (drawn right after the floor). */
export function drawWalls(ctx: Ctx, style: WallStyle): void {
  drawSprite(ctx, style === 'mall' ? 'wall_mall' : 'wall_station', { x: 0, y: 0, sx: 0, sy: 0, s: 1 });
}

// ---------------------------------------------------------------- props

function vending(ctx: Ctx, c: SpriteCall): void {
  const x = c.x - 0.3;
  const y = c.y - 0.22;
  shadow(ctx, c.sx, c.sy, 22, 0.18);
  box(ctx, x, y, 0.6, 0.44, 56, 0, '#e03131');
  faceY(ctx, x, y + 0.44, 0, () => {
    rrect(ctx, 3, -50, 13, 38, 2, '#e7f5ff');
    for (let r = 0; r < 4; r++) for (let k = 0; k < 2; k++) rrect(ctx, 5 + k * 5, -47 + r * 9, 3.5, 7, 1, ['#40c057', '#fab005', '#4dabf7', '#ff922b'][r]);
    rrect(ctx, 16, -40, 2.5, 8, 1, '#212529');
    rrect(ctx, 4, -9, 12, 5, 1, '#212529');
  });
}

function column(ctx: Ctx, c: SpriteCall): void {
  const x = c.x - 0.2;
  const y = c.y - 0.2;
  shadow(ctx, c.sx, c.sy, 16, 0.15);
  box(ctx, x - 0.05, y - 0.05, 0.5, 0.5, 8, 0, '#c9b896');
  box(ctx, x, y, 0.4, 0.4, WALL_H - 16, 8, '#efe3cc');
  box(ctx, x - 0.06, y - 0.06, 0.52, 0.52, 8, WALL_H - 8, '#c9b896');
}

function luggage(ctx: Ctx, c: SpriteCall): void {
  const { x, y } = c;
  shadow(ctx, c.sx, c.sy, 18, 0.15);
  box(ctx, x - 0.3, y - 0.12, 0.34, 0.2, 26, 0, '#1c7ed6');
  box(ctx, x + 0.08, y - 0.1, 0.28, 0.18, 18, 0, '#e64980');
  box(ctx, x - 0.25, y - 0.1, 0.24, 0.16, 10, 26, '#fab005');
  const [hx, hy] = P(x - 0.13, y - 0.02, 36);
  ctx.beginPath();
  ctx.arc(hx, hy, 3.5, Math.PI, 0);
  ctx.strokeStyle = '#495057';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function platformSign(ctx: Ctx, c: SpriteCall): void {
  const { x, y } = c;
  shadow(ctx, c.sx, c.sy, 14, 0.15);
  box(ctx, x - 0.32, y - 0.03, 0.05, 0.05, 40, 0, '#495057');
  box(ctx, x + 0.28, y - 0.03, 0.05, 0.05, 40, 0, '#495057');
  faceY(ctx, x - 0.4, y + 0.02, 40, () => {
    rrect(ctx, 0, -18, 26, 18, 3, '#1971c2', '#ffffff', 1.5);
    text(ctx, '🚆', 6, -9, 8, '#000', 'center', 400);
    text(ctx, '→', 19, -9, 10, '#ffffff', 'center', 900);
  });
}

function bin(ctx: Ctx, c: SpriteCall): void {
  shadow(ctx, c.sx, c.sy, 9, 0.15);
  rrect(ctx, c.sx - 6, c.sy - 18, 12, 18, 3, '#868e96');
  ellipse(ctx, c.sx, c.sy - 18, 6.5, 3, '#495057');
}

function plant(ctx: Ctx, c: SpriteCall): void {
  const s = c.s;
  const { sx, sy } = c;
  shadow(ctx, sx, sy, 14 * s, 0.16);
  ctx.beginPath();
  ctx.moveTo(sx - 10 * s, sy - 18 * s);
  ctx.lineTo(sx + 10 * s, sy - 18 * s);
  ctx.lineTo(sx + 7 * s, sy);
  ctx.lineTo(sx - 7 * s, sy);
  ctx.closePath();
  ctx.fillStyle = '#e8590c';
  ctx.fill();
  ellipse(ctx, sx, sy - 18 * s, 10 * s, 3.5 * s, '#c2410c');
  const sway = ENV.reduceMotion ? 0 : Math.sin(ENV.t * 0.8 + c.x) * 1;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.42;
    ctx.save();
    ctx.translate(sx, sy - 20 * s);
    ctx.rotate(a + sway * 0.03);
    ellipse(ctx, 15 * s, 0, 16 * s, 4.5 * s, i % 2 ? '#2f9e44' : '#40c057');
    ctx.restore();
  }
}

function balloons(ctx: Ctx, c: SpriteCall): void {
  const { sx, sy } = c;
  shadow(ctx, sx, sy, 6, 0.15);
  rrect(ctx, sx - 4, sy - 5, 8, 5, 2, '#495057');
  const cols = ['#ff6b6b', '#ffd43b', '#4dabf7', '#69db7c', '#da77f2'];
  for (let i = 0; i < 5; i++) {
    const bob = ENV.reduceMotion ? 0 : Math.sin(ENV.t * 1.5 + i) * 2;
    const bx = sx + (i - 2) * 9;
    const by = sy - 62 - (i % 2) * 10 + bob;
    line(ctx, sx, sy - 5, bx, by + 9, 'rgba(73,80,87,0.6)', 0.8);
    ellipse(ctx, bx, by, 7, 9, cols[i]);
    ellipse(ctx, bx - 2, by - 3, 2, 3, 'rgba(255,255,255,0.5)');
  }
}

function infoKiosk(ctx: Ctx, c: SpriteCall): void {
  const x = c.x - 0.4;
  const y = c.y - 0.3;
  shadow(ctx, c.sx, c.sy, 26, 0.16);
  box(ctx, x, y, 0.8, 0.6, 30, 0, '#1c7ed6');
  box(ctx, x - 0.04, y - 0.04, 0.88, 0.68, 4, 30, '#e7f5ff');
  const [px, py] = P(c.x, c.y - 0.1, 34);
  line(ctx, px, py, px, py - 22, '#868e96', 2);
  circle(ctx, px, py - 30, 9, '#1c7ed6', '#ffffff', 2);
  text(ctx, 'i', px, py - 30, 12, '#ffffff', 'center', 900);
}

/** A small stage; on a concert day a band plays under coloured lights. */
function stage(ctx: Ctx, c: SpriteCall): void {
  const x = c.x;
  const y = c.y;
  const w = (c.w as number) ?? 2.8;
  const d = (c.d as number) ?? 1.8;
  box(ctx, x, y, w, d, 12, 0, '#5f3dc4');
  box(ctx, x, y, w, 0.12, 74, 12, '#3b2a6b');
  faceY(ctx, x, y + 0.12, 12, () => {
    for (let i = 0; i < 9; i++) circle(ctx, 10 + i * 10, -60 + (i % 2) * 8, 1.6, 'rgba(255,224,102,0.8)');
  });
  box(ctx, x + 0.08, y + d - 0.5, 0.35, 0.35, 26, 12, '#343a40');
  box(ctx, x + w - 0.43, y + d - 0.5, 0.35, 0.35, 26, 12, '#343a40');
  for (const sxp of [x + 0.25, x + w - 0.25]) {
    const [px, py] = P(sxp, y + d - 0.15, 24);
    circle(ctx, px, py, 5, '#868e96', '#212529', 1.5);
  }
  if (!ENV.concert) return;
  const tt = ENV.reduceMotion ? 0 : ENV.t;
  // light beams
  const cols = ['rgba(255,107,107,0.22)', 'rgba(77,171,247,0.22)', 'rgba(255,212,59,0.22)'];
  for (let i = 0; i < 3; i++) {
    const [lx, ly] = P(x + 0.6 + i * 0.8, y + 0.1, 86);
    const sw = Math.sin(tt * 1.6 + i * 2) * 26;
    poly(ctx, [[lx, ly], [lx - 22 + sw, ly + 80], [lx + 22 + sw, ly + 80]], cols[i]);
  }
  // the band: a singer and a guitarist
  for (let i = 0; i < 2; i++) {
    const [bx, by] = P(x + w * (0.38 + i * 0.3), y + d * 0.55, 12);
    const hop = Math.abs(Math.sin(tt * 5 + i)) * 3;
    rrect(ctx, bx - 6, by - 26 - hop, 12, 18, 4, i ? '#20c997' : '#f783ac');
    circle(ctx, bx, by - 31 - hop, 6, '#f1c8a5');
    ctx.fillStyle = i ? '#343a40' : '#ffd43b';
    ctx.fillRect(bx - 6, by - 38 - hop, 12, 4);
    line(ctx, bx - 3, by - 8 - hop, bx - 4, by, '#343a40', 2.5);
    line(ctx, bx + 3, by - 8 - hop, bx + 4, by, '#343a40', 2.5);
    if (i) ellipse(ctx, bx + 6, by - 16 - hop, 7, 4, '#e8590c');
    else line(ctx, bx + 6, by - 24 - hop, bx + 8, by - 34 - hop, '#495057', 1.5);
  }
  // notes float up
  for (let i = 0; i < 3; i++) {
    const k = (tt * 0.5 + i / 3) % 1;
    const [nx, ny] = P(x + w * 0.5, y + d * 0.5, 50 + k * 40);
    text(ctx, i % 2 ? '♪' : '♫', nx + Math.sin(k * 6 + i) * 18, ny, 12, `rgba(112,72,232,${1 - k})`, 'center', 900);
  }
}

registerProcs({
  wall_mall: (ctx) => mallWalls(ctx),
  wall_station: (ctx) => stationWalls(ctx),
  prop_vending: vending,
  prop_column: column,
  prop_luggage: luggage,
  prop_sign_platform: platformSign,
  prop_bin: bin,
  prop_plant: plant,
  prop_balloons: balloons,
  prop_kiosk_info: infoKiosk,
  bld_stage: stage,
});
