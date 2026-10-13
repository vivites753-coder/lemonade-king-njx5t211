"""Colour bleeding for cut-out sprites.

A PNG pixel that is fully transparent still stores an RGB value. When the browser shrinks a sprite (and it always does:
a 300 px picture is drawn about 80 px tall) it blends nearby pixels, and the RGB of the transparent ones leaks in as a
coloured outline (purple, when the background was magenta). So every pixel that is not solid gets the colour of the
nearest solid pixels, spread outward far enough (32 px) to cover the whole blur kernel.
"""
import numpy as np


def box_blur(a, r, passes=2):
    k = 2 * r + 1
    for _ in range(passes):
        for axis in (0, 1):
            pad = np.pad(a, [(r, r) if i == axis else (0, 0) for i in range(a.ndim)], mode='edge')
            c = np.cumsum(pad, axis=axis, dtype=np.float64)
            c = np.concatenate([np.zeros_like(np.take(c, [0], axis=axis)), c], axis=axis)
            a = (np.take(c, range(k, c.shape[axis]), axis=axis) - np.take(c, range(0, c.shape[axis] - k), axis=axis)) / k
    return a


def bleed(col, alpha, solid=0.96, radii=(2, 4, 8, 16, 32), fallback=(128, 128, 128)):
    """col: HxWx3 float, alpha: HxW in 0..1. Returns col where every pixel with alpha < solid takes the colour of the
    solid pixels around it."""
    known = (alpha >= solid).astype(np.float64)
    out = col * known[..., None]
    have = known.copy()
    for r in radii:
        num = box_blur(out * have[..., None], r)
        den = box_blur(have[..., None], r)[..., 0]
        fill = (have < 0.5) & (den > 0.004)
        if fill.any():
            out = np.where(fill[..., None], num / np.maximum(den, 1e-9)[..., None], out)
            have = np.where(fill, 1.0, have)
    out = np.where((have < 0.5)[..., None], np.array(fallback, dtype=np.float64), out)
    return np.where((alpha < solid)[..., None], out, col)
