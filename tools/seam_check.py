"""Measures how visible the tile joints of a ground family are, the way the game draws them.

Usage: python tools/seam_check.py <tiles_dir> <family e.g. grass> [out.png]
It composes a 14x14 map of that family (hash-picked variants, like the game), then reports the mean luminance by
distance to the nearest tile edge, and writes a contrast-boosted picture.
"""
import glob
import sys

import numpy as np
from PIL import Image

tiles_dir, family = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else None
files = sorted(glob.glob(f'{tiles_dir}/tile_{family}_*.png')) or [f'{tiles_dir}/tile_{family}.png']
tiles = [Image.open(f).convert('RGBA') for f in files]
N = 14
W, H = 128, 64
canvas = Image.new('RGBA', (W * N, H * N), (255, 0, 255, 255))
owner = np.zeros((H * N, W * N, 2), dtype=np.int16)


def pick(x, y):
    h = ((x + 1) * 73856093) ^ ((y + 1) * 19349663)
    return tiles[((h & 0xFFFFFFFF) >> 8) % len(tiles)]


for y in range(N):
    for x in range(N):
        canvas.alpha_composite(pick(x, y), ((x - y) * 64 + W * N // 2 - 64, (x + y) * 32))
rgb = np.asarray(canvas.convert('RGB')).astype(float)
lum = rgb @ np.array([0.299, 0.587, 0.114])
# tile coordinates of every pixel: X = (x-y)*64 + c, Y = (x+y)*32  ->  x+y = Y/32, x-y = (X-c)/64
yy, xx = np.mgrid[0:H * N, 0:W * N]
c = W * N // 2
s = yy / 32.0
d = (xx - c) / 64.0
tx = (s + d) / 2
ty = (s - d) / 2
fu = tx - np.floor(tx)
fv = ty - np.floor(ty)
edge = np.minimum(np.minimum(fu, 1 - fu), np.minimum(fv, 1 - fv))  # 0 at a tile edge, 0.5 in the middle
valid = (tx > 3) & (tx < N - 3) & (ty > 3) & (ty < N - 3)
print('files', [f.split('/')[-1] for f in files])
for lo, hi in ((0, 0.02), (0.02, 0.05), (0.05, 0.1), (0.1, 0.2), (0.2, 0.3), (0.3, 0.5)):
    m = valid & (edge >= lo) & (edge < hi)
    print(f'distance to tile edge {lo:.2f}-{hi:.2f}: luminance {lum[m].mean():.2f}  (n={m.sum()})')
if out:
    # remove the slow variation, boost what is left
    k = lum - lum.mean()
    img = np.clip(128 + k * 6, 0, 255).astype(np.uint8)
    Image.fromarray(img).crop((W * N // 2 - 500, 200, W * N // 2 + 500, 200 + 560)).save(out)
