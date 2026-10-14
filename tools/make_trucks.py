"""Installs the food truck pictures (assets/stand/stand_truck_<skin>.png, stand_truck_bistro/stool_*.png) and finds the
open serving window and the sign board of every truck, so the game can show the sellers inside the window and write
the text on the sign.

Usage: python tools/make_trucks.py <dir with the cut pictures: lemon.cut.png mint.cut.png ... bistro.cut.png stool_a.cut.png stool_b.cut.png>
Writes assets/stand/truck.json: for every skin the window polygon and the sign quad as fractions of the picture.
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw

src = sys.argv[1]
SKINS = ['lemon', 'mint', 'berry', 'sky', 'retro']
H = 280  # height of the installed truck picture
out = {}
dbg = []


def luma(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def biggest(mask):
    n, lab, st, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    if n < 2:
        return None
    i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    return lab == i


def quad(mask, eps):
    cnts, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    c = max(cnts, key=cv2.contourArea)
    hull = cv2.convexHull(c)
    ap = cv2.approxPolyDP(hull, eps * cv2.arcLength(hull, True), True)
    return [(int(p[0][0]), int(p[0][1])) for p in ap]


for skin in SKINS:
    im = Image.open(os.path.join(src, f'{skin}.cut.png')).convert('RGBA')
    a = np.asarray(im).astype(float)
    Wd, Ht = im.size
    solid = a[..., 3] > 200
    L = luma(a)
    yy, xx = np.mgrid[0:Ht, 0:Wd]
    # the sign board: a dark face on the roof (top third)
    board = solid & (L < 95) & (yy < Ht * 0.34)
    bm = biggest(board)
    bq = quad(bm, 0.04)
    # the open window: dark pixels in the left half, below the roof
    win = solid & (L < 70) & (yy > Ht * 0.34) & (yy < Ht * 0.8) & (xx < Wd * 0.62)
    wm = biggest(cv2.morphologyEx(win.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)))
    wq = quad(wm, 0.03)
    out[skin] = {
        'window': [[round(x / Wd, 4), round(y / Ht, 4)] for x, y in wq],
        'sign': [[round(x / Wd, 4), round(y / Ht, 4)] for x, y in bq],
        'aspect': round(Wd / Ht, 4),
    }
    k = H / Ht
    small = im.resize((round(Wd * k), H), Image.LANCZOS)
    small.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(f'assets/stand/stand_truck_{skin}.png', optimize=True)
    dbg.append((skin, im))
    print(skin, 'window', len(wq), 'pts', 'sign', len(bq), 'pts', im.size)

def order(points):
    """Corners in a fixed order: top-left, top-right, bottom-right, bottom-left."""
    cx = sum(p[0] for p in points) / len(points)
    cy = sum(p[1] for p in points) / len(points)
    import math
    pts = sorted(points, key=lambda p: math.atan2(p[1] - cy, p[0] - cx))
    # atan2 goes from the left (-pi) through the top... start at the top-left corner
    start = min(range(len(pts)), key=lambda i: pts[i][0] + pts[i][1])
    return pts[start:] + pts[:start]


# all the trucks have the same shape: the window of a truck whose inside is too dark-red to detect (and any odd one)
# is the average of the others
good = [k for k in SKINS if k != 'retro']
for key in ('window', 'sign'):
    for k in SKINS:
        out[k][key] = order(out[k][key])
    n = min(len(out[k][key]) for k in good)
    if all(len(out[k][key]) == n for k in good):
        mean = [[round(sum(out[k][key][i][c] for k in good) / len(good), 4) for c in (0, 1)] for i in range(n)]
        out['retro'][key] = mean

with open('assets/stand/truck.json', 'w', encoding='utf-8') as fp:
    json.dump(out, fp, indent=1)

# the bistro table and the stools
for name, outname in (('bistro', 'stand_truck_bistro'), ('stool_a', 'stand_truck_stool_a'), ('stool_b', 'stand_truck_stool_b')):
    im = Image.open(os.path.join(src, f'{name}.cut.png')).convert('RGBA')
    k = 150 / im.height
    im.resize((round(im.width * k), 150), Image.LANCZOS).save(f'assets/stand/{outname}.png', optimize=True)

sheet = Image.new('RGBA', (sum(i.width + 6 for _, i in dbg), max(i.height for _, i in dbg)), (90, 110, 130, 255))
x = 0
for skin, i in dbg:
    d = ImageDraw.Draw(i)
    d.polygon([(px * i.width, py * i.height) for px, py in out[skin]['window']], outline=(0, 255, 0, 255))
    d.polygon([(px * i.width, py * i.height) for px, py in out[skin]['sign']], outline=(255, 0, 255, 255))
    sheet.alpha_composite(i, (x, 0))
    x += i.width + 6
sheet.save('art/cut/trucks_polys.png')
