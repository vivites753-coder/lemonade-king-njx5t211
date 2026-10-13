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
let onLoadCb: (() => void) | null = null;

export function metaFor(id: string): SpriteMeta {
  const own = SPRITE_META[id];
  if (own) return own;
  for (const [p, m] of PREFIX_DEFAULTS) if (id.startsWith(p)) return m;
  return { h: 64, anchor: [0.5, 0.9] };
}

export function registerProc(id: string, fn: ProcDraw): void {
  procs.set(id, fn);
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
}

let walkManifest: Record<string, Omit<WalkInfo, 'img'>> = {};
const walkFiles = import.meta.glob('/assets/chars/anim/walk.json', { eager: true, import: 'default' }) as Record<string, Record<string, Omit<WalkInfo, 'img'>>>;
for (const m of Object.values(walkFiles)) walkManifest = m;

/** The walking loop of a character sprite (e.g. char_kid_a_front), if its strip has loaded. */
export function getWalk(id: string): WalkInfo | undefined {
  const g = walkManifest[id];
  const img = images.get(`${id}_walk`);
  return g && img ? { ...g, img } : undefined;
}

export function hasImage(id: string): boolean {
  return images.has(id);
}

export function getImage(id: string): HTMLImageElement | undefined {
  return images.get(id);
}

/** Called when a PNG finishes loading (so cached layers can be rebuilt). */
export function onAssetsChanged(cb: () => void): void {
  onLoadCb = cb;
}

/** Loads every PNG found under /assets at build time. Missing files simply keep their procedural fallback. */
export function loadAssets(): void {
  const files = import.meta.glob('/assets/**/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
  for (const [path, url] of Object.entries(files)) {
    const id = path.split('/').pop()!.replace(/\.png$/i, '');
    const img = new Image();
    img.onload = () => {
      images.set(id, img);
      onLoadCb?.();
    };
    img.src = url;
  }
}

export function drawSprite(ctx: Ctx, id: string, call: SpriteCall): void {
  const img = images.get(id);
  if (img) {
    const m = metaFor(id);
    const h = m.h * call.s;
    const w = (h * img.naturalWidth) / img.naturalHeight;
    if (call.flip) {
      ctx.save();
      ctx.translate(call.sx, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -w * m.anchor[0], call.sy - h * m.anchor[1], w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, call.sx - w * m.anchor[0], call.sy - h * m.anchor[1], w, h);
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
