// Isometric 2:1 projection and small drawing primitives. World units: tiles (x, y) and pixels for height (z).
export const HW = 32; // half tile width
export const HH = 16; // half tile height

export type Ctx = CanvasRenderingContext2D;
export type Pt = [number, number];

export function P(x: number, y: number, z = 0): Pt {
  return [(x - y) * HW, (x + y) * HH - z];
}

const shadeCache = new Map<string, string>();

/** Multiply a #rrggbb colour's brightness. */
export function shade(hex: string, f: number): string {
  const key = hex + f;
  const c = shadeCache.get(key);
  if (c) return c;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h, 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  const out = `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
  shadeCache.set(key, out);
  return out;
}

export function poly(ctx: Ctx, pts: Pt[], fill?: string, stroke?: string, lw = 1): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export interface BoxColors {
  top?: string;
  left?: string;
  right?: string;
  stroke?: string;
}

/** A box standing on the ground: footprint (x, y, w, d) in tiles, height h and base z0 in px. */
export function box(ctx: Ctx, x: number, y: number, w: number, d: number, h: number, z0: number, color: string, c: BoxColors = {}): void {
  const zt = z0 + h;
  poly(ctx, [P(x, y + d, z0), P(x + w, y + d, z0), P(x + w, y + d, zt), P(x, y + d, zt)], c.left ?? shade(color, 0.86), c.stroke, 1);
  poly(ctx, [P(x + w, y + d, z0), P(x + w, y, z0), P(x + w, y, zt), P(x + w, y + d, zt)], c.right ?? shade(color, 0.7), c.stroke, 1);
  poly(ctx, [P(x, y, zt), P(x + w, y, zt), P(x + w, y + d, zt), P(x, y + d, zt)], c.top ?? shade(color, 1.08), c.stroke, 1);
}

export function tile(ctx: Ctx, x: number, y: number, fill: string, z = 0, w = 1, d = 1): void {
  poly(ctx, [P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)], fill);
}

export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, fill?: string, stroke?: string, lw = 1): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function circle(ctx: Ctx, cx: number, cy: number, r: number, fill?: string, stroke?: string, lw = 1): void {
  ellipse(ctx, cx, cy, r, r, fill, stroke, lw);
}

export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string, lw = 1): void {
  const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, lw = 1): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

export function shadow(ctx: Ctx, sx: number, sy: number, rx: number, alpha = 0.22): void {
  ellipse(ctx, sx, sy, rx, rx * 0.45, `rgba(0,0,0,${alpha})`);
}

/**
 * Draw on a vertical plane facing +y (the lower-left face of a box). Local u = px along +x tiles
 * (32 px = 1 tile), local v = screen down. Origin is P(x, y, z).
 */
export function faceY(ctx: Ctx, x: number, y: number, z: number, draw: () => void): void {
  const [ox, oy] = P(x, y, z);
  ctx.save();
  ctx.transform(1, 0.5, 0, 1, ox, oy);
  draw();
  ctx.restore();
}

/** Draw on a vertical plane facing +x (the lower-right face). Local u goes towards −y. */
export function faceX(ctx: Ctx, x: number, y: number, z: number, draw: () => void): void {
  const [ox, oy] = P(x, y, z);
  ctx.save();
  ctx.transform(1, -0.5, 0, 1, ox, oy);
  draw();
  ctx.restore();
}

/** Circle lying on the ground, radius in tiles. */
export function groundCircle(ctx: Ctx, cx: number, cy: number, r: number): void {
  const [sx, sy] = P(cx, cy);
  ctx.beginPath();
  ctx.ellipse(sx, sy, r * HW * Math.SQRT2, r * HH * Math.SQRT2, 0, 0, Math.PI * 2);
}

export function text(ctx: Ctx, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'center', weight = 800, stroke?: string): void {
  ctx.font = `${weight} ${size}px "Nunito", "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size / 4);
    ctx.strokeStyle = stroke;
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

/** Emoji drawn with a system emoji font. */
export function emoji(ctx: Ctx, s: string, x: number, y: number, size: number): void {
  ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(s, x, y);
}
