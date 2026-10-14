"""Installs the food truck pictures (assets/stand/stand_truck_<skin>.png) and finds the open serving window and the
sign board of every truck, so the game can show the sellers inside the window and write the text on the sign.

Usage: python tools/make_trucks.py <dir with the cut pictures: lemon.png mint.png ...> [--mirror]
  --mirror  the pictures show the window on the side facing the lower RIGHT: they are mirrored so it faces the
            lower LEFT, where the customers stand.
The inside of the window is a light cream wall (dark ones are found too). The bistro table and the stools are installed
when bistro.png / stool_a.png / stool_b.png are in the folder.
Writes assets/stand/truck.json: for every skin the window polygon and the sign quad as fractions of the picture
(corners: top-left, top-right, bottom-right, bottom-left), and a debug picture art/cut/trucks_polys.png.
"""
import json
import math
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageOps

MIRROR = '--mirror' in sys.argv
src = [a for a in sys.argv[1:] if not a.startswith('--')][0]
SKINS = [s for s in ['lemon', 'mint', 'berry', 'sky', 'retro', 'lilac'] if os.path.exists(os.path.join(src, f'{s}.png'))]
H = 300  # height of the installed truck picture
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


def quad(mask):
    """The four corners of a blob: the convex hull simplified until four points are left."""
    cnts, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    c = max(cnts, key=cv2.contourArea)
    hull = cv2.convexHull(c)
    eps = 0.01
    ap = cv2.approxPolyDP(hull, eps * cv2.arcLength(hull, True), True)
    while len(ap) > 4 and eps < 0.2:
        eps += 0.005
        ap = cv2.approxPolyDP(hull, eps * cv2.arcLength(hull, True), True)
    return [(int(p[0][0]), int(p[0][1])) for p in ap]


def order(points):
    """Corners in a fixed order: top-left, top-right, bottom-right, bottom-left."""
    cx = sum(p[0] for p in points) / len(points)
    cy = sum(p[1] for p in points) / len(points)
    pts = sorted(points, key=lambda p: math.atan2(p[1] - cy, p[0] - cx))
    start = min(range(len(pts)), key=lambda i: pts[i][0] + pts[i][1])
    return pts[start:] + pts[:start]


for skin in SKINS:
    im = Image.open(os.path.join(src, f'{skin}.png')).convert('RGBA')
    if MIRROR:
        im = ImageOps.mirror(im)
    a = np.asarray(im).astype(float)
    Wd, Ht = im.size
    solid = a[..., 3] > 200
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    L = luma(a)
    yy, xx = np.mgrid[0:Ht, 0:Wd]
    # the sign board: a dark face on the roof (top third)
    board = solid & (L < 95) & (yy < Ht * 0.34)
    bq = quad(biggest(board))
    # the open window: the beige inside wall (warm, darker than white, not the wood of the shelf), below the roof
    cream = solid & (R > 160) & (R < 235) & (G > 140) & (G < 215) & (B > 110) & (B < 190) & (R - B > 25) & (R - B < 80) & (G - B > 10) & (G - B < 45) & (yy > Ht * 0.2) & (yy < Ht * 0.8)
    cream = cv2.morphologyEx(cream.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    wm = biggest(cv2.morphologyEx(cream, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)))
    wq = quad(wm)
    out[skin] = {
        'window': [[round(x / Wd, 4), round(y / Ht, 4)] for x, y in order(wq)],
        'sign': [[round(x / Wd, 4), round(y / Ht, 4)] for x, y in order(bq)],
        'aspect': round(Wd / Ht, 4),
    }
    k = H / Ht
    small = im.resize((round(Wd * k), H), Image.LANCZOS)
    small.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(f'assets/stand/stand_truck_{skin}.png', optimize=True)
    dbg.append((skin, im))
    print(skin, 'window', len(wq), 'pts', out[skin]['window'], 'sign', len(bq), 'pts', im.size)

with open('assets/stand/truck.json', 'w', encoding='utf-8') as fp:
    json.dump(out, fp, indent=1)

# the bistro table and the stools (when they are in the folder)
for name, outname in (('bistro', 'stand_truck_bistro'), ('stool_a', 'stand_truck_stool_a'), ('stool_b', 'stand_truck_stool_b')):
    p = os.path.join(src, f'{name}.png')
    if not os.path.exists(p):
        continue
    im = Image.open(p).convert('RGBA')
    k = 150 / im.height
    im.resize((round(im.width * k), 150), Image.LANCZOS).save(f'assets/stand/{outname}.png', optimize=True)

sheet = Image.new('RGBA', (sum(i.width + 6 for _, i in dbg), max(i.height for _, i in dbg)), (90, 110, 130, 255))
x = 0
for skin, i in dbg:
    i = i.copy()
    d = ImageDraw.Draw(i)
    d.polygon([(px * i.width, py * i.height) for px, py in out[skin]['window']], outline=(0, 255, 0, 255), width=4)
    d.polygon([(px * i.width, py * i.height) for px, py in out[skin]['sign']], outline=(255, 0, 255, 255), width=4)
    sheet.alpha_composite(i, (x, 0))
    x += i.width + 6
sheet.resize((sheet.width // 3, sheet.height // 3)).save('art/cut/trucks_polys.png')
