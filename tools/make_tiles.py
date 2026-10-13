"""Turns a 5x4 sheet of flat top-down ground swatches (on magenta) into isometric 2:1 diamond tiles.

Usage: python tools/make_tiles.py <sheet.jpg> <out_dir> [preview.png]

Pipeline per swatch: cut -> (noise-like textures) remove baked lighting + make seamless by cross-fading the seams
-> project to a 128x64 diamond (rotate 45 deg, squash 2:1) with 4x supersampling and a 3% overlap, so that
neighbouring tiles leave no hairline gaps.
Structured textures (stone, tiles, planks) are only cropped: cross-fading would ghost their joints.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

S = 512  # working size of one square texture
OVER = 1.03  # diamond oversize, hides gaps between tiles
TW, TH = 128, 64

# order in the sheet: (name, mode)  mode: 'noise' = flatten + seamless, 'keep' = crop only
SHEET = [
    ('grass_1', 'noise'), ('grass_2', 'noise'), ('grass_3', 'noise'), ('pavement_1', 'keep'), ('pavement_2', 'keep'),
    ('pavement_3', 'keep'), ('road', 'road'), ('road_dash', 'road'), ('sand_1', 'noise'), ('sand_2', 'noise'),
    ('sand_3', 'noise'), ('water_1', 'noise'), ('water_2', 'noise'), ('boardwalk', 'keep'), ('schoolyard', 'keep'),
    ('path', 'noise'), ('mall', 'keep'), ('mall_walk', 'keep'), ('station', 'keep'), ('station_walk', 'keep'),
]
# file names the game looks for (tileImage() picks _1.._4 variants first, then the plain name)
OUT_NAME = {
    'grass_1': 'tile_grass_1', 'grass_2': 'tile_grass_2', 'grass_3': 'tile_grass_3',
    'pavement_1': 'tile_pavement_1', 'pavement_2': 'tile_pavement_2', 'pavement_3': 'tile_pavement_3',
    'road': 'tile_road', 'road_dash': 'tile_road_dash',
    'sand_1': 'tile_sand_1', 'sand_2': 'tile_sand_2', 'sand_3': 'tile_sand_3',
    'water_1': 'tile_water_1', 'water_2': 'tile_water_2',
    'boardwalk': 'tile_boardwalk', 'schoolyard': 'tile_schoolyard', 'path': 'tile_path',
    'mall': 'tile_mall', 'mall_walk': 'tile_mall_walk', 'station': 'tile_station', 'station_walk': 'tile_station_walk',
}


def runs(mask1d, min_len=100):
    out, start = [], None
    for i, v in enumerate(mask1d):
        if v and start is None:
            start = i
        if not v and start is not None:
            if i - start >= min_len:
                out.append((start, i))
            start = None
    if start is not None and len(mask1d) - start >= min_len:
        out.append((start, len(mask1d)))
    return out


def find_grid(img):
    a = np.asarray(img).astype(np.float32)
    bg = np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3)]), axis=0)
    m = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]
    solid = m < (np.minimum(bg[0], bg[2]) - bg[1]) * 0.5
    cols = runs(solid.mean(axis=0) > 0.25)
    rows = runs(solid.mean(axis=1) > 0.25)
    assert len(cols) == 5 and len(rows) == 4, f'unexpected grid {len(cols)}x{len(rows)}'
    return cols, rows


def wrap_blur(im, radius):
    w, h = im.size
    big = Image.new('RGB', (w * 3, h * 3))
    for dx in range(3):
        for dy in range(3):
            big.paste(im, (dx * w, dy * h))
    return big.filter(ImageFilter.GaussianBlur(radius)).crop((w, h, 2 * w, 2 * h))


def flatten(im):
    arr = np.asarray(im).astype(np.float32)
    low = np.asarray(wrap_blur(im, S / 5)).astype(np.float32)
    res = arr - low + arr.reshape(-1, 3).mean(axis=0)
    return Image.fromarray(np.clip(res, 0, 255).astype(np.uint8))


def seamless(im, band=0.22):
    arr = np.asarray(im).astype(np.float32)
    rolled = np.roll(arr, (S // 2, S // 2), axis=(0, 1))
    t = np.abs(np.linspace(-1, 1, S))
    k = np.clip(1 - t / (band * 2), 0, 1)
    k = k * k * (3 - 2 * k)
    mask = np.maximum(k[None, :], k[:, None])[..., None]
    return Image.fromarray(np.clip(rolled * (1 - mask) + arr * mask, 0, 255).astype(np.uint8))


def box_blur(a, r):
    """Separable box blur with wrap-free edges (the canvas is 3x3 tiles, only the centre is used)."""
    k = 2 * r + 1
    for axis in (0, 1):
        pad = np.pad(a, [(r, r) if i == axis else (0, 0) for i in range(2)], mode='edge')
        c = np.cumsum(pad, axis=axis, dtype=np.float64)
        c = np.concatenate([np.zeros_like(np.take(c, [0], axis=axis)), c], axis=axis)
        a = (np.take(c, range(k, c.shape[axis]), axis=axis) - np.take(c, range(0, c.shape[axis] - k), axis=axis)) / k
    return a


def gauss(a, r):
    for _ in range(3):
        a = box_blur(a, max(1, r // 2))
    return a


def pavement(kind, seed):
    """Clean rounded paving slabs with a soft clay bevel. Slab edges sit on a grid that repeats exactly every tile."""
    import random
    rnd = random.Random(seed)
    N = 3 * S
    gap, rad = 14, 20
    slabs = []  # (x0, y0, x1, y1) in tile units, 0..1 repeating
    if kind == 'grid2':  # 2x2 square slabs
        for i in range(-2, 5):
            for j in range(-2, 5):
                slabs.append((i / 2, j / 2, (i + 1) / 2, (j + 1) / 2))
    elif kind == 'brick':  # running bond, two rows per tile
        for j in range(-2, 5):
            off = 0.25 if j % 2 else 0
            for i in range(-3, 5):
                slabs.append((i / 2 + off, j / 2, (i + 1) / 2 + off, (j + 1) / 2))
    elif kind == 'grid3':  # 3x3 smaller square slabs
        for i in range(-3, 7):
            for j in range(-3, 7):
                slabs.append((i / 3, j / 3, (i + 1) / 3, (j + 1) / 3))
    mask = Image.new('L', (N, N), 0)
    tone = np.zeros((N, N), dtype=np.float32)
    toneimg = Image.new('F', (N, N), 0)
    d = ImageDraw.Draw(mask)
    dt = ImageDraw.Draw(toneimg)
    tones = {}
    for (x0, y0, x1, y1) in slabs:
        # tone repeats with the tile, so the key is taken modulo one tile
        key = (round(x0 % 1, 3), round(y0 % 1, 3))
        if key not in tones:
            tones[key] = rnd.uniform(-7, 7)
        box = [S + x0 * S + gap / 2, S + y0 * S + gap / 2, S + x1 * S - gap / 2 - 1, S + y1 * S - gap / 2 - 1]
        d.rounded_rectangle(box, rad, fill=255)
        dt.rounded_rectangle(box, rad, fill=tones[key])
    m = np.asarray(mask).astype(np.float32) / 255
    tone = np.asarray(toneimg)
    h = gauss(m, 14)
    gy, gx = np.gradient(h)
    lit = (gx + gy) * 420  # light from the top-left
    ma = gauss(m, 2)
    base = np.array([224, 227, 231], dtype=np.float32)
    joint = np.array([172, 178, 187], dtype=np.float32)
    col = base[None, None, :] + tone[..., None] + lit[..., None]
    col = col * ma[..., None] + joint[None, None, :] * (1 - ma[..., None])
    noise = gauss(np.random.RandomState(seed).randn(N, N).astype(np.float32), 1) * 9
    col = col + noise[..., None]
    out = np.clip(col[S:2 * S, S:2 * S], 0, 255).astype(np.uint8)
    return Image.fromarray(out)


def road_dash(asphalt):
    """A short soft dash lying along +x, close to the tile's y=0 edge (where the game's centre line is)."""
    im = asphalt.convert('RGBA')
    sc = 4
    layer = Image.new('RGBA', (S * sc, S * sc), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, x1 = int(0.20 * S * sc), int(0.65 * S * sc)
    cy = int(0.10 * S * sc)
    h = int(0.07 * S * sc)
    r = h // 2
    d.rounded_rectangle((x0, cy - h // 2 + 6 * sc, x1, cy + h // 2 + 6 * sc), r, fill=(60, 62, 70, 120))  # soft shadow
    d.rounded_rectangle((x0, cy - h // 2, x1, cy + h // 2), r, fill=(214, 216, 220, 255))  # lower edge
    d.rounded_rectangle((x0, cy - h // 2, x1, cy + h // 2 - 5 * sc), r, fill=(247, 247, 243, 255))  # top face
    layer = layer.resize((S, S), Image.LANCZOS)
    im.alpha_composite(layer)
    return im.convert('RGB')


def to_diamond(tex):
    """Square texture (S x S) -> 128x64 RGBA isometric diamond (swatch x axis = game +x, y axis = game +y)."""
    sc = 4
    W, H = TW * sc, TH * sc
    k = OVER
    src = tex.convert('RGBA')
    c = (1 / (W * k), 1 / (H * k))
    # u = X/(Wk) + Y/(Hk) + 0.5 - 1/k ; v = Y/(Hk) - X/(Wk) + 0.5
    coeffs = (
        S * c[0], S * c[1], S * (0.5 - 1 / k),
        -S * c[0], S * c[1], S * 0.5,
    )
    out = src.transform((W, H), Image.AFFINE, coeffs, resample=Image.BICUBIC)
    return out.resize((TW, TH), Image.LANCZOS)


def main():
    sheet, out_dir = sys.argv[1], sys.argv[2]
    preview = sys.argv[3] if len(sys.argv) > 3 else None
    os.makedirs(out_dir, exist_ok=True)
    img = Image.open(sheet).convert('RGB')
    cols, rows = find_grid(img)
    tiles = {}
    for i, (name, mode) in enumerate(SHEET):
        r, c = divmod(i, 5)
        (x0, x1), (y0, y1) = cols[c], rows[r]
        inset = int((x1 - x0) * 0.025)
        if mode == 'road':
            inset = int((x1 - x0) * 0.09)  # also cuts off the lane edge lines
        sq = img.crop((x0 + inset, y0 + inset, x1 - inset, y1 - inset))
        side = min(sq.size)
        sq = sq.crop((0, 0, side, side)).resize((S, S), Image.LANCZOS)
        if mode in ('noise', 'road'):
            sq = seamless(flatten(sq))
        if name.startswith('pavement'):
            sq = pavement({'pavement_1': 'grid2', 'pavement_2': 'brick', 'pavement_3': 'grid2'}[name], i)
        if name == 'road_dash':
            # the dash is drawn here, so use the plain asphalt (same crop as 'road', flipped to differ a little)
            plain = tiles['road_tex']
            sq = road_dash(plain.transpose(Image.FLIP_LEFT_RIGHT))
        if name == 'road':
            tiles['road_tex'] = sq
        tiles[name] = to_diamond(sq)
        tiles[name].save(os.path.join(out_dir, OUT_NAME[name] + '.png'))
        print(OUT_NAME[name])

    if preview:  # a little iso map: grass, road (2 lanes), pavement, sand, water, boardwalk
        rows_map = [
            'gggggggggg', 'pppppppppp', 'rrrrrrrrrr', 'RRRRRRRRRR', 'pppppppppp',
            'ssssssbbww', 'ssssssbbww', 'qqqqqqtttt', 'mmmmmmnnnn', 'kkkkkkKKKK',
        ]
        pick = {
            'g': ['grass_1', 'grass_2', 'grass_3'], 'p': ['pavement_1', 'pavement_2', 'pavement_3'], 'r': ['road'],
            'R': ['road_dash'], 's': ['sand_1', 'sand_2', 'sand_3'], 'b': ['boardwalk'], 'w': ['water_1', 'water_2'],
            'q': ['path'], 't': ['schoolyard'], 'm': ['mall'], 'n': ['mall_walk'], 'k': ['station'], 'K': ['station_walk'],
        }
        n = len(rows_map)
        canvas = Image.new('RGBA', (TW * n + 40, TH * n + 40), (120, 170, 220, 255))
        for y, row in enumerate(rows_map):
            for x, ch in enumerate(row):
                v = pick[ch]
                t = tiles[v[(x * 7 + y * 13) % len(v)]]
                left = (x - y) * TW // 2 + n * TW // 2 + 20 - TW // 2
                top = (x + y) * TH // 2 + 20
                canvas.alpha_composite(t, (left, top))
        canvas.save(preview)
        print('preview', preview)


if __name__ == '__main__':
    main()
