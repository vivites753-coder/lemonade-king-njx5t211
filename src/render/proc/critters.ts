// Drawing of accident and lucky-find actors (see sim/critters.ts).
import type { Critter } from '../../sim/critters';
import { ENV } from '../env';
import { circle, ellipse, line, P, poly, rrect, shadow, text, type Ctx } from '../iso';
import { drawCharacter } from './people';

/** A pulsing ring that says "tap me" around lucky finds. */
function tapRing(ctx: Ctx, x: number, y: number, r: number): void {
  const k = ENV.reduceMotion ? 0.5 : (Math.sin(ENV.t * 6) + 1) / 2;
  ctx.beginPath();
  ctx.ellipse(x, y, r + k * 4, (r + k * 4) * 0.6, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(64,192,87,${0.5 + 0.4 * k})`;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function dog(ctx: Ctx, c: Critter, sx: number, sy: number): void {
  const step = c.moving ? Math.sin(c.anim) * 2.5 : 0;
  const col = c.color ?? '#a0522d';
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(c.dirX, 1);
  shadow(ctx, 0, 0, 12, 0.18);
  line(ctx, -6, -6, -7 + step, 0, col, 2.5);
  line(ctx, 6, -6, 7 - step, 0, col, 2.5);
  ellipse(ctx, 0, -9, 10, 5.5, col);
  circle(ctx, 9, -14, 5, col);
  ellipse(ctx, 13, -13, 3, 2, col);
  poly(ctx, [[7, -18], [9, -24], [11, -18]], col);
  circle(ctx, 10, -15, 1, '#212529');
  circle(ctx, 14, -13, 1.1, '#212529');
  line(ctx, -9, -11, -14, -16 - Math.abs(step), col, 2.5);
  ctx.restore();
}

function cat(ctx: Ctx, c: Critter, sx: number, sy: number): void {
  const step = c.moving ? Math.sin(c.anim * 0.6) * 1.8 : 0;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(c.dirX, 1);
  shadow(ctx, 0, 0, 10, 0.18);
  line(ctx, -5, -5, -5 + step, 0, '#e8590c', 2);
  line(ctx, 5, -5, 5 - step, 0, '#e8590c', 2);
  ellipse(ctx, 0, -8, 8.5, 4.5, '#ff922b');
  for (const dx of [-3, 1, 5]) line(ctx, dx, -11.5, dx - 1, -6, '#e8590c', 1.2);
  circle(ctx, 8, -13, 4.5, '#ff922b');
  poly(ctx, [[5, -16], [5.5, -21], [8, -17]], '#ff922b');
  poly(ctx, [[9, -17], [11.5, -21], [12, -16]], '#ff922b');
  circle(ctx, 7.5, -13.5, 0.9, '#212529');
  circle(ctx, 10.3, -13.5, 0.9, '#212529');
  ctx.beginPath();
  ctx.moveTo(-8, -9);
  ctx.quadraticCurveTo(-15, -12, -12, -20 + Math.sin(ENV.t * 3) * 2);
  ctx.strokeStyle = '#ff922b';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // a little collar with a tag: somebody misses this cat
  line(ctx, 5, -10, 10, -10, '#4dabf7', 1.5);
  circle(ctx, 7.5, -8.8, 1.2, '#ffd43b');
  ctx.restore();
}

function wallet(ctx: Ctx, sx: number, sy: number): void {
  shadow(ctx, sx, sy, 8, 0.15);
  rrect(ctx, sx - 7, sy - 8, 14, 9, 2, '#9c36b5', '#5f3dc4', 1);
  rrect(ctx, sx - 2, sy - 6, 9, 4, 1.5, '#cc5de8');
  circle(ctx, sx + 4, sy - 4, 1.1, '#ffd43b');
}

function coin(ctx: Ctx, sx: number, sy: number): void {
  const s = ENV.reduceMotion ? 1 : Math.abs(Math.cos(ENV.t * 3));
  ellipse(ctx, sx, sy - 6, 5 * Math.max(0.25, s), 5, '#fcc419', '#e0a800', 1);
  if (!ENV.reduceMotion && Math.sin(ENV.t * 4) > 0.6) text(ctx, '✦', sx + 6, sy - 12, 8, '#fff3bf');
}

function balloon(ctx: Ctx, c: Critter, sx: number, sy: number): void {
  const by = sy - c.z;
  ctx.beginPath();
  ctx.moveTo(sx, by + 10);
  ctx.quadraticCurveTo(sx + Math.sin(ENV.t * 2) * 4, by + 22, sx, by + 34);
  ctx.strokeStyle = 'rgba(73,80,87,0.7)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ellipse(ctx, sx, by, 8, 10, c.color ?? '#ff6b6b');
  ellipse(ctx, sx - 2.5, by - 3.5, 2, 3, 'rgba(255,255,255,0.5)');
  poly(ctx, [[sx - 2, by + 10], [sx + 2, by + 10], [sx, by + 7]], c.color ?? '#ff6b6b');
}

function ball(ctx: Ctx, c: Critter, sx: number, sy: number): void {
  shadow(ctx, sx, sy, 6, 0.15);
  const by = sy - c.z;
  circle(ctx, sx, by, 6, '#ffffff', '#343a40', 1);
  const a = c.t * 12;
  for (let i = 0; i < 3; i++) circle(ctx, sx + Math.cos(a + i * 2.1) * 3, by + Math.sin(a + i * 2.1) * 3, 1.6, '#343a40');
}

function splash(ctx: Ctx, c: Critter, sx: number, sy: number): void {
  const k = Math.min(1, c.t / c.life);
  const col = c.color ?? '#fcc419';
  ctx.globalAlpha = 1 - k;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 6 + k * 26;
    circle(ctx, sx + Math.cos(a) * r, sy - 16 - Math.sin(a) * r * 0.6 - k * 10 + k * k * 18, 3 - k * 1.5, col);
  }
  ellipse(ctx, sx, sy, 10 + k * 14, 4 + k * 5, col);
  ctx.globalAlpha = 1;
}

/** Draws one critter; returns the screen-space tap point (world px) for lucky finds. */
export function drawCritter(ctx: Ctx, c: Critter, t: number): { x: number; y: number } | null {
  const [sx, sy] = P(c.x, c.y);
  switch (c.kind) {
    case 'runner':
      drawCharacter(ctx, 'char_kid_a_front', c.x, c.y, sx, sy, {
        kind: 'kid',
        look: c.look!,
        scale: 0.74,
        moving: true,
        anim: c.anim,
        facingCam: true,
        dirX: c.dirX >= 0 ? 1 : -1,
        t,
      });
      if (c.phase === 1 && c.t % 1 < 0.6) text(ctx, '💫', sx, sy - 52, 14, '#000', 'center', 400);
      return null;
    case 'ball':
      ball(ctx, c, sx, sy);
      return null;
    case 'dog':
      dog(ctx, c, sx, sy);
      return null;
    case 'splash':
      splash(ctx, c, sx, sy);
      return null;
    case 'cat':
      tapRing(ctx, sx, sy - 8, 16);
      cat(ctx, c, sx, sy);
      return { x: sx, y: sy - 10 };
    case 'wallet':
      tapRing(ctx, sx, sy - 4, 12);
      wallet(ctx, sx, sy);
      return { x: sx, y: sy - 5 };
    case 'coin':
      tapRing(ctx, sx, sy - 4, 10);
      coin(ctx, sx, sy);
      return { x: sx, y: sy - 6 };
    case 'balloon':
      balloon(ctx, c, sx, sy);
      return { x: sx, y: sy - c.z };
  }
}
