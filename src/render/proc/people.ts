// Procedural people: chunky "chibi" characters built from rounded shapes.
import type { Look } from '../../sim/looks';
import type { LoopInfo } from '../assets';
import { drawSprite, getImage, getLoop, getWalk, hasArt, hasImage, metaFor } from '../assets';
import { ENV } from '../env';
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
const VARIANTS = ['a', 'b', 'c', 'd'];

/** Sprite id of a pedestrian. Types drawn with fewer variants than the look asks for reuse an existing one. */
export function pedSpriteId(type: string, variant: number, front: boolean): string {
  const side = front ? 'front' : 'back';
  for (let i = 0; i < VARIANTS.length; i++) {
    const id = `char_${type}_${VARIANTS[(variant + i) % VARIANTS.length]}_${side}`;
    if (hasImage(id)) return id;
  }
  return `char_${type}_${VARIANTS[variant % VARIANTS.length]}_${side}`;
}

/** Sprite id of a pedestrian holding an umbrella (drawn pictures), or undefined when there is none for this look. */
export function pedUmbrellaSpriteId(type: string, variant: number, front: boolean): string | undefined {
  return pedWithSpriteId('umb', type, variant, front);
}

/** Sprite id of a pedestrian walking away with a cup of lemonade in the hand, or undefined when there is none. */
export function pedCupSpriteId(type: string, variant: number, front: boolean): string | undefined {
  return pedWithSpriteId('cup', type, variant, front);
}

/** A pedestrian picture with something in the hands (`umb`, `cup`), when one is drawn for this look. */
function pedWithSpriteId(what: string, type: string, variant: number, front: boolean): string | undefined {
  const side = front ? 'front' : 'back';
  for (let i = 0; i < VARIANTS.length; i++) {
    const id = `char_${type}_${VARIANTS[(variant + i) % VARIANTS.length]}_${what}_${side}`;
    if (hasImage(id)) return id;
  }
  return undefined;
}

/**
 * The picture of someone standing at the stand. `base` is e.g. char_player_boy or char_helper_girl; the pose picture
 * (_juicing, _serving) is used when it exists. A missing serving picture falls back to the standing one and `cup` asks
 * the caller to draw the cup in the hand.
 */
export function standSpriteId(base: string, serving: boolean, juicing: boolean): { id: string; cup: boolean } {
  if (juicing && hasArt(`${base}_juicing`)) return { id: `${base}_juicing`, cup: false };
  if (serving && hasArt(`${base}_serving`)) return { id: `${base}_serving`, cup: false };
  return { id: `${base}_front`, cup: serving };
}

/** A seller or helper standing at the stand doing nothing. */
const IDLE_STAND = /^char_(player|helper)_(boy|girl)_front$/;

export function drawCharacter(ctx: Ctx, id: string, x: number, y: number, sx: number, sy: number, o: PersonOpts): number {
  // doing nothing: the sharp drawn picture that just breathes (the idle loop cut from a video is softer and wobbles)
  const still = IDLE_STAND.test(id) ? getImage(id) : undefined;
  // the still pictures look to the lower RIGHT, the loops cut from the video to the lower LEFT: keep the same direction
  if (still) return drawAnimated(ctx, id, still, sx, sy, { ...o, moving: false, dirX: -o.dirX });
  const loop = getLoop(id);
  if (loop) return drawLoop(ctx, id, loop, x, sx, sy, o);
  const img = getImage(id);
  if (img && id.startsWith('char_')) return drawAnimated(ctx, id, img, sx, sy, o);
  if (hasImage(id)) {
    const bob = o.moving ? Math.abs(Math.sin(o.anim)) * 2.2 * o.scale : 0;
    shadow(ctx, sx, sy, 10 * o.scale);
    drawSprite(ctx, id, { x, y, sx, sy: sy - bob, s: o.scale, flip: o.dirX < 0 });
    return sy - 58 * o.scale - bob;
  }
  return drawPerson(ctx, sx, sy, o);
}

