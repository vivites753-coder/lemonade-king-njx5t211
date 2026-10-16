// Asset manager. Every drawable has an ID (same IDs as LemonadeKing_ASSETS.md).
// If assets/<group>/<id>.png exists it is drawn; otherwise the procedural drawer registered for the ID is used.
// The renderer never needs to know which one it got.
import type { Ctx } from './iso';
import { SPRITE_META } from './spriteMeta';

export interface SpriteCall {
  /** Tile coordinates of the anchor. */
  x: number;
  y: number;
  /** Screen (world px) coordinates of the anchor. */
  sx: number;
  sy: number;
  /** Scale. */
  s: number;
  flip?: boolean;
  [k: string]: unknown;
}

export type ProcDraw = (ctx: Ctx, c: SpriteCall) => void;

export interface SpriteMeta {
  /** Display height in world px at scale 1. */
  h: number;
  /** Anchor as a fraction of the image: [0.5, 1] = bottom centre. */
  anchor: [number, number];
  /** Extra shift of the picture in world px (the layers of the stand all share one anchor; each sits at its own spot). */
  dx?: number;
  dy?: number;
  /** The shadow: its middle moved up (world px; for a square foot the middle is above the lowest point of the
   * picture) and its width as a share of the picture's width. */
  shadow?: { dy?: number; share?: number };
}

const PREFIX_DEFAULTS: [string, SpriteMeta][] = [
  ['char_', { h: 58, anchor: [0.5, 0.975] }],
  ['bld_', { h: 170, anchor: [0.5, 0.8] }],
  ['stand_', { h: 140, anchor: [0.5, 0.75] }],
  ['item_', { h: 22, anchor: [0.5, 0.9] }],
  ['prop_', { h: 70, anchor: [0.5, 0.9] }],
  ['tile_', { h: 32, anchor: [0.5, 0] }],
];

const procs = new Map<string, ProcDraw>();
const images = new Map<string, HTMLImageElement>();
let onLoadCb: ((id: string) => void) | null = null;
/** The descriptions of the animated pictures, made once (they are asked for every frame). */
const loopCache = new Map<string, LoopInfo>();
const walkCache = new Map<string, WalkInfo>();

export function metaFor(id: string): SpriteMeta {
  const own = SPRITE_META[id];
  if (own) return own;
  // a picture cut from a walking strip (the person with an umbrella): its size follows from the strip
  const w = walkManifest[id];
  if (w?.u) return { h: w.fh * w.u, anchor: [w.cx / w.fw, w.feetY / w.fh] };
  for (const [p, m] of PREFIX_DEFAULTS) if (id.startsWith(p)) return m;
  return { h: 64, anchor: [0.5, 0.9] };
}

export function registerProcs(map: Record<string, ProcDraw>): void {
  for (const [id, fn] of Object.entries(map)) procs.set(id, fn);
}

/** Geometry of a walking-loop strip (assets/chars/anim): frames side by side, all the same size. */
export interface WalkInfo {
  img: HTMLImageElement;
  n: number;
  fw: number;
  fh: number;
  /** Ground line inside a frame (px from the top). */
  feetY: number;
  /** Height of the figure itself (px). */
  figH: number;
  /** Horizontal anchor of the body (px from the left). */
  cx: number;
  /** World px per strip px at scale 1 (strips whose size is not taken from a still picture: people with umbrellas). */
  u?: number;
}

let walkManifest: Record<string, Omit<WalkInfo, 'img'>> = {};
const walkFiles = import.meta.glob('/assets/chars/anim/walk.json', { eager: true, import: 'default' }) as Record<string, Record<string, Omit<WalkInfo, 'img'>>>;
for (const m of Object.values(walkFiles)) walkManifest = m;

export interface LoopInfo extends WalkInfo {
  /** On-screen figure height in world px. */
  h: number;
  fps: number;
}

let loopManifest: Record<string, Omit<LoopInfo, 'img'>> = {};
const loopFiles = import.meta.glob('/assets/chars/anim/loops.json', { eager: true, import: 'default' }) as Record<string, Record<string, Omit<LoopInfo, 'img'>>>;
for (const m of Object.values(loopFiles)) loopManifest = m;

/** A looping animation of one pose (idle, serving, squeezing, walking in place ...), if its strip has loaded. */
export function getLoop(id: string): LoopInfo | undefined {
  const known = loopCache.get(id);
  if (known) return known;
  const g = loopManifest[id];
  const img = images.get(`${id}_loop`);
  if (!g || !img) return undefined;
  const info = { ...g, img };
  loopCache.set(id, info);
  return info;
}

/** The sprite id has a picture, a still one or an animation. */
export function hasArt(id: string): boolean {
  return images.has(id) || !!loopManifest[id];
}

