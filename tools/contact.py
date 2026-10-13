"""Contact sheet of cut PNGs on a dark background: python tools/contact.py <dir> <out.png> [cols]"""
import glob, os, sys
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
files = sorted(glob.glob(os.path.join(d, '*.png')))
cell = 260
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * cell, rows * cell), (60, 66, 80))
dr = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f)
    im.thumbnail((cell - 20, cell - 36))
    r, c = divmod(i, cols)
    sheet.paste(im, (c * cell + (cell - im.width) // 2, r * cell + 4), im)
    dr.text((c * cell + 6, r * cell + cell - 14), os.path.basename(f)[:-4], fill=(255, 255, 255))
sheet.save(out)
