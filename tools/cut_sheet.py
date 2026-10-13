"""Cuts a 5x5 sprite sheet on a flat magenta background into transparent PNGs.
Usage: python cut_sheet.py <sheet.jpg> <out_dir> <name1,name2,...> [cols] [rows] [--pairs]
With --pairs each cell is split at the gap between its two figures into char_<name>_front and char_<name>_back."""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from edgefix import bleed, crisp, matte  # noqa: E402

PAIRS = '--pairs' in sys.argv  # every cell holds two views of one character: left = front, right = back
sys.argv = [a for a in sys.argv if a != '--pairs']
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

col, alpha = matte(im, bg, alpha)
alpha = crisp(alpha)
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
    m_ = 3  # a thin guard only: some items (a lamp base) come very close to the cell edge
    cell[:m_, :, 3] = 0
    cell[-m_:, :, 3] = 0
    cell[:, :m_, 3] = 0
    cell[:, -m_:, 3] = 0
    cell = keep_big_parts(cell, 0.08)  # separate small bits (parts of neighbours) are dropped
    def save(img, fname):
        ys, xs = np.where(img[..., 3] > 12)
        if len(xs) == 0:
            print('EMPTY', fname)
            return
        bx0, bx1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, img.shape[1])
        by0, by1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, img.shape[0])
        Image.fromarray(img[by0:by1, bx0:bx1], 'RGBA').save(os.path.join(out, f'{fname}.png'))
        print(f'{fname:24s} {bx1 - bx0}x{by1 - by0}')

    if not PAIRS:
        save(cell, name)
        continue
    occ = (cell[..., 3] > 40).sum(axis=0)
    cols_on = np.where(occ > 0)[0]
    lo_, hi_ = cols_on.min(), cols_on.max()
    best, run_start = (0, (lo_ + hi_) // 2), None
    for x in range(lo_, hi_ + 1):
        if occ[x] == 0 and run_start is None:
            run_start = x
        if occ[x] > 0 and run_start is not None:
            if x - run_start > best[0]:
                best = (x - run_start, (run_start + x) // 2)
            run_start = None
    split = best[1]
    left, right = cell.copy(), cell.copy()
    left[:, split:, 3] = 0
    right[:, :split, 3] = 0
    save(left, f'char_{name}_front')
    save(right, f'char_{name}_back')
