"""Where does the bright tile-edge line come from? Looks at the square grass texture and at the projected tile."""
import importlib.util
import sys

import numpy as np
from PIL import Image

sheet = sys.argv[1]
spec = importlib.util.spec_from_file_location('mt', 'tools/make_tiles.py')
mt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mt)
S = mt.S
img = Image.open(sheet).convert('RGB')
cols, rows = mt.find_grid(img)
(x0, x1), (y0, y1) = cols[0], rows[0]
inset = int((x1 - x0) * 0.025)
sq = img.crop((x0 + inset, y0 + inset, x1 - inset, y1 - inset))
side = min(sq.size)
sq = sq.crop((0, 0, side, side)).resize((S, S), Image.LANCZOS)
lum = lambda im: np.asarray(im.convert('RGB')).astype(float) @ np.array([0.299, 0.587, 0.114])
raw, flat, seam = lum(sq), lum(mt.flatten(sq)), lum(mt.seamless(mt.flatten(sq)))
for name, L in (('raw crop', raw), ('flattened', flat), ('seamless', seam)):
    cols_ = [L[:, i].mean() for i in (0, 1, 2, 4, 8, 16, 64, 256)]
    rows_ = [L[i, :].mean() for i in (0, 1, 2, 4, 8, 16, 64, 256)]
    print(f'{name:10s} mean of columns 0,1,2,4,8,16,64,256:', [round(v, 1) for v in cols_])
    print(f'{"":10s} mean of rows    0,1,2,4,8,16,64,256:', [round(v, 1) for v in rows_])
