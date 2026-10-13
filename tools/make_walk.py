"""Cuts walking loops of the people out of a video made from the people sheet (3x4 cells, front + back figure per cell).

Usage: python tools/make_walk.py <frames_dir> <out_assets_dir> <gif_dir> [loop=26] [cols=3] [rows=4] [step=2]

For every figure:
  * the magenta background is keyed out (edges re-coloured from the solid pixels, no purple halo);
  * the best seamless start of a `loop`-frame cycle is found;
  * all frames get the same crop box (the feet line never jumps);
  * a horizontal strip char_<name>_<front|back>_walk.png is written, plus walk.json with its geometry;
  * a transparent GIF per figure and a preview GIF with everybody are written.
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from edgefix import bleed, crisp, matte  # noqa: E402

frames_dir, out_dir, gif_dir = sys.argv[1], sys.argv[2], sys.argv[3]
LOOP = int(sys.argv[4]) if len(sys.argv) > 4 else 26
cols = int(sys.argv[5]) if len(sys.argv) > 5 else 3
rows = int(sys.argv[6]) if len(sys.argv) > 6 else 4
STEP = int(sys.argv[7]) if len(sys.argv) > 7 else 2  # keep every STEP-th frame of the loop (24 fps -> 12 fps)
NAMES = ['kid_a', 'kid_b', 'kid_c', 'adult_a', 'adult_b', 'adult_c', 'granny_a', 'granny_b', 'sport_a', 'sport_b', 'tourist_a', 'tourist_b']
PAD = 5
os.makedirs(out_dir, exist_ok=True)
os.makedirs(gif_dir, exist_ok=True)

files = sorted(glob.glob(frames_dir + '/f_*.png'))
raw = [np.asarray(Image.open(f).convert('RGB')).astype(np.float64) for f in files]
T = len(raw)
H, W, _ = raw[0].shape
bg = np.median(np.concatenate([raw[0][:6].reshape(-1, 3), raw[0][-6:].reshape(-1, 3)]), axis=0)
m_bg = float(min(bg[0], bg[2]) - bg[1])


def box_blur(a, r):
    k = 2 * r + 1
    for _ in range(2):
        for axis in (0, 1):
            pad = np.pad(a, [(r, r) if i == axis else (0, 0) for i in range(a.ndim)], mode='edge')
            c = np.cumsum(pad, axis=axis, dtype=np.float64)
            c = np.concatenate([np.zeros_like(np.take(c, [0], axis=axis)), c], axis=axis)
            a = (np.take(c, range(k, c.shape[axis]), axis=axis) - np.take(c, range(0, c.shape[axis] - k), axis=axis)) / k
    return a


def key(img):
    """RGB (magenta background) -> RGBA float, edge colours replaced by neighbouring solid colours."""
    m = np.minimum(img[..., 0], img[..., 2]) - img[..., 1]
    alpha = np.clip((m_bg * 0.8 - m) / (m_bg * 0.5), 0, 1)
    col, alpha = matte(img, bg, alpha, erode=2, grow=3)
    alpha = crisp(alpha)
    return np.dstack([col, alpha * 255])


def cell_halves(r, c):
    """x ranges of the front and back figure inside a cell (split at the widest gap of the whole video)."""
    cw, ch = W / cols, H / rows
    x0, x1, y0, y1 = int(c * cw), int((c + 1) * cw), int(r * ch), int((r + 1) * ch)
    occ = np.zeros(x1 - x0, dtype=bool)
    for t in range(0, T, 3):
        sub = raw[t][y0:y1, x0:x1]
        mm = np.minimum(sub[..., 0], sub[..., 2]) - sub[..., 1]
        occ |= (mm < m_bg * 0.55).any(axis=0)
    xs = np.where(occ)[0]
    best, start = (0, (xs.min() + xs.max()) // 2), None
    for x in range(xs.min(), xs.max() + 1):
        if not occ[x] and start is None:
            start = x
        if occ[x] and start is not None:
            if x - start > best[0]:
                best = (x - start, (start + x) // 2)
            start = None
    s = best[1]
    return [(x0, x0 + s, y0, y1), (x0 + s, x1, y0, y1)]


manifest = {}
previews = {}
for i, name in enumerate(NAMES):
    r, c = divmod(i, cols)
    for side, (x0, x1, y0, y1) in zip(('front', 'back'), cell_halves(r, c)):
        sid = f'char_{name}_{side}'
        region = [key(raw[t][y0:y1, x0:x1]) for t in range(T)]
        # best seamless start: frame t and t+LOOP must look the same
        best = None
        for t0 in range(6, T - LOOP - 1):
            a, b = region[t0], region[t0 + LOOP]
            wa = np.maximum(a[..., 3], b[..., 3]) / 255
            d = float((np.abs(a[..., :3] - b[..., :3]).mean(axis=2) * wa).sum() / max(wa.sum(), 1) + 0.02 * np.abs(a[..., 3] - b[..., 3]).mean())
            if best is None or d < best[0]:
                best = (d, t0)
        t0 = best[1]
        seq = region[t0:t0 + LOOP:STEP]
        if side == 'back':
            # in the generated video the back views step in the opposite direction: reverse the loop
            seq = seq[::-1]
        n = len(seq)
        # one crop box for all frames
        al = np.max([f[..., 3] for f in seq], axis=0) > 40
        ys, xs = np.where(al)
        cx0, cx1 = max(xs.min() - PAD, 0), min(xs.max() + PAD + 1, seq[0].shape[1])
        cy0, cy1 = max(ys.min() - PAD, 0), min(ys.max() + PAD + 1, seq[0].shape[0])
        fw, fh = cx1 - cx0, cy1 - cy0
        strip = np.zeros((fh, fw * n, 4), dtype=np.uint8)
        masses = []
        for k, f in enumerate(seq):
            crop = f[cy0:cy1, cx0:cx1]
            strip[:, k * fw:(k + 1) * fw] = crop.clip(0, 255).astype(np.uint8)
            yy, xx = np.where(crop[..., 3] > 128)
            masses.append(xx.mean())
        # 256-colour PNG with transparency: about a third of the size, and the clay shading survives
        Image.fromarray(strip, 'RGBA').quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(os.path.join(out_dir, f'{sid}_walk.png'), optimize=True)
        manifest[sid] = {
            'n': n,
            'fw': int(fw),
            'fh': int(fh),
            'feetY': int(ys.max() + 1 - cy0),  # the ground line inside a frame
            'figH': int(ys.max() + 1 - ys.min()),  # height of the figure itself
            'cx': round(float(np.median(masses)), 1),
        }
        # GIF (transparent): palette with one transparent colour
        frames = []
        for k in range(n):
            im = Image.fromarray(strip[:, k * fw:(k + 1) * fw], 'RGBA')
            a = im.getchannel('A')
            p = im.convert('RGB').quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
            mask = a.point(lambda v: 255 if v < 110 else 0)
            p.paste(255, mask=mask)
            frames.append(p)
        frames[0].save(os.path.join(gif_dir, f'{sid}.gif'), save_all=True, append_images=frames[1:], duration=int(1000 / 24 * STEP), loop=0, transparency=255, disposal=2)
        previews[sid] = (strip, fw, fh, n)
        print(f'{sid:22s} start {t0:3d} seam {best[0]:.1f}  frame {fw}x{fh}  figure {manifest[sid]["figH"]}px')

with open(os.path.join(out_dir, 'walk.json'), 'w', encoding='utf-8') as fp:
    json.dump(manifest, fp, indent=1, sort_keys=True)

# one preview GIF with all figures on a light background
NN = next(iter(previews.values()))[3]
cell_w = max(v[1] for v in previews.values()) + 4
cell_h = max(v[2] for v in previews.values()) + 4
ids = [f'char_{n}_{s}' for n in NAMES for s in ('front', 'back')]
gcols = 6
grows = (len(ids) + gcols - 1) // gcols
bgc = (186, 220, 140)
out_frames = []
for k in range(NN):
    sheet = Image.new('RGB', (cell_w * gcols, cell_h * grows), bgc)
    for j, sid in enumerate(ids):
        strip, fw, fh, _n = previews[sid]
        im = Image.fromarray(strip[:, k * fw:(k + 1) * fw], 'RGBA')
        gx, gy = (j % gcols) * cell_w, (j // gcols) * cell_h
        sheet.paste(im, (gx + (cell_w - fw) // 2, gy + cell_h - fh - 2), im)
    out_frames.append(sheet.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE))
out_frames[0].save(os.path.join(gif_dir, 'walk_preview.gif'), save_all=True, append_images=out_frames[1:], duration=int(1000 / 24 * STEP), loop=0)
print('done', len(manifest), 'figures')
