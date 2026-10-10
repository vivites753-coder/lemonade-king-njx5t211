// Procedural props: trees, benches, lamps, fences, beach things, cars.
import { registerProcs, type SpriteCall } from '../assets';
import { ENV } from '../env';
import { box, circle, ellipse, faceY, line, P, poly, rrect, shadow, type Ctx } from '../iso';

function tree(ctx: Ctx, c: SpriteCall, palette: [string, string, string], tall = 1): void {
  const s = c.s * tall;
  const { sx, sy } = c;
  shadow(ctx, sx, sy, 18 * s, 0.18);
  rrect(ctx, sx - 3.5 * s, sy - 30 * s, 7 * s, 30 * s, 2.5 * s, '#8a5a35');
  rrect(ctx, sx + 0.5 * s, sy - 30 * s, 3 * s, 30 * s, 1.5 * s, '#6f4628');
  const sway = ENV.reduceMotion ? 0 : Math.sin(ENV.t * 1.3 + c.x) * 1.2 * (ENV.weather === 'wind' ? 3 : 1);
  circle(ctx, sx - 11 * s + sway, sy - 40 * s, 15 * s, palette[1]);
  circle(ctx, sx + 12 * s + sway, sy - 42 * s, 14 * s, palette[2]);
  circle(ctx, sx + sway, sy - 54 * s, 19 * s, palette[0]);
  circle(ctx, sx - 6 * s + sway, sy - 60 * s, 8 * s, 'rgba(255,255,255,0.18)');
}

function palm(ctx: Ctx, c: SpriteCall): void {
  const s = c.s;
  const { sx, sy } = c;
  shadow(ctx, sx + 8 * s, sy, 16 * s, 0.16);
  const sway = ENV.reduceMotion ? 0 : Math.sin(ENV.t * 1.1 + c.x) * 2 * (ENV.weather === 'wind' ? 2.5 : 1);
  for (let i = 0; i < 7; i++) {
    const k = i / 7;
    const x = sx + Math.sin(k * 1.6) * 10 * s + sway * k;
    rrect(ctx, x - 3.6 * s, sy - (i + 1) * 11 * s, 7.2 * s, 12 * s, 3 * s, i % 2 ? '#b08350' : '#9c7243');
  }
  const tx = sx + 10 * s + sway;
  const ty = sy - 78 * s;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(a);
    ellipse(ctx, 16 * s, 2 * s, 18 * s, 5 * s, i % 2 ? '#40c057' : '#2f9e44');
    ctx.restore();
  }
  circle(ctx, tx - 3 * s, ty + 4 * s, 3.5 * s, '#7a5230');
  circle(ctx, tx + 3 * s, ty + 5 * s, 3.5 * s, '#7a5230');
}

function bush(ctx: Ctx, c: SpriteCall): void {
  const s = c.s;
  shadow(ctx, c.sx, c.sy, 14 * s, 0.15);
  circle(ctx, c.sx - 7 * s, c.sy - 7 * s, 8 * s, '#51a84f');
  circle(ctx, c.sx + 7 * s, c.sy - 7 * s, 8 * s, '#459b43');
  circle(ctx, c.sx, c.sy - 12 * s, 10 * s, '#5cbc5a');
}

function flowers(ctx: Ctx, c: SpriteCall): void {
  const s = c.s;
  const cols = ['#ff6b6b', '#ffd43b', '#f783ac', '#ffffff', '#b197fc'];
  ellipse(ctx, c.sx, c.sy - 2, 16 * s, 7 * s, '#4a8f3c');
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4;
    const r = (i % 3) * 4.5 * s + 2;
    circle(ctx, c.sx + Math.cos(a) * r * 1.6, c.sy - 4 * s + Math.sin(a) * r * 0.6, 2.6 * s, cols[i % cols.length]);
  }
}

function bench(ctx: Ctx, c: SpriteCall): void {
  const { x, y } = c;
  shadow(ctx, c.sx, c.sy, 20, 0.15);
  for (const dx of [0.08, 0.82]) box(ctx, x - 0.5 + dx, y - 0.1, 0.08, 0.2, 8, 0, '#495057');
  box(ctx, x - 0.5, y - 0.15, 1.0, 0.3, 3, 8, '#c58b4f');
  box(ctx, x - 0.5, y - 0.18, 1.0, 0.06, 10, 12, '#b07a43');
}