/** The walking loop of a character sprite (e.g. char_kid_a_front), if its strip has loaded. */
export function getWalk(id: string): WalkInfo | undefined {
  const known = walkCache.get(id);
  if (known) return known;
  const g = walkManifest[id];
  const img = images.get(`${id}_walk`);
  if (!g || !img) return undefined;
  const info = { ...g, img };
  walkCache.set(id, info);
  return info;
}

export function hasImage(id: string): boolean {
  return images.has(id);
}

export function getImage(id: string): HTMLImageElement | undefined {
  return images.get(id);
}

/** Called when a picture finishes loading, with its id (so cached layers can be rebuilt). */
export function onAssetsChanged(cb: (id: string) => void): void {
  onLoadCb = cb;
}

/** Loads every picture found under /assets at build time (WebP, or PNG for one not converted yet; see
 * tools/to_webp.py). Missing files simply keep their procedural fallback. */
export function loadAssets(): void {
  const files = import.meta.glob('/assets/**/*.{png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
  for (const [path, url] of Object.entries(files)) {
    // the WebP wins when both are there
    if (path.endsWith('.png') && files[path.slice(0, -4) + '.webp']) continue;
    const id = path.split('/').pop()!.replace(/\.(png|webp)$/i, '');
    const img = new Image();
    img.onload = () => {
      images.set(id, img);
      onLoadCb?.(id);
    };
    img.src = url;
  }
}

/** Pictures that cast no shadow of their own here: ground tiles, people and cars (they draw theirs), things on a table or on water. */
const NO_SHADOW = /^(tile_|char_|item_|prop_(car|van)_|prop_(flowers|duck|boat|cloud))/;
/** [share of the picture width the shadow spans, darkness] for kinds of pictures. */
function shadowLook(id: string): [number, number] {
  if (id.startsWith('bld_')) return [0.4, 0.16];
  if (id.startsWith('prop_tree') || id === 'prop_palm') return [0.3, 0.22];
  if (id === 'stand_tent') return [0.44, 0.12];
  if (id.startsWith('stand_truck_') && !id.includes('bistro') && !id.includes('stool')) return [0.46, 0.2];
  if (id === 'stand_umbrella') return [0.38, 0.13];
  return [0.36, 0.2];
}

/**
 * A soft shadow on the ground under a picture. The light comes from the upper left, so the shadow sits a little to
 * the lower right of the foot point. Drawn in a pass before the objects themselves, so it never darkens anything.
 */
export function spriteShadow(ctx: Ctx, id: string, sx: number, sy: number, s = 1): void {
  const img = images.get(id);
  if (!img || NO_SHADOW.test(id)) return;
  const m = metaFor(id);
  const h = m.h * s;
  const w = (h * img.naturalWidth) / img.naturalHeight;
  const [look, alpha] = shadowLook(id);
  const share = m.shadow?.share ?? look;
  const rx = Math.max(7 * s, w * share);
  const ry = rx * 0.42;
  const cx = sx + (m.dx ?? 0) * s + rx * 0.22;
  const cy = sy + ((m.dy ?? 0) + (m.shadow?.dy ?? 0)) * s + ry * 0.18;
  ctx.fillStyle = `rgba(30,40,20,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawSprite(ctx: Ctx, id: string, call: SpriteCall): void {
  const img = images.get(id);
  if (img) {
    const m = metaFor(id);
    const h = m.h * call.s;
    const w = (h * img.naturalWidth) / img.naturalHeight;
    const sx = call.sx + (m.dx ?? 0);
    const sy = call.sy + (m.dy ?? 0);
    if (call.flip) {
      ctx.save();
      ctx.translate(sx, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -w * m.anchor[0], sy - h * m.anchor[1], w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, sx - w * m.anchor[0], sy - h * m.anchor[1], w, h);
    }
    return;
  }
  const fn = procs.get(id);
  if (fn) {
    fn(ctx, call);
    return;
  }
  // Unknown id: a visible placeholder helps during development.
  ctx.fillStyle = '#ff00ff';
  ctx.fillRect(call.sx - 6, call.sy - 12, 12, 12);
}

/** Picks a tile image variant (tile_grass_1 … tile_grass_4, or tile_grass), stable per tile. */
export function tileImage(base: string, x: number, y: number): HTMLImageElement | undefined {
  const variants: HTMLImageElement[] = [];
  for (let i = 1; i <= 4; i++) {
    const v = images.get(`${base}_${i}`);
    if (v) variants.push(v);
  }
  if (variants.length) {
    // a hash, not (x*a + y*b) % n: that would lay the variants in regular diagonal stripes
    const h = Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663);
    return variants[((h >>> 8) % variants.length + variants.length) % variants.length];
  }
  return images.get(base);
}
