// Procedural people: chunky "chibi" characters built from rounded shapes.
import type { Look } from '../../sim/looks';
import { drawSprite, hasImage } from '../assets';
import { circle, ellipse, line, rrect, shade, shadow, type Ctx } from '../iso';

export type PersonKind = 'kid' | 'adult' | 'granny' | 'sport' | 'tourist' | 'player' | 'fox';

export interface PersonOpts {
  kind: PersonKind;
  look: Look;
  scale: number;
  moving: boolean;
  anim: number;
  /** Facing the camera (walking down the screen). */
  facingCam: boolean;
  /** Screen direction: +1 right, −1 left. */
  dirX: number;
  hasCup?: boolean;
  umbrella?: boolean;
  /** Player pose: arm forward with a cup. */
  serving?: boolean;
  /** Player squeezing lemons (juice splashes). */
  juicing?: boolean;
  bag?: boolean;
  dizzy?: boolean;
  t?: number;
  /** Apron / cap colour for the player and the helper. */
  apron?: string;
}

/**
 * Draws a character with its feet at (sx, sy). Uses char_<kind>_<variant>_<front|back> PNGs if present.
 * Returns the y of the top of the head (for emotes).
 */
export function drawCharacter(ctx: Ctx, id: string, x: number, y: number, sx: number, sy: number, o: PersonOpts): number {
  const bob = o.moving ? Math.abs(Math.sin(o.anim)) * 2.2 * o.scale : 0;
  if (hasImage(id)) {
    shadow(ctx, sx, sy, 10 * o.scale);
    drawSprite(ctx, id, { x, y, sx, sy: sy - bob, s: o.scale, flip: o.dirX < 0 });
    return sy - 58 * o.scale - bob;
  }
  return drawPerson(ctx, sx, sy, o);
}