function lamp(ctx: Ctx, c: SpriteCall): void {
  const { sx, sy } = c;
  shadow(ctx, sx, sy, 6, 0.2);
  rrect(ctx, sx - 1.6, sy - 62, 3.2, 62, 1.5, '#495057');
  rrect(ctx, sx - 6, sy - 70, 12, 9, 3, '#343a40');
  const glow = ENV.dusk;
  circle(ctx, sx, sy - 63, 4, glow > 0.2 ? '#fff3bf' : '#dee2e6');
  if (glow > 0.2) {
    const g = ctx.createRadialGradient(sx, sy - 63, 2, sx, sy - 63, 40);
    g.addColorStop(0, `rgba(255,236,153,${0.5 * glow})`);
    g.addColorStop(1, 'rgba(255,236,153,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy - 63, 40, 0, Math.PI * 2);
    ctx.fill();
  }
}

function fencePost(ctx: Ctx, c: SpriteCall): void {
  const { x, y } = c;
  box(ctx, x, y - 0.04, 0.08, 0.08, 18, 0, '#f1e3c8');
  // rails to the next post
  poly(ctx, [P(x + 0.08, y, 13), P(x + 0.5, y, 13), P(x + 0.5, y, 10), P(x + 0.08, y, 10)], '#e6d3ae');
  poly(ctx, [P(x + 0.08, y, 6), P(x + 0.5, y, 6), P(x + 0.5, y, 3), P(x + 0.08, y, 3)], '#e6d3ae');
}

function mailbox(ctx: Ctx, c: SpriteCall): void {
  const { x, y } = c;
  shadow(ctx, c.sx, c.sy, 7, 0.18);
  box(ctx, x - 0.03, y - 0.03, 0.06, 0.06, 18, 0, '#6f4628');
  box(ctx, x - 0.15, y - 0.1, 0.3, 0.2, 10, 18, '#339af0');
  box(ctx, x + 0.12, y - 0.02, 0.03, 0.03, 10, 24, '#fa5252');
}

function parasol(ctx: Ctx, c: SpriteCall): void {
  const { x, y, sx, sy } = c;
  poly(ctx, [P(x - 0.45, y - 0.2), P(x + 0.45, y - 0.2), P(x + 0.45, y + 0.6), P(x - 0.45, y + 0.6)], '#74c0fc');
  poly(ctx, [P(x - 0.45, y + 0.05), P(x + 0.45, y + 0.05), P(x + 0.45, y + 0.15), P(x - 0.45, y + 0.15)], '#ffffff');
  line(ctx, sx, sy, sx, sy - 58, '#adb5bd', 2.5);
  const cx = sx;
  const cy = sy - 58;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.5);
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 34, (i / 8) * Math.PI * 2, ((i + 1) / 8) * Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? '#ffffff' : '#ff6b6b';
    ctx.fill();
  }
  ctx.restore();
  circle(ctx, cx, cy - 2, 2.5, '#ff6b6b');
}

function boat(ctx: Ctx, c: SpriteCall): void {
  const bob = ENV.reduceMotion ? 0 : Math.sin(ENV.t * 1.6 + c.x) * 2.5;
  const { x, y } = c;
  ctx.save();
  ctx.translate(0, bob);
  poly(ctx, [P(x - 0.7, y, 8), P(x + 0.7, y, 8), P(x + 0.5, y + 0.35, 0), P(x - 0.5, y + 0.35, 0)], '#ffffff');
  poly(ctx, [P(x - 0.7, y, 8), P(x + 0.7, y, 8), P(x + 0.7, y + 0.3, 8), P(x - 0.7, y + 0.3, 8)], '#e9c46a');
  const [mx, my] = P(x, y + 0.15, 8);
  line(ctx, mx, my, mx, my - 46, '#6f4628', 2);
  poly(ctx, [[mx + 2, my - 44], [mx + 26, my - 8], [mx + 2, my - 8]], '#ff6b6b');
  ctx.restore();
}

function sandcastle(ctx: Ctx, c: SpriteCall): void {
  const { x, y } = c;
  box(ctx, x - 0.3, y - 0.2, 0.6, 0.4, 10, 0, '#e9c46a');
  box(ctx, x - 0.3, y - 0.2, 0.18, 0.18, 10, 10, '#e9c46a');
  box(ctx, x + 0.12, y + 0.02, 0.18, 0.18, 10, 10, '#e9c46a');
  const [fx, fy] = P(x + 0.21, y + 0.11, 20);
  line(ctx, fx, fy, fx, fy - 10, '#495057', 1);
  poly(ctx, [[fx, fy - 10], [fx + 7, fy - 8], [fx, fy - 6]], '#fa5252');
}

