// The floor of the own store: its stains (spilt lemonade, muddy shoes, crumbs) and the cleaner with her mop.
import type { Cleaner } from '../../sim/game';
import type { Look } from '../../sim/looks';
import type { Stain } from '../../sim/state';
import { hasImage } from '../assets';
import { ENV } from '../env';
import { ellipse, line, P, poly, type Ctx } from '../iso';
import { drawCharacter, pedSpriteId } from './people';

/** How the cleaner looks when she is drawn from shapes (no picture): a blue overall and a white headscarf. */
const CLEANER_LOOK: Look = { skin: '#efc29e', hair: '#e0e0e0', shirt: '#4dabf7', pants: '#1c7ed6', shoes: '#495057', accent: '#ffffff', longHair: false, variant: 1 };

/** A stain lying flat on the floor at (sx, sy) (world px): a puddle of lemonade, muddy footprints, or crumbs. */
export function drawStain(ctx: Ctx, s: Stain, sx: number, sy: number): void {
  // every stain looks a little different: its place gives its size and turn
  const seed = Math.abs(Math.sin(s.x * 12.9898 + s.y * 78.233));
  const r = 11 + seed * 4;
  if (s.k === 0) {
    // spilt lemonade: a yellow puddle with a darker rim and a gleam (it shows on the wooden floor)
    ellipse(ctx, sx, sy, r * 1.2, r * 0.52, 'rgba(255,212,59,0.8)', 'rgba(201,140,0,0.75)', 1.4);
    ellipse(ctx, sx + r * 0.8, sy + r * 0.16, r * 0.45, r * 0.22, 'rgba(255,212,59,0.8)', 'rgba(201,140,0,0.6)', 1);
    ellipse(ctx, sx - r * 0.35, sy - r * 0.1, r * 0.4, r * 0.13, 'rgba(255,255,255,0.75)');
  } else if (s.k === 1) {
    // muddy shoes: a grey-brown smear and dark footprints
    ellipse(ctx, sx, sy, r * 1.2, r * 0.48, 'rgba(70,55,40,0.4)');
    for (let i = 0; i < 3; i++) ellipse(ctx, sx - r * 0.75 + i * r * 0.75, sy + (i % 2 ? -2.5 : 2.5), r * 0.28, r * 0.14, 'rgba(55,40,25,0.85)');
  } else {
    // crumbs and a paper wrapper
    ellipse(ctx, sx, sy, r * 1.1, r * 0.45, 'rgba(120,80,40,0.18)');
    for (let i = 0; i < 8; i++) {
      const a = i * 2.4 + seed * 6;
      ellipse(ctx, sx + Math.cos(a) * r * 0.85, sy + Math.sin(a) * r * 0.38, 2.2, 1.4, '#7a4a1e');
    }
    poly(
      ctx,
      [
        [sx - 7, sy - 1],
        [sx + 2, sy - 5],
        [sx + 8, sy],
        [sx - 1, sy + 4],
      ],
      '#ffffff',
      'rgba(0,0,0,0.35)',
      1,
    );
    line(ctx, sx - 3, sy, sx + 4, sy - 2, '#ff6b6b', 1.2);
  }
}

/** The bundle of a mop lying on the floor at (x, y). */
function mopHead(ctx: Ctx, x: number, y: number): void {
  ellipse(ctx, x, y, 9, 3.6, '#e9ecef', 'rgba(0,0,0,0.25)', 1);
  for (let i = -3; i <= 3; i++) line(ctx, x + i * 2.2, y - 1, x + i * 2.7, y + 2.6, '#ced4da', 1.2);
}

/** Her bucket stands by the counter, where she waits when the floor is clean. */
export function drawBucket(ctx: Ctx, x: number, y: number): void {
  const [sx, sy] = P(x, y);
  ellipse(ctx, sx, sy, 8, 3.5, 'rgba(0,0,0,0.18)');
  poly(
    ctx,
    [
      [sx - 7, sy - 13],
      [sx + 7, sy - 13],
      [sx + 5.5, sy],
      [sx - 5.5, sy],
    ],
    '#339af0',
    '#1864ab',
    1,
  );
  ellipse(ctx, sx, sy - 13, 7, 2.6, '#a5d8ff', '#1864ab', 1);
  ctx.beginPath();
  ctx.ellipse(sx, sy - 14, 6, 6, 0, Math.PI, 0);
  ctx.strokeStyle = '#495057';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/**
 * The cleaner (her own picture char_cleaner_front/back when there is one, else a granny in the shop's colours) with
 * her mop: held beside her while she walks or waits, wiping the stain while she mops it. Returns the top of her head.
 */
export function drawCleaner(ctx: Ctx, c: Cleaner, t: number): number {
  const [sx, sy] = P(c.x, c.y);
  const own = `char_cleaner_${c.front ? 'front' : 'back'}`;
  const id = hasImage(own) ? own : pedSpriteId('granny', 1, c.front);
  const dir = c.dirX < 0 ? -1 : 1;
  const mopping = !c.moving && !!c.to;
  const top = drawCharacter(ctx, id, c.x, c.y, sx, sy, {
    kind: 'granny',
    look: CLEANER_LOOK,
    scale: 0.95,
    moving: c.moving,
    anim: c.anim,
    facingCam: c.front,
    dirX: dir,
    apron: '#4dabf7',
  });
  if (mopping && c.to) {
    // the mop goes to and fro over the stain
    const [hx, hy] = P(c.to.x, c.to.y);
    const wig = ENV.reduceMotion ? 0 : Math.sin(t * 11) * 4;
    line(ctx, sx + dir * 5, sy - 30, hx + wig, hy - 2, '#8d6e63', 2.4);
    mopHead(ctx, hx + wig, hy);
  } else {
    const bx = sx + dir * 11;
    line(ctx, bx - dir, sy - 44, bx + dir * 3, sy - 3, '#8d6e63', 2.4);
    mopHead(ctx, bx + dir * 3, sy - 1);
  }
  return top;
}
