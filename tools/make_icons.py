"""Makes square shop icons (assets/ui/ui_up_<id>.png, 128x128) from the pictures the game already has.

Usage: python tools/make_icons.py
Every icon is the object itself, cropped to its pixels and centred on a transparent square with a small margin.
The big stand has its own drawn icon now (sheet 11, tools/cut_icons.py); big_stand() can still build one from the
two tables (python tools/make_icons.py --big-stand).
"""
import os
import sys

from PIL import Image

SIZE = 128
MARGIN = 0.07

SOURCES = {
    'sign': 'assets/stand/stand_sign.png',
    'speaker': 'assets/stand/stand_speaker.png',
    'branded_cups': 'assets/kitchen/kt_cups_branded.png',
    'mascot': 'assets/stand/stand_mascot.png',
    'umbrella': 'assets/stand/stand_umbrella.png',
    'dispenser': 'assets/stand/stand_dispenser.png',
    'bike': 'assets/stand/stand_bike.png',
    'tent': 'assets/stand/stand_tent.png',
    'scooter': 'assets/stand/stand_scooter.png',
    'tv': 'assets/stand/stand_tv.png',
    'juicer_hand': 'assets/kitchen/kt_juicer_hand.png',
    'cooler': 'assets/kitchen/kt_cooler.png',
    'mixer_pro': 'assets/kitchen/kt_mixer_pro.png',
    'juicer_lever': 'assets/kitchen/kt_juicer_lever.png',
    'cash_lock': 'assets/stand/stand_cashbox.png',
    'toolkit': 'assets/kitchen/kt_toolkit.png',
    'truck': 'assets/stand/stand_truck_lemon.png',
    # equipment that is not an upgrade (the list of things in the shop)
    'mixer': 'assets/kitchen/kt_mixer_basic.png',
}


def asset(path: str) -> Image.Image:
    """An installed picture: the PNG, or the WebP that tools/to_webp.py made of it."""
    return Image.open(path if os.path.exists(path) else path[:-4] + '.webp')


def fit(im: Image.Image) -> Image.Image:
    im = im.convert('RGBA')
    box = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    if box:
        im = im.crop(box)
    inner = round(SIZE * (1 - 2 * MARGIN))
    k = inner / max(im.width, im.height)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    out = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    out.alpha_composite(im, ((SIZE - im.width) // 2, (SIZE - im.height) // 2))
    return out


def big_stand() -> Image.Image:
    """The yellow table with the blue one behind it on the left, as at a stand with two counters."""
    yellow = asset('assets/stand/stand_table.png').convert('RGBA')
    blue = asset('assets/stand/stand_table_blue.png').convert('RGBA')
    k = 4.0  # picture px per world px
    hy, hb = 76 * k, 66 * k
    yellow = yellow.resize((round(yellow.width * hy / yellow.height), round(hy)), Image.LANCZOS)
    blue = blue.resize((round(blue.width * hb / blue.height), round(hb)), Image.LANCZOS)
    W, H = 1400, 900
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ax, ay = 760, 620  # the stand point
    canvas.alpha_composite(blue, (round(ax - 45 * k - blue.width * 0.5), round(ay - 22 * k - blue.height * 0.66)))
    canvas.alpha_composite(yellow, (round(ax - yellow.width * 0.5), round(ay - yellow.height * 0.66)))
    return canvas


os.makedirs('assets/ui', exist_ok=True)
for key, src in SOURCES.items():
    fit(asset(src)).save(f'assets/ui/ui_up_{key}.png', optimize=True)
    print('ok', key)
if '--big-stand' in sys.argv:
    fit(big_stand()).save('assets/ui/ui_up_big_stand.png', optimize=True)
    print('ok big_stand')