/**
 * A character that is a looping animation (the player, the helpers, the fox). People at the stand loop all the time;
 * the fox only while it moves. Facing left is a mirror image.
 */
function drawLoop(ctx: Ctx, id: string, loop: LoopInfo, wx: number, sx: number, sy: number, o: PersonOpts): number {
  const dir = o.dirX < 0 ? -1 : 1;
  const fox = id.includes('_fox_');
  const playing = !ENV.reduceMotion && (!fox || o.moving || id.endsWith('_dizzy'));
  const t = (o.t ?? ENV.t) + wx * 0.37; // neighbours do not move in lockstep
  const frame = playing ? Math.floor(t * loop.fps) % loop.n : 0;
  const scale = (loop.h * o.scale) / loop.figH;
  shadow(ctx, sx, sy, 10 * o.scale, 0.2);
  ctx.save();
  ctx.translate(sx, sy);
  // the fox pictures look to the lower LEFT, the people to the lower RIGHT
  if (fox ? dir > 0 : dir < 0) ctx.scale(-1, 1);
  const dxp = -loop.cx * scale;
  const dyp = -loop.feetY * scale;
  ctx.drawImage(loop.img, frame * loop.fw, 0, loop.fw, loop.fh, dxp, dyp, loop.fw * scale, loop.fh * scale);
  ctx.restore();
  const top = sy - loop.h * o.scale;
  if (o.hasCup) drawCup(ctx, sx + dir * 9 * o.scale, sy - loop.h * o.scale * 0.45, o.scale);
  return top;
}

/** Share of the sprite height that belongs to the legs (the part that steps). Skirts and dresses step less. */
function legShare(id: string): number {
  if (/granny|adult_b|kid_b|tourist_b/.test(id)) return 0.2;
  if (/kid/.test(id)) return 0.27;
  return 0.31;
}

/**
 * A walking character made from ONE still picture:
 *  - the legs are cut into a left and a right half that lift and swing in turn (a real step, not just a hop);
 *  - the upper body bobs, squashes on every foot contact and stretches in the air;
 *  - the whole figure sways a little from side to side, and the shadow shrinks while the body is up;
 *  - standing still, the figure breathes.
 * The other two directions are mirror images. Cups and umbrellas are drawn on top.
 */
