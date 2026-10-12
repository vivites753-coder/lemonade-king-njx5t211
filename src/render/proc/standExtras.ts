// Stand upgrades added in v0.2: dispenser, cash box, cooler, toolkit, branded cups, tent, mascot,
// plus the wrench bubble shown over broken equipment.
import { CONFIG } from '../../core/config';
import { registerProcs, type SpriteCall } from '../assets';
import { ENV } from '../env';
import { box, circle, ellipse, faceY, line, P, rrect, shadow, text, type Ctx } from '../iso';

const SX = CONFIG.STAND.x;
const SY = CONFIG.STAND.y;
const TABLE_H = 22;

interface Call extends SpriteCall {
  level?: number;
  on?: boolean;
}

/** Lemonade dispenser with a tap (replaces the pitcher). */
function dispenser(ctx: Ctx, level: number): void {
  const x = SX - 0.38;
  const y = SY - 0.2;
  box(ctx, x, y, 0.34, 0.34, 4, TABLE_H, '#868e96');
  const h = 32;
  const liquid = Math.max(0, Math.min(1, level));
  if (liquid > 0) box(ctx, x + 0.03, y + 0.03, 0.28, 0.28, (h - 6) * liquid, TABLE_H + 5, '#fcc419', { top: '#ffe066', left: '#fcc419', right: '#f2b705' });
  box(ctx, x, y, 0.34, 0.34, h, TABLE_H + 4, '#d0ebff', { top: 'rgba(208,235,255,0.2)', left: 'rgba(208,235,255,0.22)', right: 'rgba(165,216,255,0.28)', stroke: 'rgba(116,192,252,0.9)' });
  const [tx, ty] = P(x + 0.17, y + 0.34, TABLE_H + 9);
  rrect(ctx, tx - 2, ty - 2, 4, 7, 1.5, '#495057');
  circle(ctx, tx, ty - 3, 2.5, '#fa5252');
}

function cashBox(ctx: Ctx): void {
  const x = SX + 0.48;
  const y = SY - 0.25;
  box(ctx, x, y, 0.26, 0.2, 9, TABLE_H, '#868e96');
  const [lx, ly] = P(x + 0.13, y + 0.2, TABLE_H + 5);
  circle(ctx, lx, ly, 2.4, '#fcc419', '#e0a800', 0.8);
}

function coolerBox(ctx: Ctx): void {
  const x = SX - 1.15;
  const y = SY - 0.35;
  box(ctx, x, y, 0.42, 0.3, 14, 0, '#4dabf7');
  box(ctx, x - 0.02, y - 0.02, 0.46, 0.34, 3, 14, '#f8f9fa');
  faceY(ctx, x, y + 0.3, 0, () => text(ctx, '❄', 6.5, -7, 8, '#ffffff', 'center', 900));
}

function toolBox(ctx: Ctx): void {
  const x = SX - 1.05;
  const y = SY - 0.95;
  box(ctx, x, y, 0.36, 0.2, 9, 0, '#e03131');
  const [hx, hy] = P(x + 0.18, y + 0.1, 12);
  ctx.beginPath();
  ctx.arc(hx, hy, 4, Math.PI, 0);
  ctx.strokeStyle = '#495057';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function brandedCups(ctx: Ctx): void {
  const [x, y] = P(SX + 0.2, SY + 0.15, TABLE_H);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 3 - i * 3);
    ctx.lineTo(x + 5, y - 3 - i * 3);
    ctx.lineTo(x + 4, y - i * 3);
    ctx.lineTo(x - 4, y - i * 3);
    ctx.closePath();
    ctx.fillStyle = i === 3 ? '#ffd43b' : '#fcc419';
    ctx.fill();
  }
  circle(ctx, x, y - 10, 2.2, '#e8590c');
}

