"""Cuts looping animations of single characters out of a video of a character sheet (one figure per grid cell).

Usage: python tools/make_loops.py <frames_dir> <out_assets_dir> <gif_dir> [cols=5] [rows=3] [step=2] [reverse=name,name]

For every cell: key out the magenta background (matte + crisp edge), find the best seamless loop (length and start
frame are searched per figure), keep every STEP-th frame, crop all frames to one box and write
  <name>_loop.png  (strip of frames), loops.json (geometry) and a transparent GIF per figure.
`h` in loops.json is the on-screen height (world px) of the figure: all humans share one scale (the player boy standing
is 43 px), the fox is drawn 10% bigger.
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from edgefix import crisp, matte  # noqa: E402

frames_dir, out_dir, gif_dir = sys.argv[1], sys.argv[2], sys.argv[3]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 5
rows = int(sys.argv[5]) if len(sys.argv) > 5 else 3
STEP = int(sys.argv[6]) if len(sys.argv) > 6 else 2
REVERSE = set((sys.argv[7] if len(sys.argv) > 7 else '').split(',')) - {''}
NAMES = [
    'char_player_boy_front', 'char_player_boy_serving', 'char_player_boy_juicing', 'char_player_boy_splashed', 'char_helper_boy_front',
    'char_player_girl_front', 'char_player_girl_serving', 'char_player_girl_juicing', 'char_player_girl_splashed', 'char_helper_girl_front',
    'char_helper_boy_serving', 'char_helper_girl_serving', 'char_fox_front', 'char_fox_back', 'char_fox_dizzy',
]
PAD = 4
BOY_H = 43.0  # world px: the player boy standing
os.makedirs(out_dir, exist_ok=True)
os.makedirs(gif_dir, exist_ok=True)

files = sorted(glob.glob(frames_dir + '/f_*.png'))
raw = [np.asarray(Image.open(f).convert('RGB')).astype(np.float64) for f in files]
T = len(raw)
H, W, _ = raw[0].shape
bg = np.median(np.concatenate([raw[0][:6].reshape(-1, 3), raw[0][-6:].reshape(-1, 3)]), axis=0)
m_bg = float(min(bg[0], bg[2]) - bg[1])
cw, ch = W / cols, H / rows


def key(img):
    m = np.minimum(img[..., 0], img[..., 2]) - img[..., 1]
    alpha = np.clip((m_bg * 0.8 - m) / (m_bg * 0.5), 0, 1)
    col, alpha = matte(img, bg, alpha, erode=2, grow=3)
    return np.dstack([col, crisp(np.clip((alpha - 0.08) / 0.92, 0, 1)) * 255])


figs = {}
for i, name in enumerate(NAMES):
    r, c = divmod(i, cols)
    x0, x1, y0, y1 = int(c * cw), int((c + 1) * cw), int(r * ch), int((r + 1) * ch)
    region = [key(raw[t][y0:y1, x0:x1]) for t in range(T)]
    # best seamless loop: frame t0 and t0+L look the same
    best = None
    for L in range(16, 49, 2):
        for t0 in range(0, T - L - 1, 2):
            a, b = region[t0][..., :3], region[t0 + L][..., :3]
            wa = np.maximum(region[t0][..., 3], region[t0 + L][..., 3]) / 255
            d = float((np.abs(a - b).mean(axis=2) * wa).sum() / max(wa.sum(), 1))
            score = d + 0.05 * abs(L - 24)  # a loop of about one second is preferred
            if best is None or score < best[0]:
                best = (score, L, t0, d)
    _, L, t0, d = best
    figs[name] = (region[t0:t0 + L:STEP], L, t0, d)
    print(f'{name:28s} loop {L:2d} frames from {t0:3d}  seam {d:.1f}')

# one scale for everybody, set by the standing player boy
boy_seq = figs['char_player_boy_front'][0]
al = np.max([f[..., 3] for f in boy_seq], axis=0) > 40
ys, _xs = np.where(al)
u = BOY_H / (ys.max() + 1 - ys.min())

manifest = {}
gifs = {}
for name, (seq, L, t0, d) in figs.items():
    if name in REVERSE:
        seq = seq[::-1]
    n = len(seq)
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
    Image.fromarray(strip, 'RGBA').quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(
        os.path.join(out_dir, f'{name}_loop.png'), optimize=True)
    figH = int(ys.max() + 1 - ys.min())
    manifest[name] = {
        'n': n, 'fw': int(fw), 'fh': int(fh), 'feetY': int(ys.max() + 1 - cy0), 'figH': figH,
        'cx': round(float(np.median(masses)), 1),
        'h': round(figH * u * (1.1 if 'fox' in name else 1.0), 1),
        'fps': round(24 / STEP, 1), 'reversed': name in REVERSE,
    }
    frames = []
    for k in range(n):
        im = Image.fromarray(strip[:, k * fw:(k + 1) * fw], 'RGBA')
        p = im.convert('RGB').quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        p.paste(255, mask=im.getchannel('A').point(lambda v: 255 if v < 110 else 0))
        frames.append(p)
    frames[0].save(os.path.join(gif_dir, f'{name}.gif'), save_all=True, append_images=frames[1:], duration=int(1000 / 24 * STEP), loop=0, transparency=255, disposal=2)
    gifs[name] = (strip, fw, fh, n)

with open(os.path.join(out_dir, 'loops.json'), 'w', encoding='utf-8') as fp:
    json.dump(manifest, fp, indent=1, sort_keys=True)
print('scale', round(u, 4), 'world px per video px; done', len(manifest))
