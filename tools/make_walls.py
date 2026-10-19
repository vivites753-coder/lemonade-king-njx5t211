"""Installs a generated wall sheet of an indoor place (see docs/ART_PROMPTS.md, sheets 21-22).

Usage: python tools/make_walls.py <sheet.jpg> <place> [left_u0]
  e.g.  python tools/make_walls.py art/sheets/walls_station.jpg station
        python tools/make_walls.py art/sheets/walls_store.jpg store 224
With left_u0 the generator kept the grey frame of the template round the walls and changed the size of the canvas:
each wall is cut out of its grey frame and fills its strip, the left wall only the part from u = left_u0 to its back
corner (the short side wall of the store).
The sheet holds two flat wall strips on magenta: the top one is the LEFT wall (the entrance wall; its left end is
the front corner), the bottom one the RIGHT wall (its left end is the back corner). Each strip becomes
assets/bg/wall_<place>_left.png and _right.png, 1152x312 (3 px per world px of the 384x104 wall); magenta (the
doorways and windows) becomes transparent. The left wall is a little darker (it faces away from the light).
It prints the see-through openings in wall coordinates (u from 0 to 384 along the wall, v from -104 at the top to
0 at the floor): the doorways people walk through must match the place's doors in src/data/locations.ts.
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from edgefix import crisp, matte  # noqa: E402

W_OUT, H_OUT = 1152, 312
LEFT_SHADE = 0.94

src, place = sys.argv[1], sys.argv[2]
LEFT_U0 = float(sys.argv[3]) if len(sys.argv) > 3 else None
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W, _ = im.shape
border = np.concatenate([im[:4].reshape(-1, 3), im[-4:].reshape(-1, 3)])
bg = np.median(border, axis=0)
m = np.minimum(im[..., 0], im[..., 2]) - im[..., 1]
m_bg = float(np.minimum(bg[0], bg[2]) - bg[1])
lo, hi = m_bg * 0.30, m_bg * 0.80
alpha = np.clip((hi - m) / (hi - lo), 0, 1)
col, alpha = matte(im, bg, alpha)
alpha = crisp(alpha)

# the two strips: bands of rows with some wall in them (a row through big openings is still mostly wall at the edges)
rows = (alpha > 0.5).mean(axis=1) > 0.12
bands, s = [], None
for y, on in enumerate(rows):
    if on and s is None:
        s = y
    if not on and s is not None:
        bands.append([s, y])
        s = None
if s is not None:
    bands.append([s, H])
merged = []
for b in bands:
    if merged and b[0] - merged[-1][1] < 24:
        merged[-1][1] = b[1]
    else:
        merged.append(b)
strips = [b for b in merged if b[1] - b[0] > H * 0.2]
assert len(strips) == 2, f'expected 2 strips, found {merged}'
# the edge rows of a strip that are mostly see-through belong to the magenta around it (a thin line of sky would
# show along the floor otherwise)
full = (alpha > 0.5).mean(axis=1)
for b in strips:
    # (a wall that stands only along part of the strip, like the left wall of the store: compared with its own rows)
    ref = float(np.median(full[b[0]:b[1]]))
    while full[b[0]] < 0.6 * ref:
        b[0] += 1
    while full[b[1] - 1] < 0.6 * ref:
        b[1] -= 1
def longest_run(ok):
    """The longest run of True in a row of flags: (start, end)."""
    best, s = (0, 0), None
    for i, v in enumerate(list(ok) + [False]):
        if v and s is None:
            s = i
        if not v and s is not None:
            if i - s > best[1] - best[0]:
                best = (s, i)
            s = None
    return best


def fill_specks(img, max_px=300):
    """Closes small see-through specks inside the wall (a purple light bulb reads as magenta): they take the colour of
    the wall round them. Windows and doorways are far bigger."""
    arr = np.asarray(img).astype(np.float32).copy()
    h, w = arr.shape[:2]
    clear = arr[..., 3] < 128
    seen = np.zeros_like(clear)
    for y in range(h):
        for x in range(w):
            if not clear[y, x] or seen[y, x]:
                continue
            stack, blob, edge = [(y, x)], [], False
            seen[y, x] = True
            while stack:
                cy, cx = stack.pop()
                blob.append((cy, cx))
                if cy in (0, h - 1) or cx in (0, w - 1):
                    edge = True
                for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                    if 0 <= ny < h and 0 <= nx < w and clear[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            if edge or len(blob) > max_px:
                continue
            ys = [p[0] for p in blob]
            xs = [p[1] for p in blob]
            ring = arr[max(0, min(ys) - 3):max(ys) + 4, max(0, min(xs) - 3):max(xs) + 4].reshape(-1, 4)
            ring = ring[ring[:, 3] > 200]
            if not len(ring):
                continue
            colour = np.median(ring[:, :3], axis=0)
            for cy, cx in blob:
                arr[cy, cx, :3] = colour
                arr[cy, cx, 3] = 255
            # and its soft edge (half see-through) round it
            ey0, ey1, ex0, ex1 = max(0, min(ys) - 2), min(h, max(ys) + 3), max(0, min(xs) - 2), min(w, max(xs) + 3)
            box = arr[ey0:ey1, ex0:ex1]
            soft = (box[..., 3] > 0) & (box[..., 3] < 255)
            box[soft, :3] = colour
            box[soft, 3] = 255
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA')


def painted(y0, y1):
    """The painted wall of a strip, without the grey frame of the template round it and the see-through magenta
    (also its blend with the grey along the frame)."""
    part = im[y0:y1]
    mx, mn = part.max(axis=2), part.min(axis=2)
    grey = (mx - mn < 14) & (mx > 170) & (mx < 225)
    pinkish = (part[..., 0] - part[..., 1] > 25) & (part[..., 2] - part[..., 1] > 25)
    frame = grey | pinkish | (alpha[y0:y1] < 0.5)
    c0, c1 = longest_run(frame.mean(axis=0) < 0.6)
    r0, r1 = longest_run(frame[:, c0:c1].mean(axis=1) < 0.6)
    return y0 + r0, y0 + r1, c0, c1


os.makedirs('assets/bg', exist_ok=True)
for (y0, y1), side in zip(strips, ('left', 'right')):
    x0, x1 = 0, W
    if LEFT_U0 is not None:
        y0, y1, x0, x1 = painted(y0, y1)
    rgb = col[y0:y1, x0:x1] * (LEFT_SHADE if side == 'left' else 1.0)
    rgba = np.dstack([rgb, alpha[y0:y1, x0:x1] * 255]).clip(0, 255).astype(np.uint8)
    pic = Image.fromarray(rgba, 'RGBA')
    if LEFT_U0 is not None and side == 'left':
        out = Image.new('RGBA', (W_OUT, H_OUT), (0, 0, 0, 0))
        u0 = round(LEFT_U0 * 3)
        out.paste(pic.resize((W_OUT - u0, H_OUT), Image.LANCZOS), (u0, 0))
    else:
        out = pic.resize((W_OUT, H_OUT), Image.LANCZOS)
    out = fill_specks(out)
    out.save(f'assets/bg/wall_{place}_{side}.png', optimize=True)
    # the see-through openings, in wall coordinates
    a = np.asarray(out.getchannel('A')) < 128
    seen = np.zeros_like(a)
    found = []
    for y in range(0, H_OUT, 2):
        for x in range(0, W_OUT, 2):
            if a[y, x] and not seen[y, x]:
                stack = [(y, x)]
                seen[y, x] = True
                xs, ys = [x, x], [y, y]
                n = 0
                while stack:
                    cy, cx = stack.pop()
                    n += 1
                    xs[0], xs[1] = min(xs[0], cx), max(xs[1], cx)
                    ys[0], ys[1] = min(ys[0], cy), max(ys[1], cy)
                    for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                        if 0 <= ny < H_OUT and 0 <= nx < W_OUT and a[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            stack.append((ny, nx))
                if n > 400:
                    found.append((xs[0] / 3, xs[1] / 3, ys[0] / 3 - 104, ys[1] / 3 - 104))
    print(f'wall_{place}_{side}: y {y0}-{y1}, x {x0}-{x1} of the sheet, openings (u0, u1, v0, v1):')
    for o in sorted(found):
        print('   %.0f-%.0f  v %.0f..%.0f%s' % (o[0], o[1], o[2], o[3], '  (to the floor: a doorway)' if o[3] > -3 else ''))