/** A gazebo tent over the stand (replaces the umbrella). */
function tent(ctx: Ctx, broken: boolean): void {
  const corners: [number, number][] = [
    [SX - 1.0, SY - 1.3],
    [SX + 1.0, SY - 1.3],
    [SX + 1.0, SY + 0.6],
    [SX - 1.0, SY + 0.6],
  ];
  const H = 84;
  for (const [x, y] of corners) box(ctx, x - 0.03, y - 0.03, 0.06, 0.06, H, 0, '#dee2e6');
  const [ax, ay] = P(SX, SY - 0.35, H + 34);
  const pts = corners.map(([x, y]) => P(x, y, H));
  const cols = broken ? ['#adb5bd', '#ced4da'] : ['#ff922b', '#ffffff'];
  for (let i = 0; i < 4; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 4];
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(ax, ay);
    ctx.closePath();
    ctx.fillStyle = cols[i % 2];
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.stroke();
  }
  // scalloped edge on the two front sides
  const edges: [number, number][][] = [
    [pts[2], pts[3]],
    [pts[1], pts[2]],
  ];
  for (const [a, b] of edges) {
    for (let k = 0; k < 6; k++) {
      const u = (k + 0.5) / 6;
      circle(ctx, a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + 2, 4, k % 2 ? cols[0] : cols[1]);
    }
  }
}

