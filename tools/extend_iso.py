"""Makes an isometric picture of a long box (a counter, a shelf) longer along its long side, by repeating one stretch
of it, so that it fits the length the game needs without squashing it.

Usage: python tools/extend_iso.py <in.png> <out.png> <x1> <x2> [slope=0.5]

The long side runs to the lower right (its front faces the lower left). Everything from the column x1 on is moved by
(x2 - x1, (x2 - x1) * slope) px, and the stretch x1..x2 shows twice. Pick x1 and x2 at two places that look alike (two
gaps between doors, for example): then the joint does not show. `slope` is how much the long side goes down per px
(measure its bottom edge; 0.5 in a true 2:1 projection).
"""
import sys

import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
x1, x2 = int(sys.argv[3]), int(sys.argv[4])
slope = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
a = np.asarray(Image.open(src).convert('RGBA'))
H, W, _ = a.shape
dx = x2 - x1
dy = int(round(dx * slope))
res = np.zeros((H + dy, W + dx, 4), dtype=np.uint8)
res[:H, :x2] = a[:, :x2]
# the part from x1 on, moved along the long side; it covers the copy of x1..x2 from the column x2 on
res[dy:dy + H, x2:] = a[:, x1:]
Image.fromarray(res).save(out)
print('saved', out, (W + dx, H + dy), 'moved by', (dx, dy))