function drawAnimated(ctx: Ctx, id: string, img: HTMLImageElement, sx: number, sy: number, o: PersonOpts): number {
  const m = metaFor(id);
  const sc = o.scale;
  const H = m.h * sc;
  const W = (H * img.naturalWidth) / img.naturalHeight;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const ax = W * m.anchor[0];
  const ay = H * m.anchor[1];
  const dir = o.dirX < 0 ? -1 : 1;
  // The pictures face lower-RIGHT (front) and upper-LEFT (back: the same figure turned around).
  // So a back view is mirrored when walking to the right, a front view when walking to the left.
  const back = id.endsWith('_back');
  const mirror = back ? dir > 0 : dir < 0;
  const fwd = back ? -1 : 1; // "forward" in picture coordinates
  const motion = !ENV.reduceMotion;
  const walking = o.moving && motion;
  const s1 = walking ? Math.sin(o.anim) : 0;
  const k = Math.abs(s1); // 0 = foot on the ground, 1 = mid-step
  const bob = k * 1.5 * sc;
  const breath = !o.moving && motion ? Math.sin((o.t ?? ENV.t) * 2.4 + o.anim * 3.1) * 0.014 : 0;
  const sqY = walking ? 0.972 + 0.05 * k : 1 + breath;
  const sqX = walking ? 1.028 - 0.04 * k : 1 - breath * 0.6;

  // a real walking loop (drawn frames) beats the cut-and-hop trick below
  const loop = walking ? getWalk(id) : undefined;
  if (loop) {
    const frame = Math.floor((((o.anim / (Math.PI * 2)) % 1) + 1) % 1 * loop.n) % loop.n;
    const scale = loop.u ? loop.u * sc : (H * ((ih - 12) / ih)) / loop.figH; // same figure height as the still picture
    shadow(ctx, sx, sy, 10 * sc * 0.92, 0.2);
    ctx.save();
    ctx.translate(sx, sy);
    if (mirror) ctx.scale(-1, 1);
    ctx.drawImage(loop.img, frame * loop.fw, 0, loop.fw, loop.fh, -loop.cx * scale, -loop.feetY * scale, loop.fw * scale, loop.fh * scale);
    ctx.restore();
    const top = sy - loop.figH * scale;
    if (o.hasCup) drawCup(ctx, sx + dir * W * 0.3, sy - H * 0.42, sc);
    if (o.umbrella) return umbrella(ctx, sx + dir * 5 * sc, sy - H * 0.5, top, sc, o.look.accent);
    return top;
  }

  shadow(ctx, sx, sy, 10 * sc * (1 - 0.2 * k), 0.22 - 0.05 * k);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(s1 * 0.05);
  if (mirror) ctx.scale(-1, 1);

  const legF = legShare(id);
  const feetSrc = ih * m.anchor[1];
  const toDestY = (srcY: number) => (srcY / ih) * H - ay;
  if (walking) {
    // The cut sits below the hips, so the waistband and the hem never break. The whole figure hops a little,
    // the stepping leg lifts more and swings forward; legs only ever move UP, under the upper body, so no gap opens.
    const cutSrc = feetSrc - ih * legF * 0.72;
    const midSrc = iw * m.anchor[0];
    const lift = 2.2 * sc;
    const stride = 0.9 * sc;
    ctx.translate(0, -bob);
    for (const [x0, x1, ph] of [
      [0, midSrc, s1],
      [midSrc, iw, -s1],
    ] as const) {
      const up = Math.max(0, ph) * lift;
      const dx = Math.max(0, ph) * stride * fwd;
      ctx.drawImage(img, x0, cutSrc, x1 - x0, ih - cutSrc, (x0 / iw) * W - ax + dx, toDestY(cutSrc) - up, ((x1 - x0) / iw) * W, ((ih - cutSrc) / ih) * H);
    }
    // upper body over the legs (1 px of overlap), squashed and stretched around the cut line
    const overSrc = Math.min(ih - cutSrc, (1.2 / H) * ih);
    const hipY = toDestY(cutSrc);
    ctx.save();
    ctx.translate(0, hipY);
    ctx.scale(sqX, sqY);
    ctx.drawImage(img, 0, 0, iw, cutSrc + overSrc, -ax, -hipY + toDestY(0), W, ((cutSrc + overSrc) / ih) * H);
    ctx.restore();
  } else {
    ctx.scale(sqX, sqY);
    ctx.drawImage(img, -ax, -ay, W, H);
  }
  ctx.restore();

  const headTop = sy - ay * sqY - bob;
  if (o.bag) sack(ctx, sx + dir * W * 0.3, sy - H * 0.34 - bob, sc); // on the side of the tail
  if (o.hasCup) drawCup(ctx, sx + dir * W * 0.3, sy - H * 0.42 - bob, sc);
  if (o.umbrella) return umbrella(ctx, sx + dir * 5 * sc, sy - H * 0.5 - bob, headTop, sc, o.look.accent);
  return headTop;
}

/** The sack of stolen coins on the thief's back. */
function sack(ctx: Ctx, x: number, y: number, s: number): void {
  circle(ctx, x, y, 4.2 * s, '#c9a227', '#8a6d1a', 0.8);
  line(ctx, x, y - 4 * s, x + 1.5 * s, y - 7 * s, '#8a6d1a', 1.2 * s);
}

/** A rain umbrella held above the head; returns the new top. */
function umbrella(ctx: Ctx, ux: number, handY: number, headTop: number, s: number, color: string): number {
  line(ctx, ux, handY, ux, headTop - 10 * s, '#495057', 1.2 * s);
  ctx.beginPath();
  ctx.ellipse(ux, headTop - 10 * s, 15 * s, 8 * s, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  return headTop - 16 * s;
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
  if (o.umbrella) headTop = umbrella(ctx, sx + dir * 5 * s, top + 6 * s, headTop, s, L.accent);

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