/** The lemon mascot dancing next to the stand. */
function mascot(ctx: Ctx): void {
  const t = ENV.reduceMotion ? 0 : ENV.t;
  const [sx, sy0] = P(SX - 1.55, SY + 1.25);
  const hop = Math.abs(Math.sin(t * 4)) * 4;
  const sy = sy0 - hop;
  shadow(ctx, sx, sy0, 12);
  line(ctx, sx - 4, sy - 8, sx - 6, sy0, '#343a40', 3);
  line(ctx, sx + 4, sy - 8, sx + 6, sy0, '#343a40', 3);
  const wave = Math.sin(t * 6) * 0.6;
  line(ctx, sx - 13, sy - 26, sx - 22, sy - 40 - wave * 8, '#ffd43b', 4);
  line(ctx, sx + 13, sy - 26, sx + 22, sy - 38 + wave * 8, '#ffd43b', 4);
  ellipse(ctx, sx, sy - 26, 16, 21, '#ffd43b', '#e0a800', 1.5);
  ellipse(ctx, sx - 18, sy - 26, 4, 3, '#ffd43b');
  ellipse(ctx, sx + 18, sy - 26, 4, 3, '#ffd43b');
  ellipse(ctx, sx + 4, sy - 49, 6, 3, '#51cf66');
  circle(ctx, sx - 5, sy - 30, 2.2, '#2b2b2b');
  circle(ctx, sx + 5, sy - 30, 2.2, '#2b2b2b');
  ctx.beginPath();
  ctx.arc(sx, sy - 24, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.strokeStyle = '#7a3b2e';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/** A small orange scooter parked next to the stand. */
function scooter(ctx: Ctx): void {
  const x = SX - 2.1;
  const y = SY - 0.7;
  const [gx, gy] = P(x + 0.45, y);
  shadow(ctx, gx, gy, 20, 0.16);
  faceY(ctx, x, y, 0, () => {
    circle(ctx, 6, -6, 6, '#212529');
    circle(ctx, 6, -6, 2.5, '#adb5bd');
    circle(ctx, 34, -6, 6, '#212529');
    circle(ctx, 34, -6, 2.5, '#adb5bd');
    // body and floor
    rrect(ctx, 8, -14, 22, 6, 3, '#ff922b');
    rrect(ctx, 20, -22, 14, 10, 4, '#ff922b');
    rrect(ctx, 22, -26, 10, 5, 2, '#343a40');
    // steering column, handlebar and headlight
    line(ctx, 8, -12, 4, -34, '#e8590c', 3);
    line(ctx, -1, -35, 9, -35, '#212529', 2.5);
    circle(ctx, 4, -29, 2.5, '#ffe066');
  });
}

/** A TV with cartoons behind the queue: people wait longer. */
function tv(ctx: Ctx, broken: boolean): void {
  const x = SX + 2.3;
  const y = SY - 0.85;
  const [gx, gy] = P(x + 0.35, y + 0.1);
  shadow(ctx, gx, gy, 16, 0.16);
  // stand
  box(ctx, x + 0.3, y + 0.02, 0.1, 0.1, 30, 0, '#495057');
  box(ctx, x + 0.1, y - 0.05, 0.5, 0.25, 3, 0, '#343a40');
  // the screen faces the queue
  faceY(ctx, x, y + 0.08, 30, () => {
    rrect(ctx, -2, -34, 28, 26, 4, '#212529');
    if (broken) {
      for (let i = 0; i < 18; i++) {
        ctx.fillStyle = Math.random() < 0.5 ? '#ced4da' : '#868e96';
        ctx.fillRect(1 + (i % 6) * 4, -31 + Math.floor(i / 6) * 6.5, 4, 6.5);
      }
      return;
    }
    ctx.fillStyle = '#74c0fc';
    ctx.fillRect(1, -31, 22, 20);
    ctx.fillStyle = '#69db7c';
    ctx.fillRect(1, -16, 22, 5);
    const tt = ENV.reduceMotion ? 0 : ENV.t;
    // a cartoon: a bouncing ball and a running character
    const bx = 4 + ((tt * 9) % 16);
    circle(ctx, bx, -17 - Math.abs(Math.sin(tt * 5)) * 7, 2.4, '#ff6b6b');
    circle(ctx, 20 - ((tt * 6) % 16), -21, 3, '#ffd43b');
    circle(ctx, 20 - ((tt * 6) % 16) + 1, -22, 0.8, '#212529');
  });
  // antenna
  const [ax, ay] = P(x + 0.3, y + 0.05, 64);
  line(ctx, ax, ay, ax - 5, ay - 9, '#495057', 1.2);
  line(ctx, ax, ay, ax + 5, ay - 9, '#495057', 1.2);
}

/** A plate of cookies on the table. */
function cookiePlate(ctx: Ctx, n: number): void {
  const [x, y] = P(SX + 0.7, SY + 0.05, TABLE_H);
  ellipse(ctx, x, y, 9, 4, '#f8f9fa', '#ced4da', 1);
  const k = Math.min(5, Math.ceil(n / 4));
  for (let i = 0; i < k; i++) {
    const cx = x - 5 + (i % 3) * 5;
    const cy = y - 1 - Math.floor(i / 3) * 3;
    ellipse(ctx, cx, cy, 3.6, 2, '#d9a066', '#a0612b', 0.8);
    circle(ctx, cx - 1, cy - 0.3, 0.6, '#5c3d1e');
  }
}

/** A red wrench bubble above broken equipment. */
export function brokenMark(ctx: Ctx, x: number, y: number, z: number): void {
  const [bx, by] = P(x, y, z);
  const pulse = ENV.reduceMotion ? 0 : Math.sin(ENV.t * 5) * 1.5;
  circle(ctx, bx, by - pulse, 10, '#fff0f0', '#fa5252', 2);
  text(ctx, '🔧', bx, by - pulse + 0.5, 10, '#000', 'center', 400);
}

registerProcs({
  stand_dispenser: (ctx, c) => dispenser(ctx, (c as Call).level ?? 0),
  stand_cashbox: (ctx) => cashBox(ctx),
  stand_cooler: (ctx) => coolerBox(ctx),
  stand_toolkit: (ctx) => toolBox(ctx),
  item_cups_branded: (ctx) => brandedCups(ctx),
  stand_tent: (ctx, c) => tent(ctx, !!(c as Call).on),
  stand_mascot: (ctx) => mascot(ctx),
  stand_scooter: (ctx) => scooter(ctx),
  stand_tv: (ctx, c) => tv(ctx, !!(c as Call).on),
  item_cookies: (ctx, c) => cookiePlate(ctx, (c as Call).level ?? 0),
});
