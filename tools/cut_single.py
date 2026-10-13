"""Cuts ONE large object out of a flat-coloured background (white, light gray or magenta) into a transparent PNG.

Usage: python tools/cut_single.py <image> <out.png> [max_height=900] [keep_ratio=0.02]

The background colour is taken from the image border. Soft ground shadows that are only slightly darker than the
background are treated as background. Edge colours are replaced by the colour of the solid pixels next to them,
so no light or magenta halo is left.
"""
import sys

import os
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from edgefix import bleed, matte  # noqa: E402

src, out = sys.argv[1], sys.argv[2]
max_h = int(sys.argv[3]) if len(sys.argv) > 3 else 900
keep_ratio = float(sys.argv[4]) if len(sys.argv) > 4 else 0.02  # parts smaller than this share of the main one are dropped

im = np.asarray(Image.open(src).convert('RGB')).astype(np.float64)
H, W, _ = im.shape
border = np.concatenate([im[:10].reshape(-1, 3), im[-10:].reshape(-1, 3), im[:, :10].reshape(-1, 3), im[:, -10:].reshape(-1, 3)])
bg = np.median(border, axis=0)
print('background', bg)

def blur(a, r):
    k = 2 * r + 1
    for _ in range(3):
        for axis in (0, 1):
            pad = np.pad(a, [(r, r) if i == axis else (0, 0) for i in range(a.ndim)], mode='edge')
            c = np.cumsum(pad, axis=axis, dtype=np.float64)
            c = np.concatenate([np.zeros_like(np.take(c, [0], axis=axis)), c], axis=axis)
            a = (np.take(c, range(k, c.shape[axis]), axis=axis) - np.take(c, range(0, c.shape[axis] - k), axis=axis)) / k
    return a


d = np.abs(im - bg).max(axis=2)
lo, hi = 8.0, 28.0
alpha = np.clip((d - lo) / (hi - lo), 0, 1)
MAGENTA = bg[1] < 110 and bg[0] > 170 and bg[2] > 170
if MAGENTA:
    # magenta background: its shadows are darker magenta, so measure "how magenta" instead of the distance
    m = np.minimum(im[..., 0], im[..., 2]) - im[..., 1]
    m_bg = float(min(bg[0], bg[2]) - bg[1])
    alpha = np.clip((m_bg * 0.8 - m) / (m_bg * 0.5), 0, 1)
# A soft ground shadow is light and colourless. Only such pixels that connect to the image border are background:
# a light gray part INSIDE the object (a chimney cap, a highlight) is not reached and stays.
chroma = im.max(axis=2) - im.min(axis=2)
lightlow = (im.max(axis=2) > 205) & (chroma < 14) & (not MAGENTA)
f0 = 3
h0, w0 = (H + f0 - 1) // f0, (W + f0 - 1) // f0
pl = np.zeros((h0 * f0, w0 * f0), dtype=bool)
pl[:H, :W] = lightlow
coarse = pl.reshape(h0, f0, w0, f0).mean(axis=(1, 3)) > 0.6
seen = np.zeros_like(coarse)
queue = []
for y in range(h0):
    for x in (0, w0 - 1):
        if coarse[y, x]:
            queue.append((y, x))
            seen[y, x] = True
for x in range(w0):
    for y in (0, h0 - 1):
        if coarse[y, x] and not seen[y, x]:
            queue.append((y, x))
            seen[y, x] = True
while queue:
    y, x = queue.pop()
    for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
        if 0 <= yy < h0 and 0 <= xx < w0 and coarse[yy, xx] and not seen[yy, xx]:
            seen[yy, xx] = True
            queue.append((yy, xx))
outside = np.kron(seen, np.ones((f0, f0), dtype=bool))[:H, :W] & lightlow
outside = blur(outside.astype(np.float64)[..., None], 1)[..., 0]
alpha = alpha * (1 - np.clip(outside * 1.4, 0, 1))


# keep only the biggest connected part (drops specks); labelled on a coarse grid
f = 4
hh, ww = (H + f - 1) // f, (W + f - 1) // f
pad_a = np.zeros((hh * f, ww * f), dtype=bool)
pad_a[:H, :W] = alpha > 0.5
small = pad_a.reshape(hh, f, ww, f).any(axis=(1, 3))
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
                for dy in (-2, -1, 0, 1, 2):
                    for dx in (-2, -1, 0, 1, 2):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < hh and 0 <= xx < ww and small[yy, xx] and lab[yy, xx] == 0:
                            lab[yy, xx] = n
                            stack.append((yy, xx))
            sizes[n] = cnt
big = max(sizes.values())
keep = np.zeros(small.shape, dtype=bool)
for k, v in sizes.items():
    if v >= big * keep_ratio:
        keep |= lab == k
g = keep.copy()
for _ in range(3):
    p = np.pad(g, 1)
    g = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
alpha = alpha * np.kron(g, np.ones((f, f), dtype=bool))[:H, :W]

# remove the background tint from the edge pixels
col, alpha = matte(im, bg, alpha)
alpha = np.clip((alpha - 0.08) / 0.92, 0, 1)

rgba = np.dstack([col, alpha * 255]).clip(0, 255).astype(np.uint8)
ys, xs = np.where(alpha > 0.04)
pad = 10
box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad + 1, W), min(ys.max() + pad + 1, H))
res = Image.fromarray(rgba, 'RGBA').crop(box)
if res.height > max_h:
    res = res.resize((round(res.width * max_h / res.height), max_h), Image.LANCZOS)
res.save(out)
print('saved', out, res.size)