function ball(ctx: Ctx, c: SpriteCall, big: boolean): void {
  const r = big ? 7 : 5;
  shadow(ctx, c.sx, c.sy, r, 0.2);
  circle(ctx, c.sx, c.sy - r, r, '#ffffff');
  ctx.save();
  ctx.beginPath();
  ctx.arc(c.sx, c.sy - r, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = big ? '#fa5252' : '#fd7e14';
  ctx.fillRect(c.sx - r, c.sy - r * 2, r * 0.7, r * 2);
  ctx.fillStyle = big ? '#339af0' : '#fd7e14';
  ctx.fillRect(c.sx + r * 0.3, c.sy - r * 2, r * 0.7, r * 2);
  ctx.restore();
}

function flagpole(ctx: Ctx, c: SpriteCall): void {
  const { sx, sy } = c;
  shadow(ctx, sx, sy, 6, 0.2);
  rrect(ctx, sx - 1.5, sy - 100, 3, 100, 1.5, '#ced4da');
  const wave = ENV.reduceMotion ? 0 : Math.sin(ENV.t * 4) * 3;
  poly(ctx, [[sx + 1.5, sy - 98], [sx + 34, sy - 94 + wave], [sx + 34, sy - 82 + wave], [sx + 1.5, sy - 86]], '#4dabf7');
  poly(ctx, [[sx + 1.5, sy - 86], [sx + 34, sy - 82 + wave], [sx + 34, sy - 70 + wave], [sx + 1.5, sy - 74]], '#ffd43b');
}

function bikeRack(ctx: Ctx, c: SpriteCall): void {
  const { x, y } = c;
  for (let i = 0; i < 3; i++) {
    faceY(ctx, x - 0.4 + i * 0.35, y, 0, () => {
      ctx.beginPath();
      ctx.arc(4, -6, 5, Math.PI, 0);
      ctx.strokeStyle = '#868e96';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }
}

function duck(ctx: Ctx, c: SpriteCall): void {
  const t = ENV.reduceMotion ? 0 : ENV.t;
  const dx = Math.sin(t * 0.4) * 0.6;
  const dy = Math.cos(t * 0.4) * 0.3;
  const [sx, sy] = P(c.x + dx, c.y + dy);
  ellipse(ctx, sx, sy - 3, 7, 4, '#ffffff');
  circle(ctx, sx + 5, sy - 8, 3.5, '#2f9e44');
  poly(ctx, [[sx + 8, sy - 8], [sx + 12, sy - 7], [sx + 8, sy - 6]], '#fab005');
}

/** Car body is long along x. */
export function drawCar(ctx: Ctx, x: number, y: number, color: string, dir: number): void {
  const [sx, sy] = P(x, y);
  shadow(ctx, sx, sy, 28, 0.2);
  box(ctx, x - 0.55, y - 0.27, 1.1, 0.54, 12, 4, color);
  box(ctx, x - 0.25 - dir * 0.05, y - 0.22, 0.55, 0.44, 10, 16, '#dbe4ff', { top: color });
  for (const [wx, wy] of [
    [x - 0.35, y + 0.27],
    [x + 0.35, y + 0.27],
  ]) {
    const [px, py] = P(wx, wy, 4);
    ellipse(ctx, px, py, 4.5, 4.5, '#212529');
  }
  const [hx, hy] = P(x + dir * 0.55, y + 0.1, 10);
  circle(ctx, hx, hy, 2, '#fff3bf');
}

registerProcs({
  prop_tree_a: (ctx, c) => tree(ctx, c, ['#5cbc5e', '#4fae52', '#44a047']),
  prop_tree_b: (ctx, c) => tree(ctx, c, ['#7bc96f', '#69b85c', '#5aa84e'], 0.9),
  prop_tree_c: (ctx, c) => tree(ctx, c, ['#94d82d', '#82c91e', '#74b816'], 0.8),
  prop_palm: palm,
  prop_bush: bush,
  prop_flowers: flowers,
  prop_bench: bench,
  prop_lamp: lamp,
  prop_fence_post: fencePost,
  prop_mailbox: mailbox,
  prop_parasol: parasol,
  prop_boat: boat,
  prop_sandcastle: sandcastle,
  prop_beachball: (ctx, c) => ball(ctx, c, true),
  prop_ball: (ctx, c) => ball(ctx, c, false),
  prop_flagpole: flagpole,
  prop_bike_rack: bikeRack,
  prop_duck: duck,
});