export function drawPerson(ctx: Ctx, sx: number, sy: number, o: PersonOpts): number {
  const s = o.scale * 1.12;
  const kid = o.kind === 'kid';
  const L = o.look;
  const dir = o.dirX < 0 ? -1 : 1;
  const bob = o.moving ? Math.abs(Math.sin(o.anim)) * 2.2 * s : 0;
  const swing = o.moving ? Math.sin(o.anim) : 0;

  shadow(ctx, sx, sy, 10 * s);

  const legH = (kid ? 9 : 12) * s;
  const hipY = sy - legH - bob;
  const torsoH = (kid ? 13 : 17) * s;
  const torsoW = (kid ? 13 : 14) * s;
  const top = hipY - torsoH;

  // fox tail behind the body
  if (o.kind === 'fox') {
    ctx.save();
    ctx.translate(sx - dir * 7 * s, hipY - 4 * s);
    ctx.rotate(-dir * (0.6 + Math.sin((o.t ?? 0) * 6) * 0.15));
    ellipse(ctx, 0, -7 * s, 5 * s, 10 * s, '#f08c2e');
    ellipse(ctx, 0, -15 * s, 3.5 * s, 4 * s, '#fff');
    ctx.restore();
  }

  // legs
  const legW = 4.2 * s;
  for (const side of [-1, 1]) {
    const lift = Math.max(0, side * swing) * 2.6 * s;
    const lx = sx + side * 3.2 * s - legW / 2 + side * swing * 0.8 * s;
    rrect(ctx, lx, hipY - 1, legW, legH - lift + 1, 2 * s, L.pants);
    ellipse(ctx, lx + legW / 2 + dir * 0.8 * s, sy - lift - bob * 0.2, 3 * s, 1.8 * s, L.shoes);
  }

  // long hair / backpack behind the body
  const headR = (kid ? 8.2 : 7.2) * s;
  const hx = sx + (o.facingCam ? dir * 0.6 * s : 0);
  const hy = top - headR + 2 * s;
  if (L.longHair && o.facingCam && o.kind !== 'granny') rrect(ctx, hx - headR, hy - 2 * s, headR * 2, headR + 9 * s, 5 * s, L.hair);

  // skirt for grannies, body for everyone
  if (o.kind === 'granny') {
    ctx.beginPath();
    ctx.moveTo(sx - torsoW / 2 - 2 * s, hipY + 5 * s);
    ctx.lineTo(sx + torsoW / 2 + 2 * s, hipY + 5 * s);
    ctx.lineTo(sx + torsoW / 2, hipY - 4 * s);
    ctx.lineTo(sx - torsoW / 2, hipY - 4 * s);
    ctx.closePath();
    ctx.fillStyle = L.pants;
    ctx.fill();
  }
  const bodyColor = o.kind === 'fox' ? '#f08c2e' : L.shirt;
  rrect(ctx, sx - torsoW / 2, top, torsoW, torsoH + 1, 5 * s, bodyColor);
  if (o.kind === 'fox') ellipse(ctx, sx, top + torsoH * 0.55, torsoW * 0.28, torsoH * 0.32, '#fff3e6');

  // kid backpack
  if (kid && !o.facingCam) rrect(ctx, sx - torsoW / 2 + 1.5 * s, top + 2 * s, torsoW - 3 * s, torsoH - 2 * s, 4 * s, L.accent);
  if (kid && o.facingCam) {
    line(ctx, sx - 4 * s, top + 1, sx - 4 * s, top + torsoH * 0.8, L.accent, 1.6 * s);
    line(ctx, sx + 4 * s, top + 1, sx + 4 * s, top + torsoH * 0.8, L.accent, 1.6 * s);
  }
  // player apron
  if (o.kind === 'player' && o.facingCam) {
    rrect(ctx, sx - torsoW / 2 + 2.5 * s, top + 3.5 * s, torsoW - 5 * s, torsoH - 1 * s, 3 * s, o.apron ?? '#ffd43b');
    circle(ctx, sx, top + torsoH * 0.55, 2.2 * s, '#fab005');
  }
  // tourist camera
  if (o.kind === 'tourist' && o.facingCam) {
    rrect(ctx, sx - 3.5 * s, top + 4 * s, 7 * s, 5 * s, 1.5 * s, '#343a40');
    circle(ctx, sx, top + 6.5 * s, 1.6 * s, '#74c0fc');
  }

  // arms
  const armH = torsoH - 3 * s;
  const armColor = o.kind === 'fox' ? '#e8590c' : shade(L.shirt, 0.9);
  for (const side of [-1, 1]) {
    const ax = sx + side * (torsoW / 2 + 1.2 * s);
    const forward = o.serving && side === dir;
    const sw = o.moving ? -side * swing * 2.2 * s : 0;
    if (forward) {
      rrect(ctx, ax - 2 * s, top + 3 * s, 4 * s + dir * 6 * s, 4 * s, 2 * s, armColor);
      circle(ctx, ax + dir * 9 * s, top + 5 * s, 2.3 * s, o.kind === 'fox' ? '#f08c2e' : L.skin);
      drawCup(ctx, ax + dir * 10 * s, top + 2 * s, s);
    } else {
      rrect(ctx, ax - 1.8 * s, top + 2 * s + sw, 3.6 * s, armH, 2 * s, armColor);
      circle(ctx, ax, top + 2 * s + armH + sw, 2.2 * s, o.kind === 'fox' ? '#f08c2e' : L.skin);
    }
  }
  if (o.hasCup) drawCup(ctx, sx + dir * (torsoW / 2 + 2 * s), top + armH - 2 * s, s);
  if (o.kind === 'granny') line(ctx, sx + dir * (torsoW / 2 + 2.5 * s), top + armH, sx + dir * (torsoW / 2 + 4 * s), sy, '#8a5a35', 1.6 * s);
  if (o.bag) {
    circle(ctx, sx - dir * 9 * s, top + torsoH * 0.6, 5.5 * s, '#c9a227');
    line(ctx, sx - dir * 9 * s, top + torsoH * 0.6 - 5.5 * s, sx - dir * 7 * s, top + 3 * s, '#8a6d1a', 1.2 * s);
  }

  // head
  const skin = o.kind === 'fox' ? '#f08c2e' : L.skin;
  if (o.kind === 'fox') {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + side * 6 * s, hy - 4 * s);
      ctx.lineTo(hx + side * 3 * s, hy - 13 * s);
      ctx.lineTo(hx + side * 1 * s, hy - 5 * s);
      ctx.closePath();
      ctx.fillStyle = '#e8590c';
      ctx.fill();
    }
  }
  circle(ctx, hx, hy, headR, skin);
  if (o.kind !== 'fox') {
    if (o.facingCam) {
      ctx.beginPath();
      ctx.arc(hx, hy, headR + 0.6 * s, Math.PI * 1.02, Math.PI * 1.98);
      ctx.closePath();
      ctx.fillStyle = L.hair;
      ctx.fill();
      ellipse(ctx, hx - dir * headR * 0.55, hy - headR * 0.45, headR * 0.45, headR * 0.35, L.hair);
    } else {
      circle(ctx, hx, hy, headR + 0.5 * s, L.hair);
    }
  }
  if (o.kind === 'granny') circle(ctx, hx - dir * 2 * s, hy - headR - 1 * s, 3.6 * s, L.hair);
  if (o.kind === 'fox' && o.facingCam) ellipse(ctx, hx + dir * 2 * s, hy + 3 * s, 4 * s, 3 * s, '#fff3e6');

  if (o.facingCam) {
    const ex = dir * 1.2 * s;
    if (o.dizzy) {
      ctxText(ctx, '×', hx - 2.8 * s + ex, hy, 5 * s);
      ctxText(ctx, '×', hx + 2.8 * s + ex, hy, 5 * s);
    } else {
      circle(ctx, hx - 2.8 * s + ex, hy + 0.3 * s, 1.15 * s, '#2b2b2b');
      circle(ctx, hx + 2.8 * s + ex, hy + 0.3 * s, 1.15 * s, '#2b2b2b');
    }
    if (o.kind !== 'fox') {
      ellipse(ctx, hx - 4.4 * s + ex, hy + 2.6 * s, 1.6 * s, 1 * s, 'rgba(255,120,120,0.45)');
      ellipse(ctx, hx + 4.4 * s + ex, hy + 2.6 * s, 1.6 * s, 1 * s, 'rgba(255,120,120,0.45)');
    } else {
      circle(ctx, hx + dir * 3 * s, hy + 2.6 * s, 1.2 * s, '#212529');
    }
    ctx.beginPath();
    ctx.arc(hx + ex, hy + 2.6 * s, 1.9 * s, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = '#7a3b2e';
    ctx.lineWidth = 0.9 * s;
    ctx.stroke();
  }

  // headwear
  let headTop = hy - headR;
  if (o.kind === 'sport') {
    ctx.beginPath();
    ctx.arc(hx, hy, headR - 0.4 * s, Math.PI * 1.12, Math.PI * 1.88);
    ctx.strokeStyle = '#fa5252';
    ctx.lineWidth = 2.2 * s;
    ctx.stroke();
  }
  if (o.kind === 'tourist') {
    ellipse(ctx, hx, hy - headR + 3 * s, headR + 5 * s, 3 * s, '#e8c872');
    rrect(ctx, hx - headR + 1.5 * s, hy - headR - 4 * s, (headR - 1.5 * s) * 2, 7 * s, 3 * s, '#e8c872');
    rrect(ctx, hx - headR + 1.5 * s, hy - headR + 0.5 * s, (headR - 1.5 * s) * 2, 1.6 * s, 0, '#e8590c');
    headTop -= 4 * s;
  }
  if (o.kind === 'player') {
    ellipse(ctx, hx, hy - headR + 1 * s, headR + 1 * s, 3 * s, o.apron ?? '#ffd43b');
    ellipse(ctx, hx + dir * (headR - 1 * s), hy - headR + 3 * s, 5 * s, 2 * s, '#fab005');
  }

  // rain umbrella
  if (o.umbrella) {
    const ux = sx + dir * 5 * s;
    line(ctx, ux, top + 6 * s, ux, headTop - 10 * s, '#495057', 1.2 * s);
    ctx.beginPath();
    ctx.ellipse(ux, headTop - 10 * s, 15 * s, 8 * s, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = L.accent;
    ctx.fill();
    headTop -= 16 * s;
  }

  // juice splashes while making a pitcher
  if (o.juicing) {
    const t = o.t ?? 0;
    for (let i = 0; i < 6; i++) {
      const a = t * 7 + i * 1.7;
      const r = ((t * 30 + i * 9) % 18) * s;
      circle(ctx, sx + Math.cos(a) * r, top + 4 * s - Math.abs(Math.sin(a)) * r, 1.6 * s, i % 2 ? '#ffe066' : '#fff3bf');
    }
  }
  return headTop;
}

function ctxText(ctx: Ctx, s: string, x: number, y: number, size: number): void {
  ctx.font = `900 ${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2b2b2b';
  ctx.fillText(s, x, y);
}

export function drawCup(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x - 2.4 * s, y - 3 * s);
  ctx.lineTo(x + 2.4 * s, y - 3 * s);
  ctx.lineTo(x + 1.8 * s, y + 3.5 * s);
  ctx.lineTo(x - 1.8 * s, y + 3.5 * s);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#ced4da';
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ellipse(ctx, x, y - 2.6 * s, 2.3 * s, 0.9 * s, '#ffe066');
  line(ctx, x + 0.8 * s, y - 2.6 * s, x + 2.2 * s, y - 6.5 * s, '#ff6b6b', 0.9 * s);
}
