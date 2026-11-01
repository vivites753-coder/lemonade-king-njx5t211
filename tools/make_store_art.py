"""The pictures for the Steam and Google Play pages (docs/STEAM.md), made from the two key art pictures and the logo:
art/steam/keyart_wide.jpg (16:9), art/steam/keyart_tall.jpg (2:3) and art/steam/logo.png (cut out of logo_raw.jpg
with tools/cut_single.py). Every size the stores ask for goes to art/steam/store/, the logo laid on the capsules
(Steam: on the capsules only the logo and the art; the library hero is art without the logo).

Usage: python tools/make_store_art.py
"""
import os

from PIL import Image, ImageEnhance, ImageFilter

SRC = 'art/steam'
OUT = 'art/steam/store'


def crop(im, aspect, cx=0.5, cy=0.5):
    """The biggest part of the picture with this width/height, its middle as near (cx, cy) (shares) as it fits."""
    W, H = im.size
    if W / H > aspect:
        w, h = round(H * aspect), H
    else:
        w, h = W, round(W / aspect)
    x = min(max(round(cx * W - w / 2), 0), W - w)
    y = min(max(round(cy * H - h / 2), 0), H - h)
    return im.crop((x, y, x + w, y + h))


def sized(im, w, h):
    return im.resize((w, h), Image.LANCZOS)


def with_logo(im, logo, cx, cy, width, top=None):
    """The logo laid on the picture: its middle at (cx, cy) and `width` (shares of the picture), or its top edge at
    `top`; with a soft shadow under it so that it reads on the light sky."""
    W, H = im.size
    lw = round(W * width)
    lh = round(lw * logo.height / logo.width)
    if lh > H * 0.9:
        lh = round(H * 0.9)
        lw = round(lh * logo.width / logo.height)
    lg = logo.resize((lw, lh), Image.LANCZOS)
    x = round(cx * W - lw / 2)
    y = round(top * H) if top is not None else round(cy * H - lh / 2)
    pad = max(8, lw // 20)
    shadow = Image.new('RGBA', (lw + 2 * pad, lh + 2 * pad), (0, 0, 0, 0))
    a = lg.getchannel('A').point(lambda v: v * 0.45)
    shadow.paste((60, 30, 0, 255), (pad, pad), a)
    shadow = shadow.filter(ImageFilter.GaussianBlur(pad / 2))
    out = im.convert('RGBA')
    out.alpha_composite(shadow, (x - pad, y - pad + max(2, lh // 40)))
    out.alpha_composite(lg, (x, y))
    return out.convert('RGB')


def main():
    os.makedirs(OUT, exist_ok=True)
    wide = Image.open(f'{SRC}/keyart_wide.jpg').convert('RGB')
    tall = Image.open(f'{SRC}/keyart_tall.jpg').convert('RGB')
    logo = Image.open(f'{SRC}/logo.png').convert('RGBA')
    logo = logo.crop(logo.getbbox())

    def save(im, name, quality=92):
        path = os.path.join(OUT, name)
        if name.endswith('.png'):
            im.save(path, optimize=True)
        else:
            im.convert('RGB').save(path, quality=quality, optimize=True)
        print(name, im.size)

    # Steam: the store capsules (the logo on the calm left part of the wide picture, on the sky of the tall one)
    header = with_logo(sized(crop(wide, 920 / 430, cy=0.5), 920, 430), logo, 0.25, 0.47, 0.42)
    save(header, 'header_capsule_920x430.jpg')
    save(header, 'library_header_920x430.jpg')
    save(with_logo(sized(crop(wide, 462 / 174, cx=0.55, cy=0.5), 462, 174), logo, 0.27, 0.5, 0.48), 'small_capsule_462x174.jpg')
    save(with_logo(sized(crop(wide, 1232 / 706), 1232, 706), logo, 0.25, 0.4, 0.42), 'main_capsule_1232x706.jpg')
    # (on the tall picture the logo stays on the sky, over the umbrella)
    save(with_logo(sized(crop(tall, 748 / 896, cy=0.5), 748, 896), logo, 0.5, 0, 0.6, top=0.035), 'vertical_capsule_748x896.jpg')
    save(with_logo(sized(crop(tall, 600 / 900), 600, 900), logo, 0.5, 0, 0.7, top=0.03), 'library_capsule_600x900.jpg')
    # the library: the hero is art only (Steam lays the logo over it), the logo alone, 1280 wide or 720 high
    save(sized(crop(wide, 3840 / 1240, cy=0.47), 3840, 1240), 'library_hero_3840x1240.png')
    k = min(1280 / logo.width, 720 / logo.height)
    save(logo.resize((round(logo.width * k), round(logo.height * k)), Image.LANCZOS), 'library_logo.png')
    # the background of the store page: the wide picture, soft and dim (the page's text stands over it)
    bg = sized(crop(wide, 1438 / 810), 1438, 810).filter(ImageFilter.GaussianBlur(6))
    bg = ImageEnhance.Brightness(ImageEnhance.Color(bg).enhance(0.8)).enhance(0.55)
    save(bg, 'page_background_1438x810.jpg')
    # Google Play: the feature graphic (no transparency)
    save(with_logo(sized(crop(wide, 1024 / 500, cy=0.5), 1024, 500), logo, 0.25, 0.47, 0.42), 'google_play_feature_1024x500.jpg')


if __name__ == '__main__':
    main()
