"""Turns the installed PNG pictures (assets/**/*.png) into lossless WebP: the same pixels, about a quarter smaller,
so the game loads faster on phones. Run it after installing new pictures; the game finds .webp first, then .png.

Usage: python tools/to_webp.py [--check]
  --check  only report what would change.
A PNG is replaced only when its WebP is smaller and decodes to exactly the same pixels.
"""
import glob
import io
import os
import sys

import numpy as np
from PIL import Image

CHECK = '--check' in sys.argv
before = after = 0
done = 0
for f in sorted(glob.glob('assets/**/*.png', recursive=True)):
    rgba = Image.open(f).convert('RGBA')
    buf = io.BytesIO()
    rgba.save(buf, 'WEBP', lossless=True, method=4, exact=True)
    png_size = os.path.getsize(f)
    before += png_size
    same = np.array_equal(np.asarray(Image.open(io.BytesIO(buf.getvalue())).convert('RGBA')), np.asarray(rgba))
    if not same or buf.tell() >= png_size:
        after += png_size
        continue
    after += buf.tell()
    done += 1
    if not CHECK:
        with open(f[:-4] + '.webp', 'wb') as fp:
            fp.write(buf.getvalue())
        os.remove(f)
print(f'{done} pictures {"would be" if CHECK else ""} converted: {before / 1e6:.1f} MB -> {after / 1e6:.1f} MB')
