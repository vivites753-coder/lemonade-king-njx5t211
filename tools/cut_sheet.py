"""Cuts a 5x5 sprite sheet on a flat magenta background into transparent PNGs.
Usage: python cut_sheet.py <sheet.jpg> <out_dir> <name1,name2,...> [cols] [rows]"""
import os
import sys

import numpy as np
from PIL import Image

src, out, names = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 5
rows = int(sys.argv[5]) if len(sys.argv) > 5 else 5
os.makedirs(out, exist_ok=True)

im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W, _ = im.shape

# background colour = median of the border
border = np.concatenate([im[:6].reshape(-1, 3), im[-6:].reshape(-1, 3), im[:, :6].reshape(-1, 3), im[:, -6:].reshape(-1, 3)])
bg = np.median(border, axis=0)
print('background', bg)

# "magentaness": high for the background, low for everything else (incl. pink objects)
m = np.minimum(im[..., 0], im[..., 2]) - im[..., 1]
m_bg = float(np.minimum(bg[0], bg[2]) - bg[1])
lo, hi = m_bg * 0.30, m_bg * 0.80
alpha = np.clip((hi - m) / (hi - lo), 0, 1)

# remove the background's contribution from semi-transparent edge pixels
a3 = alpha[..., None]
safe = np.maximum(a3, 0.05)
col = np.where(a3 < 0.98, (im - (1 - a3) * bg) / safe, im)
col = np.clip(col, 0, 255)
# edge band: pixels close to the background. Remove the leftover magenta there (min(R,B) -> G).
trans = alpha < 0.98
band = trans.copy()
for _ in range(3):
    p = np.pad(band, 1)
    band = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
spill = np.maximum(np.minimum(col[..., 0], col[..., 2]) - col[..., 1], 0)
spill = np.where(band, spill, 0)[..., None]
col = col - spill * np.array([1, 0, 1], dtype=np.float32)
col = np.clip(col, 0, 255)


def blur(a, r):
    """Box blur (three passes ~ gaussian) on an HxWxC array."""
    k = 2 * r + 1
    for _ in range(3):
        for axis in (0, 1):
            pad = np.pad(a, [(r, r) if i == axis else (0, 0) for i in range(a.ndim)], mode='edge')
            c = np.cumsum(pad, axis=axis, dtype=np.float64)
            z = np.zeros_like(np.take(c, [0], axis=axis))
            c = np.concatenate([z, c], axis=axis)
            a = (np.take(c, range(k, c.shape[axis]), axis=axis) - np.take(c, range(0, c.shape[axis] - k), axis=axis)) / k
    return a


# Edge colours still carry a magenta tint (a purple outline on green trees). Replace the colour of every
# semi-transparent pixel with the average colour of the solid pixels around it, and thin the soft edge a little.
solid = (alpha > 0.96).astype(np.float64)
num = blur(col * solid[..., None], 3)
den = blur(solid[..., None], 3)
inner_col = np.where(den > 0.02, num / np.maximum(den, 1e-6), col)
edge = (alpha < 0.96)[..., None]
col = np.where(edge, inner_col, col)
alpha = np.clip((alpha - 0.2) / 0.8, 0, 1)
rgba = np.dstack([col, alpha * 255]).astype(np.uint8)


def keep_big_parts(cell, min_ratio=0.03, f=3):
    """Drops tiny stray specks (JPEG noise, bits of neighbours): keeps connected parts >= min_ratio of the largest one."""
    h, w = cell.shape[:2]
    hh, ww = (h + f - 1) // f, (w + f - 1) // f
    a = np.zeros((hh * f, ww * f), dtype=bool)
    a[:h, :w] = cell[..., 3] > 40
    small = a.reshape(hh, f, ww, f).any(axis=(1, 3))
    lab = np.zeros(small.shape, dtype=np.int32)
    sizes = {}
    n = 0
    for y0 in range(hh):
        for x0 in range(ww):
            if small[y0, x0] and lab[y0, x0] == 0:
                n += 1
                stack = [(y0, x0)]
                lab[y0, x0] = n
                cnt = 0
                while stack:
                    y, x = stack.pop()
                    cnt += 1
                    for dy in (-2, -1, 0, 1, 2):  # a 5x5 neighbourhood bridges thin gaps
                        for dx in (-2, -1, 0, 1, 2):
                            yy, xx = y + dy, x + dx
                            if 0 <= yy < hh and 0 <= xx < ww and small[yy, xx] and lab[yy, xx] == 0:
                                lab[yy, xx] = n
                                stack.append((yy, xx))
                sizes[n] = cnt
    if not sizes:
        return cell
    big = max(sizes.values())
    keep = np.zeros(small.shape, dtype=bool)
    for k, v in sizes.items():
        if v >= big * min_ratio:
            keep |= lab == k
    # grow the kept area a little so soft edges survive
    g = keep.copy()
    for _ in range(2):
        p = np.pad(g, 1)
        g = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    full = np.kron(g, np.ones((f, f), dtype=bool))[:h, :w]
    out = cell.copy()
    out[..., 3] = np.where(full, out[..., 3], 0)
    return out

cw, ch = W / cols, H / rows
pad = 6
for i, name in enumerate(names):
    r, c = divmod(i, cols)
    x0, x1 = int(c * cw), int((c + 1) * cw)
    y0, y1 = int(r * ch), int((r + 1) * ch)
    cell = rgba[y0:y1, x0:x1].copy()
    m_ = 12  # items never touch the cell edge: anything there belongs to a neighbour
    cell[:m_, :, 3] = 0
    cell[-m_:, :, 3] = 0
    cell[:, :m_, 3] = 0
    cell[:, -m_:, 3] = 0
    cell = keep_big_parts(cell)
    ys, xs = np.where(cell[..., 3] > 12)
    if len(xs) == 0:
        print('EMPTY', name)
        continue
    bx0, bx1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, cell.shape[1])
    by0, by1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, cell.shape[0])
    Image.fromarray(cell[by0:by1, bx0:bx1], 'RGBA').save(os.path.join(out, f'{name}.png'))
    print(f'{name:14s} {bx1 - bx0}x{by1 - by0}')
