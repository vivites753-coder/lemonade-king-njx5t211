// Drawing of accident and lucky-find actors (see sim/critters.ts).
import type { Critter } from '../../sim/critters';
import { getImage } from '../assets';
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

/** A picture standing at a point (world px): `h` or `w` is its size, `ay` the share of its height that is above the point. */
function pic(ctx: Ctx, id: string, x: number, y: number, size: { h?: number; w?: number }, o: { flip?: boolean; ay?: number; rot?: number } = {}): boolean {
  const img = getImage(id);
  if (!img) return false;
  const h = size.h ?? ((size.w ?? 20) * img.naturalHeight) / img.naturalWidth;
  const w = (h * img.naturalWidth) / img.naturalHeight;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  if (o.flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h * (o.ay ?? 0.92), w, h);
  ctx.restore();
  return true;
}

/** The three stray dogs of the game (see Critters.dogs) and their pictures. */
const DOG_ART: Record<string, string> = { '#a0522d': 'char_dog_brown', '#e9c46a': 'char_dog_sand', '#495057': 'char_dog_gray' };
/** The colours of the balloons and their pictures. */
const BALLOON_ART: Record<string, string> = { '#ff6b6b': 'item_balloon_red', '#4dabf7': 'item_balloon_blue', '#da77f2': 'item_balloon_purple', '#69db7c': 'item_balloon_green' };

function dog(ctx: Ctx, c: Critter, sx: number, sy: number): void {
  const art = DOG_ART[c.color ?? '#a0522d'] ?? 'char_dog_brown';
  if (getImage(art)) {
    shadow(ctx, sx, sy, 12, 0.18);
    const hop = c.moving ? Math.abs(Math.sin(c.anim * 1.5)) * 2.5 : 0;
    pic(ctx, art, sx, sy - hop, { w: 31 }, { flip: c.dirX < 0, ay: 0.9 });
    return;
  }
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
  if (getImage('char_cat_walk')) {
    shadow(ctx, sx, sy, 10, 0.18);
    const hop = c.moving ? Math.abs(Math.sin(c.anim * 0.9)) * 1.5 : 0;
    pic(ctx, c.moving ? 'char_cat_walk' : 'char_cat_sit', sx, sy - hop, { h: 31 }, { flip: c.dirX < 0, ay: 0.92 });
    return;
  }
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
  if (pic(ctx, 'item_wallet', sx, sy + 1, { w: 22 }, { ay: 0.85 })) return;
  rrect(ctx, sx - 7, sy - 8, 14, 9, 2, '#9c36b5', '#5f3dc4', 1);
  rrect(ctx, sx - 2, sy - 6, 9, 4, 1.5, '#cc5de8');
  circle(ctx, sx + 4, sy - 4, 1.1, '#ffd43b');
}

function coin(ctx: Ctx, sx: number, sy: number): void {
  if (getImage('item_coin_ground')) {
    // it lies on the ground and breathes a little; a sparkle runs over it
    const k = ENV.reduceMotion ? 1 : 1 + Math.sin(ENV.t * 4) * 0.05;
    pic(ctx, 'item_coin_ground', sx, sy, { w: 18 * k }, { ay: 0.7 });
    if (!ENV.reduceMotion && Math.sin(ENV.t * 4) > 0.6) text(ctx, '✦', sx + 6, sy - 9, 8, '#fff3bf');
    return;
  }
  const s = ENV.reduceMotion ? 1 : Math.abs(Math.cos(ENV.t * 3));
  ellipse(ctx, sx, sy - 6, 5 * Math.max(0.25, s), 5, '#fcc419', '#e0a800', 1);
  if (!ENV.reduceMotion && Math.sin(ENV.t * 4) > 0.6) text(ctx, '✦', sx + 6, sy - 12, 8, '#fff3bf');
}

function balloon(ctx: Ctx, c: Critter, sx: number, sy: number): void {
  const by = sy - c.z;
  // the picture has its string; the body hangs around the tap point
  if (pic(ctx, BALLOON_ART[c.color ?? '#ff6b6b'] ?? 'item_balloon_red', sx + (ENV.reduceMotion ? 0 : Math.sin(ENV.t * 2) * 2), by + 32, { h: 48 }, { ay: 1 })) return;
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
  if (pic(ctx, 'item_ball', sx, by + 7, { w: 15 }, { ay: 0.5, rot: c.t * 9 })) return;
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
