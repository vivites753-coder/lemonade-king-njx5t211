"""Analysis of a walking-animation video made from the people sheet (3x4 cells, each cell = front + back figure).
Usage: python tools/walk_analyze.py <frames_dir> [cols=3] [rows=4]
Prints, for every figure, where it stands and the best loop length (frames) of its walk cycle."""
import glob
import sys

import numpy as np
from PIL import Image

frames_dir = sys.argv[1]
cols = int(sys.argv[2]) if len(sys.argv) > 2 else 3
rows = int(sys.argv[3]) if len(sys.argv) > 3 else 4
files = sorted(glob.glob(frames_dir + '/f_*.png'))
first = np.asarray(Image.open(files[0]).convert('RGB')).astype(np.float32)
H, W, _ = first.shape
bg = np.median(np.concatenate([first[:6].reshape(-1, 3), first[-6:].reshape(-1, 3)]), axis=0)
print('frames', len(files), 'size', W, H, 'bg', bg)


def mask_of(img):
    m = np.minimum(img[..., 0], img[..., 2]) - img[..., 1]
    mb = float(min(bg[0], bg[2]) - bg[1])
    return (m < mb * 0.55)


stack = np.stack([mask_of(np.asarray(Image.open(f).convert('RGB')).astype(np.float32)) for f in files])  # T,H,W
cw, ch = W / cols, H / rows
print('cell', cw, ch)
for r in range(rows):
    for c in range(cols):
        x0, x1, y0, y1 = int(c * cw), int((c + 1) * cw), int(r * ch), int((r + 1) * ch)
        sub = stack[:, y0:y1, x0:x1]
        occ_x = sub.any(axis=(0, 1))
        xs = np.where(occ_x)[0]
        # split the two figures at the widest empty gap
        gaps, start = [], None
        for x in range(xs.min(), xs.max() + 1):
            if not occ_x[x] and start is None:
                start = x
            if occ_x[x] and start is not None:
                gaps.append((x - start, (start + x) // 2))
                start = None
        split = max(gaps)[1] if gaps else (xs.min() + xs.max()) // 2
        for side, (a, b) in (('front', (0, split)), ('back', (split, sub.shape[2]))):
            part = sub[:, :, a:b]
            ys, xx = np.where(part.any(axis=0))
            # centre-of-mass drift over time (head half) and feet drift
            cxs = []
            for t in range(part.shape[0]):
                yy, xt = np.where(part[t])
                cxs.append(xt.mean() if len(xt) else np.nan)
            cxs = np.array(cxs)
            # best loop: compare the silhouette of frame t with frame t+L
            best = None
            for L in range(10, 49):
                diffs = []
                for t in range(0, part.shape[0] - L, 2):
                    diffs.append(np.abs(part[t].astype(np.int8) - part[t + L].astype(np.int8)).sum())
                d = float(np.mean(diffs)) if diffs else 1e9
                if best is None or d < best[0]:
                    best = (d, L)
            print(f'cell r{r}c{c} {side:5s} bbox x{xx.min() + x0 + a}-{xx.max() + x0 + a} y{ys.min() + y0}-{ys.max() + y0}'
                  f'  cx drift {np.nanmax(cxs) - np.nanmin(cxs):.1f}px  loop {best[1]} (err {best[0]:.0f})')
