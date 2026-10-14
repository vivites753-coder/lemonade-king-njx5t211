"""Makes the Android app icons and splash pictures from the game icon (public/icons/icon-512.png).

Usage: python tools/make_android_icons.py [source.png]
Run it again after the game icon changes, then build the app (see docs/ANDROID.md).
  - mipmap-*/ic_launcher.png, ic_launcher_round.png: the icon for old Android versions (square / round);
  - mipmap-*/ic_launcher_foreground.png: the adaptive icon (Android 8+); the phone cuts it to its own shape,
    so the whole square picture is the foreground and the background colour is the icon's middle colour;
  - drawable*/splash.png: the icon in the middle of the game's sky (the start screen of old Android versions).
"""
import os
import sys

from PIL import Image, ImageDraw

SRC = sys.argv[1] if len(sys.argv) > 1 else 'public/icons/icon-512.png'
RES = 'android/app/src/main/res'
SKY = (0xBF, 0xE6, 0xFF)
DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}

icon = Image.open(SRC).convert('RGBA')


def scaled(size: int) -> Image.Image:
    return icon.resize((size, size), Image.LANCZOS)


def rounded(im: Image.Image, radius: float) -> Image.Image:
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.size[0] - 1, im.size[1] - 1), radius=radius, fill=255)
    out = im.copy()
    out.putalpha(mask)
    return out


def circle(im: Image.Image) -> Image.Image:
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, im.size[0] - 1, im.size[1] - 1), fill=255)
    out = im.copy()
    out.putalpha(mask)
    return out


for name, k in DENSITIES.items():
    d = f'{RES}/mipmap-{name}'
    os.makedirs(d, exist_ok=True)
    s = round(48 * k)
    rounded(scaled(s), s * 0.18).save(f'{d}/ic_launcher.png', optimize=True)
    circle(scaled(s)).save(f'{d}/ic_launcher_round.png', optimize=True)
    # adaptive: a 108 dp layer, the phone shows about the middle 72 dp; the picture fills a little more than that
    full = round(108 * k)
    inner = round(76 * k)
    fg = Image.new('RGBA', (full, full), (0, 0, 0, 0))
    fg.paste(scaled(inner), ((full - inner) // 2, (full - inner) // 2))
    fg.save(f'{d}/ic_launcher_foreground.png', optimize=True)

# the background of the adaptive icon: the colour in the middle of the icon's sky
mid = icon.getpixel((8, icon.size[1] // 2))
with open(f'{RES}/values/ic_launcher_background.xml', 'w', encoding='utf-8', newline='\n') as f:
    f.write(f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#{mid[0]:02X}{mid[1]:02X}{mid[2]:02X}</color>\n</resources>\n')

# the splash pictures keep the sizes of the template's files
for root, _dirs, files in os.walk(RES):
    for fn in files:
        if fn != 'splash.png':
            continue
        p = os.path.join(root, fn)
        w, h = Image.open(p).size
        out = Image.new('RGB', (w, h), SKY)
        s = round(min(w, h) * 0.42)
        ic = rounded(scaled(s), s * 0.22)
        out.paste(ic, ((w - s) // 2, (h - s) // 2), ic)
        out.save(p, optimize=True)
print('android icons and splash pictures made from', SRC)
