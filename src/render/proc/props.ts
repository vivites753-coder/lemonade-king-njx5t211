// Procedural props: trees, benches, lamps, fences, beach things, cars.
import { drawSprite, getImage, hasImage, metaFor, registerProcs, type SpriteCall } from '../assets';
import { ENV } from '../env';
import { box, circle, ellipse, faceX, faceY, line, P, poly, rrect, shadow, text, type Ctx } from '../iso';

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
  const len = c.s || 1; // length of this section in tiles
  box(ctx, x, y - 0.04, 0.08, 0.08, 18, 0, '#f1e3c8');
  // rails to the next post
  poly(ctx, [P(x + 0.08, y, 13), P(x + len, y, 13), P(x + len, y, 10), P(x + 0.08, y, 10)], '#e6d3ae');
  poly(ctx, [P(x + 0.08, y, 6), P(x + len, y, 6), P(x + len, y, 3), P(x + 0.08, y, 3)], '#e6d3ae');
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

/** A city bus: long along x, a window band on its side, a white stripe, and lights on the end the viewer sees. */
export function drawBus(ctx: Ctx, x: number, y: number, color: string, dir: number, standing = false): void {
  const L = 2.4;
  const W = 0.62;
  const H = 30;
  const Z = 5;
  const [sx, sy] = P(x, y);
  carShadow(ctx, sx, sy, 1.9);
  const x0 = x - L / 2;
  const y1 = y + W / 2;
  // the wheels under the body, on the side the viewer sees
  for (const wx of [x - 0.8, x + 0.75]) {
    const [px, py] = P(wx, y1, 4);
    ellipse(ctx, px, py, 5.2, 5.2, '#212529');
    ellipse(ctx, px, py, 2.2, 2.2, '#adb5bd');
  }
  box(ctx, x0, y - W / 2, L, W, H, Z, color);
  // a lower skirt and a white stripe on the side
  faceY(ctx, x0, y1, Z + H, () => {
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(0, H - 7, L * 32, 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, H - 13, L * 32, 3);
    // the windows (the first one, at the front, is wider: the driver)
    const n = 7;
    const w = (L * 32 - 10) / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = '#cfe8ff';
      ctx.fillRect(5 + i * w + 1.5, 4, w - 3, 11);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(5 + i * w + 3, 5, 3, 7);
    }
  });
  // the end the viewer sees: lights, and a window
  faceX(ctx, x0 + L, y1, Z + H, () => {
    ctx.fillStyle = '#cfe8ff';
    ctx.fillRect(4, 4, W * 32 - 8, 11);
    const rear = dir < 0;
    ctx.fillStyle = rear ? (standing ? '#ff6b6b' : '#c92a2a') : '#fff3bf';
    ctx.fillRect(2, H - 9, 5, 4);
    ctx.fillRect(W * 32 - 7, H - 9, 5, 4);
  });
  // vents on the roof
  box(ctx, x - 0.45, y - 0.12, 0.3, 0.24, 3, Z + H, '#dee2e6');
  box(ctx, x + 0.25, y - 0.12, 0.3, 0.24, 3, Z + H, '#dee2e6');
}

const CAR_SPRITES = ['car_a', 'car_b', 'car_c', 'car_d', 'van', 'bus'];

/**
 * A drawn car (or van) on the road: the front picture drives to the lower right, the back one to the upper left,
 * and from behind a little smoke puffs out of the exhaust pipe. Falls back to the code-drawn car.
 */
