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
rgba = np.dstack([col, alpha * 255]).astype(np.uint8)

cw, ch = W / cols, H / rows
pad = 6
for i, name in enumerate(names):
    r, c = divmod(i, cols)
    x0, x1 = int(c * cw), int((c + 1) * cw)
    y0, y1 = int(r * ch), int((r + 1) * ch)
    cell = rgba[y0:y1, x0:x1]
    ys, xs = np.where(cell[..., 3] > 12)
    if len(xs) == 0:
        print('EMPTY', name)
        continue
    bx0, bx1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, cell.shape[1])
    by0, by1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, cell.shape[0])
    Image.fromarray(cell[by0:by1, bx0:bx1], 'RGBA').save(os.path.join(out, f'{name}.png'))
    print(f'{name:14s} {bx1 - bx0}x{by1 - by0}')
