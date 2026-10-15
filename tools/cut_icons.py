"""Cuts a sheet of icons (flat magenta background) into square UI icons: assets/ui/ui_<name>.png, 128x128.

Usage: python tools/cut_icons.py <sheet.jpg> <name1,name2,...> [cols] [size]
The rows are found by themselves (bands of pixels that are not magenta), so a sheet with empty space works too;
each row is split into `cols` equal cells (default 5), or with `auto` at the empty gaps between the objects (for
figures that do not stand in equal cells, like raised arms). An icon is cropped to its pixels and centred with a
small margin; `size` is the side of the square picture (default 128). Run tools/to_webp.py afterwards.
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from edgefix import crisp, matte  # noqa: E402

SIZE = 128
MARGIN = 0.06

src, names = sys.argv[1], sys.argv[2].split(',')
AUTO = len(sys.argv) > 3 and sys.argv[3] == 'auto'
cols = 5 if AUTO or len(sys.argv) <= 3 else int(sys.argv[3])
# bigger pictures (a character shown large) can ask for more pixels than an icon
SIZE = int(sys.argv[4]) if len(sys.argv) > 4 else SIZE

im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
border = np.concatenate([im[:6].reshape(-1, 3), im[-6:].reshape(-1, 3), im[:, :6].reshape(-1, 3), im[:, -6:].reshape(-1, 3)])
bg = np.median(border, axis=0)
m = np.minimum(im[..., 0], im[..., 2]) - im[..., 1]
m_bg = float(np.minimum(bg[0], bg[2]) - bg[1])
lo, hi = m_bg * 0.30, m_bg * 0.80
alpha = np.clip((hi - m) / (hi - lo), 0, 1)
col, alpha = matte(im, bg, alpha)
alpha = crisp(alpha)
rgba = np.dstack([col, alpha * 255]).astype(np.uint8)

# rows of icons: bands where some pixels are not background
filled = (alpha > 0.5).mean(axis=1) > 0.004
bands, start = [], None
for y, on in enumerate(filled):
    if on and start is None:
        start = y
    if not on and start is not None:
        if y - start > 20:
            bands.append((start, y))
        start = None
if start is not None:
    bands.append((start, len(filled)))
print('rows', bands)

H, W = alpha.shape


def objects(y0, y1):
    """The column ranges of the objects of a row: runs of filled columns split at empty gaps."""
    used = (alpha[y0:y1] > 0.03).any(axis=0)
    out, s = [], None
    for x, on in enumerate(list(used) + [False]):
        if on and s is None:
            s = x
        if not on and s is not None:
            if x - s >= 12:
                out.append((s, x))
            s = None
    return out


if AUTO:
    cells = [(r, x0, x1) for r, (y0, y1) in enumerate(bands) for x0, x1 in objects(y0, y1)]
else:
    cells = [(r, c * W // cols, (c + 1) * W // cols) for r in range(len(bands)) for c in range(cols)]
assert len(cells) >= len(names), f'{len(cells)} cells for {len(names)} names'
os.makedirs('assets/ui', exist_ok=True)
for name, (r, x0, x1) in zip(names, cells):
    y0, y1 = bands[r]
    pad = 12
    y0, y1 = max(0, y0 - pad), min(H, y1 + pad)
    # a neighbour may reach into the cell: keep the widest run of filled columns (parts closer than GAP px, like a
    # lemon and its light bulb, count as one)
    GAP = 24
    used = (alpha[y0:y1, x0:x1] > 0.03).any(axis=0)
    runs, s, last = [], None, -GAP - 1
    for x, on in enumerate(used):
        if not on:
            continue
        if s is None or x - last > GAP:
            if s is not None:
                runs.append((s, last + 1))
            s = x
        last = x
    if s is not None:
        runs.append((s, last + 1))
    if len(runs) > 1 and not AUTO:
        a, b = max(runs, key=lambda r: r[1] - r[0])
        x0, x1 = x0 + a, x0 + b
    cell = Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA')
    box = cell.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if not box:
        print('empty cell', name)
        continue
    obj = cell.crop(box)
    inner = round(SIZE * (1 - 2 * MARGIN))
    k = inner / max(obj.size)
    obj = obj.resize((max(1, round(obj.size[0] * k)), max(1, round(obj.size[1] * k))), Image.LANCZOS)
    out = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(obj, ((SIZE - obj.size[0]) // 2, (SIZE - obj.size[1]) // 2), obj)
    out.save(f'assets/ui/ui_{name}.png', optimize=True)
    print('ok', name, obj.size)
