"""Makes the pictures of the game no bigger than they need to be: at most K picture px per world px of the size the
game draws them at (src/render/spriteMeta.ts, the defaults in src/render/assets.ts and the strip manifests). Big
pictures fill the memory of a phone and make it work (and warm up) more; at K = 2.2 a picture is still sharp on a
phone screen zoomed in twice, and on a computer screen as it opens.

Usage: python tools/shrink_assets.py [K=2.2] [--check]
  --check  only report what would change.

Walking and looping strips (assets/chars/anim) are shrunk frame by frame and their manifests (walk.json, loops.json)
updated, so they are drawn exactly as big as before. Left as they are: the UI icons, the kitchen, the ground tiles,
the lucky finds (assets/items, drawn by their own sizes in src/render/proc/critters.ts) and the still pictures of the
people (the walking strips take their height from those). Run it after installing new pictures (and
tools/to_webp.py); it does nothing to a picture that is small enough already.
"""
import io
import json
import re
import sys
from pathlib import Path

from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
CHECK = '--check' in sys.argv
args = [a for a in sys.argv[1:] if not a.startswith('--')]
K = float(args[0]) if args else 2.2
ROOT = Path('.')
ANIM = ROOT / 'assets/chars/anim'
# drawn smaller than this share of its size is not worth a new file
MIN_GAIN = 0.95
# the walls of the indoor places and of the store are drawn WALL_H world px high (src/render/proc/indoor.ts)
WALL_H = 104
# pictures drawn by their own code, not by drawSprite: world px high (the cloth of the banner's flag, see bannerFlag)
OWN_SIZE = {'stand_banner': 64}


def read_metas():
    src = (ROOT / 'src/render/spriteMeta.ts').read_text(encoding='utf-8')
    metas = {m.group(1): float(m.group(2)) for m in re.finditer(r"^\s*(\w+): \{ h: ([\d.]+)", src, re.M)}
    truck = re.search(r"TRUCK_META: SpriteMeta = \{ h: ([\d.]+)", src)
    for m in re.finditer(r"^\s*(stand_truck_\w+): TRUCK_META", src, re.M):
        metas[m.group(1)] = float(truck.group(1))
    a = (ROOT / 'src/render/assets.ts').read_text(encoding='utf-8')
    prefixes = [(m.group(1), float(m.group(2))) for m in re.finditer(r"\['(\w+_)', \{ h: ([\d.]+)", a)]
    return metas, prefixes


METAS, PREFIXES = read_metas()


def world_h(i):
    """World px high the picture is drawn at (None: not a sprite this tool knows)."""
    if i in OWN_SIZE:
        return OWN_SIZE[i]
    if i.startswith('wall_'):
        return WALL_H
    # the truck's front part is drawn over the workers in the place of the truck picture
    if i.startswith('stand_truck_') and i.endswith('_front'):
        return METAS.get(i[: -len('_front')])
    if i in METAS:
        return METAS[i]
    for p, h in PREFIXES:
        if i.startswith(p):
            return h
    return None


def resize(im, size):
    """Lanczos on premultiplied alpha: no dark or light fringe at the edges."""
    return im.convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')


def save(im, path, colors=0):
    """Lossless WebP; `colors`: first down to that many colours, like the strips are made (tools/make_walk.py), else
    a smaller strip would take more room on the disk than the big one."""
    if colors:
        im = im.quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert('RGBA')
    buf = io.BytesIO()
    im.save(buf, 'WEBP', lossless=True, method=4, exact=True)
    path.write_bytes(buf.getvalue())


def stills():
    done = saved = 0
    for p in sorted(ROOT.glob('assets/**/*.webp')):
        rel = p.relative_to(ROOT).as_posix()
        if rel.startswith(('assets/ui/', 'assets/kitchen/', 'assets/tiles/', 'assets/chars/', 'assets/items/')):
            continue
        h = world_h(p.stem)
        if not h:
            continue
        im = Image.open(p).convert('RGBA')
        W, H = im.size
        s = K * h / H
        if s >= MIN_GAIN:
            continue
        size = (max(1, round(W * s)), max(1, round(H * s)))
        saved += W * H - size[0] * size[1]
        done += 1
        print(f'  {rel}: {W}x{H} -> {size[0]}x{size[1]}')
        if not CHECK:
            save(resize(im, size), p)
    return done, saved


def strips(manifest_name, figure_h):
    """Shrinks every strip of a manifest to K px per world px of its figure; `figure_h(id, info)` is the figure's
    height on screen in world px."""
    path = ANIM / manifest_name
    man = json.loads(path.read_text(encoding='utf-8'))
    suffix = '_walk' if manifest_name == 'walk.json' else '_loop'
    done = saved = 0
    for i, info in man.items():
        f = ANIM / f'{i}{suffix}.webp'
        if not f.exists():
            continue
        fh_world = figure_h(i, info)
        if not fh_world:
            continue
        s = K * fh_world / info['figH']
        if s >= MIN_GAIN:
            continue
        im = Image.open(f).convert('RGBA')
        n, fw, fh = info['n'], info['fw'], info['fh']
        assert im.size == (n * fw, fh), (i, im.size, n, fw, fh)
        fw2, fh2 = max(1, round(fw * s)), max(1, round(fh * s))
        sx, sy = fw2 / fw, fh2 / fh
        out = Image.new('RGBA', (n * fw2, fh2), (0, 0, 0, 0))
        for k in range(n):
            out.paste(resize(im.crop((k * fw, 0, (k + 1) * fw, fh)), (fw2, fh2)), (k * fw2, 0))
        saved += n * (fw * fh - fw2 * fh2)
        done += 1
        print(f'  {f.name}: frame {fw}x{fh} -> {fw2}x{fh2}')
        info.update(fw=fw2, fh=fh2, cx=round(info['cx'] * sx, 2), feetY=round(info['feetY'] * sy, 2), figH=round(info['figH'] * sy, 2))
        if info.get('u'):
            info['u'] = round(info['u'] / sy, 5)
        if not CHECK:
            save(out, f, colors=256)
    if not CHECK and done:
        # (the format of tools/make_walk.py: one space, LF)
        path.write_text(json.dumps(man, indent=1, ensure_ascii=False), encoding='utf-8', newline='\n')
    return done, saved


def walk_figure(i, info):
    # a walking strip with its own scale (people with umbrellas) is drawn u world px per strip px
    if info.get('u'):
        return info['figH'] * info['u']
    still = ROOT / 'assets/chars' / f'{i}.webp'
    if not still.exists():
        return None
    ih = Image.open(still).size[1]
    # the same figure height as the still picture (src/render/proc/people.ts: 12 px of its height are margins)
    return (world_h(i) or 58) * (ih - 12) / ih


print(f'K = {K} px per world px' + (' (check only)' if CHECK else ''))
print('still pictures:')
a = stills()
print('walking strips:')
b = strips('walk.json', walk_figure)
print('looping strips:')
c = strips('loops.json', lambda i, info: info['h'])
n = a[0] + b[0] + c[0]
mb = (a[1] + b[1] + c[1]) * 4 / 1048576
print(f'{n} pictures shrunk, {mb:.1f} MB less memory when they are loaded')