/** The shadow of a car: long along the road and right under the wheels (the wheels stand on its lower edge). */
function carShadow(ctx: Ctx, sx: number, sy: number, k: number): void {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(k, k);
  // the road runs along the x tiles: on screen that is 2 px right for 1 px down
  ctx.rotate(Math.atan2(16, 32));
  ctx.scale(1, 0.4);
  const gr = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
  gr.addColorStop(0, 'rgba(0,0,0,0.34)');
  gr.addColorStop(0.65, 'rgba(0,0,0,0.24)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCarArt(ctx: Ctx, c: { x: number; y: number; color: string; dir: number; variant: number; speed?: number; bus?: unknown }): void {
  const id = `prop_${CAR_SPRITES[c.variant % CAR_SPRITES.length]}_${c.dir > 0 ? 'front' : 'back'}`;
  const img = getImage(id);
  if (!img) {
    if (c.bus) drawBus(ctx, c.x, c.y, c.color, c.dir, (c.speed ?? 1) < 0.05);
    else drawCar(ctx, c.x, c.y, c.color, c.dir);
    return;
  }
  const [sx, sy] = P(c.x, c.y);
  // the shadow grows with the picture (it was made for a car 52 px high)
  carShadow(ctx, sx, sy, metaFor(id).h / 52);
  drawSprite(ctx, id, { x: c.x, y: c.y, sx, sy, s: 1 });
  if (c.dir > 0 || ENV.reduceMotion || !hasImage(id)) return;
  // the exhaust is at the lower right of the rear picture; the puffs rise and drift backwards, getting bigger and fainter
  const m = metaFor(id);
  const H = m.h;
  const W = (H * img.naturalWidth) / img.naturalHeight;
  const ex = sx - W * m.anchor[0] + W * 0.86;
  const ey = sy - H * m.anchor[1] + H * 0.9;
  const phase = c.x * 1.7;
  const z = H / 52;
  for (let i = 0; i < 4; i++) {
    // one puff takes 2.6 s to rise and fade
    const k = (((ENV.t / 2.6 + i / 4 + phase) % 1) + 1) % 1;
    circle(ctx, ex + k * 13 * z, ey - k * 12 * z, (1.6 + k * 4) * z, `rgba(240,240,240,${(0.85 * (1 - k)).toFixed(3)})`);
  }
}

/** A bus shelter: a green roof on four posts, glass at the back and the side, a bench and a poster of the stand. */
function busShelter(ctx: Ctx, c: SpriteCall): void {
  const { x, y, sx, sy } = c;
  const L = 1.7;
  const D = 0.5;
  const H = 40;
  const x0 = x - L / 2;
  const y0 = y - D / 2;
  shadow(ctx, sx + 8, sy + 3, 38, 0.16);
  // the glass wall at the back, with a poster
  faceY(ctx, x0, y0, H, () => {
    ctx.fillStyle = 'rgba(190,226,255,0.55)';
    ctx.fillRect(2, 5, L * 32 - 4, H - 7);
    ctx.strokeStyle = '#74c0fc';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(2, 5, L * 32 - 4, H - 7);
    ctx.fillStyle = '#fff3bf';
    ctx.fillRect(L * 32 - 40, 9, 32, 24);
    ctx.strokeStyle = '#fab005';
    ctx.strokeRect(L * 32 - 40, 9, 32, 24);
  });
  const [px, py] = P(x0 + L - 0.38, y0 + 0.02, H - 10);
  text(ctx, '🍋', px, py + 8, 13, '#000', 'center', 400);
  // the bench
  box(ctx, x0 + 0.16, y0 + 0.07, L - 0.5, 0.16, 3, 10, '#c58b4f');
  box(ctx, x0 + 0.2, y0 + 0.09, 0.05, 0.12, 10, 0, '#495057');
  box(ctx, x0 + L - 0.58, y0 + 0.09, 0.05, 0.12, 10, 0, '#495057');
  // the posts at the back, the glass at the side, the posts in front
  for (const [qx, qy] of [
    [x0, y0],
    [x0 + L - 0.05, y0],
  ])
    box(ctx, qx, qy, 0.05, 0.05, H, 0, '#495057');
  faceX(ctx, x0 + L, y0 + D, H, () => {
    ctx.fillStyle = 'rgba(190,226,255,0.5)';
    ctx.fillRect(2, 5, D * 32 - 4, H - 7);
    ctx.strokeStyle = '#74c0fc';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(2, 5, D * 32 - 4, H - 7);
  });
  for (const [qx, qy] of [
    [x0, y0 + D - 0.05],
    [x0 + L - 0.05, y0 + D - 0.05],
  ])
    box(ctx, qx, qy, 0.05, 0.05, H, 0, '#495057');
  // the roof, a little wider than the shelter
  box(ctx, x0 - 0.08, y0 - 0.1, L + 0.16, D + 0.2, 4, H, '#2b8a3e');
}

/** The bus stop sign: a blue disc with a bus on a pole. */
function busSign(ctx: Ctx, c: SpriteCall): void {
  const { sx, sy } = c;
  shadow(ctx, sx, sy, 6, 0.2);
  rrect(ctx, sx - 1.4, sy - 56, 2.8, 56, 1.4, '#868e96');
  circle(ctx, sx, sy - 62, 11, '#1971c2', '#ffffff', 2);
  rrect(ctx, sx - 7, sy - 67, 14, 9, 2.5, '#ffffff');
  rrect(ctx, sx - 5.5, sy - 65.5, 4.5, 3.5, 1, '#1971c2');
  rrect(ctx, sx + 1, sy - 65.5, 4.5, 3.5, 1, '#1971c2');
  circle(ctx, sx - 4, sy - 57.6, 1.4, '#ffffff');
  circle(ctx, sx + 4, sy - 57.6, 1.4, '#ffffff');
}

registerProcs({
  prop_bus_shelter: busShelter,
  prop_bus_sign: busSign,
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
