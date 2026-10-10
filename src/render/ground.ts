// Ground tiles are static per location, so they are pre-rendered once into an offscreen canvas.
import { CONFIG } from '../core/config';
import type { LocationId } from '../core/types';
import { LOCATIONS } from '../data/locations';
import { tileImage } from './assets';
import { line, P, poly, text, tile, type Ctx } from './iso';

/** World-pixel rectangle covered by the ground canvas. */
export const GROUND_BOUNDS = { x: -394, y: -4, w: 788, h: 420 };
const EDGE = 18;

interface TileStyle {
  a: string;
  b: string;
  side: string;
  img: string;
}

const STYLES: Record<string, TileStyle> = {
  g: { a: '#9ad66f', b: '#91cf66', side: '#8a5d33', img: 'tile_grass' },
  p: { a: '#dfe2e6', b: '#d5d9dd', side: '#8f969c', img: 'tile_pavement' },
  r: { a: '#646a73', b: '#60666f', side: '#4b5057', img: 'tile_road' },
  R: { a: '#646a73', b: '#60666f', side: '#4b5057', img: 'tile_road_dash' },
  q: { a: '#ecd9ab', b: '#e6d2a2', side: '#a07a4a', img: 'tile_path' },
  t: { a: '#ebcfae', b: '#e5c8a6', side: '#a07a4a', img: 'tile_schoolyard' },
  s: { a: '#f6e3a8', b: '#f1dc9c', side: '#c9a85a', img: 'tile_sand' },
  e: { a: '#dcc68d', b: '#d6c086', side: '#b39550', img: 'tile_sand' },
  w: { a: '#56c1e6', b: '#4fb8de', side: '#2f8fb8', img: 'tile_water' },
  d: { a: '#c99a63', b: '#c1925b', side: '#8a5d33', img: 'tile_boardwalk' },
};

/** Cheap deterministic noise for tile details. */
function hash(x: number, y: number, k = 0): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function drawTile(ctx: Ctx, ch: string, x: number, y: number): void {
  const st = STYLES[ch] ?? STYLES.g;
  const img = tileImage(st.img, x, y);
  if (img) {
    const [px, py] = P(x, y);
    ctx.drawImage(img, px - 32, py, 64, (64 * img.naturalHeight) / img.naturalWidth);
    return;
  }
  tile(ctx, x, y, (x + y) % 2 ? st.a : st.b);
  const [cx, cy] = P(x + 0.5, y + 0.5);
  switch (ch) {
    case 'g':
      for (let i = 0; i < 3; i++) {
        const ox = (hash(x, y, i) - 0.5) * 36;
        const oy = (hash(y, x, i) - 0.5) * 16;
        line(ctx, cx + ox, cy + oy, cx + ox - 1.5, cy + oy - 4, '#78bf52', 1.2);
        line(ctx, cx + ox + 2, cy + oy, cx + ox + 3, cy + oy - 3.5, '#78bf52', 1.2);
      }
      if (hash(x, y, 9) > 0.8) {
        ctx.fillStyle = hash(x, y, 3) > 0.5 ? '#ffffff' : '#ffd43b';
        ctx.beginPath();
        ctx.arc(cx + (hash(x, y, 5) - 0.5) * 30, cy + (hash(x, y, 6) - 0.5) * 12, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'p':
    case 't':
      poly(ctx, [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], undefined, ch === 'p' ? '#c7ccd1' : '#d6b892', 1);
      break;
    case 'R': {
      const [a1, b1] = P(x + 0.2, y, 0);
      const [a2, b2] = P(x + 0.65, y, 0);
      line(ctx, a1, b1, a2, b2, '#f8f9fa', 2.5);
      break;
    }
    case 'q':
    case 's':
    case 'e':
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = ch === 'q' ? '#d4bd8a' : '#e3c97f';
        ctx.beginPath();
        ctx.arc(cx + (hash(x, y, i) - 0.5) * 34, cy + (hash(y, x, i + 4) - 0.5) * 14, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'w':
      line(ctx, cx - 10, cy - 2, cx + 2, cy - 2, 'rgba(255,255,255,0.35)', 1.5);
      line(ctx, cx - 2, cy + 4, cx + 9, cy + 4, 'rgba(255,255,255,0.25)', 1.5);
      break;
    case 'd':
      for (let k = 0; k <= 4; k++) {
        const [a1, b1] = P(x + k / 4, y);
        const [a2, b2] = P(x + k / 4, y + 1);
        line(ctx, a1, b1, a2, b2, '#a9783f', 1);
      }
      break;
  }
}

function decals(ctx: Ctx, loc: LocationId): void {
  if (loc === 'school') {
    // hopscotch
    const cells: [number, number, string][] = [
      [1.6, 6.15, '1'],
      [2.0, 6.15, '2'],
      [2.4, 6.15, '3'],
      [2.8, 6.15, '4'],
    ];
    for (const [x, y, n] of cells) {
      poly(ctx, [P(x, y), P(x + 0.38, y), P(x + 0.38, y + 0.6), P(x, y + 0.6)], undefined, '#ffffff', 1.6);
      const [cx, cy] = P(x + 0.19, y + 0.3);
      text(ctx, n, cx, cy, 8, '#ffffff');
    }
  }
  if (loc === 'yard') {
    // zebra crossing
    for (let i = 0; i < 4; i++) {
      const x = 9.05 + i * 0.22;
      poly(ctx, [P(x, 6.05), P(x + 0.12, 6.05), P(x + 0.12, 7.95), P(x, 7.95)], 'rgba(255,255,255,0.85)');
    }
  }
}

export function buildGround(loc: LocationId, scale = 2): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.ceil(GROUND_BOUNDS.w * scale);
  c.height = Math.ceil(GROUND_BOUNDS.h * scale);
  const ctx = c.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.translate(-GROUND_BOUNDS.x, -GROUND_BOUNDS.y);
  const map = LOCATIONS[loc].map;
  const N = CONFIG.MAP_SIZE;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) drawTile(ctx, map[y][x], x, y);
  decals(ctx, loc);
  // diorama sides
  for (let y = 0; y < N; y++) {
    const st = STYLES[map[y][N - 1]] ?? STYLES.g;
    poly(ctx, [P(N, y), P(N, y + 1), P(N, y + 1, -EDGE), P(N, y, -EDGE)], st.side);
    poly(ctx, [P(N, y), P(N, y + 1), P(N, y + 1, -4), P(N, y, -4)], 'rgba(255,255,255,0.12)');
  }
  for (let x = 0; x < N; x++) {
    const st = STYLES[map[N - 1][x]] ?? STYLES.g;
    poly(ctx, [P(x, N), P(x + 1, N), P(x + 1, N, -EDGE), P(x, N, -EDGE)], shadeSide(st.side));
  }
  return c;
}

function shadeSide(c: string): string {
  return c === '#8a5d33' ? '#9c6b3d' : c;
}

/** Water tiles of a location (for the animated shimmer). */
export function waterTiles(loc: LocationId): [number, number][] {
  const out: [number, number][] = [];
  const map = LOCATIONS[loc].map;
  for (let y = 0; y < map.length; y++) for (let x = 0; x < map[y].length; x++) if (map[y][x] === 'w') out.push([x, y]);
  return out;
}
