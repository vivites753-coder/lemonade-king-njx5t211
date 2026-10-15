"""Layout templates for the generated walls of the indoor places (station, mall): docs/art/wall_<place>_layout.png.

The walls are ordered as flat fronts (not isometric): the game bends them onto the two back walls of the hall.
One sheet 1536x1024 on magenta, two strips of 1536x416 (a wall is 384x104 world px, so 4 px per world px):
  top strip    = the LEFT wall (the entrance wall): its left end is the front corner, its right end the back corner;
  bottom strip = the RIGHT wall: its left end is the back corner, its right end the front corner.
Colours of the template (the prompt explains them to the generator):
  grey     wall to paint;
  magenta  see-through openings (doorways where people come in, windows): must stay pure #FF00FF;
  yellow   empty sign boards (the game writes the words on them in the player's language);
  white    clock face without hands (the game draws the hands);
  dark     the departures board, empty (the game writes the trains).
The positions are the ones of src/render/proc/indoor.ts (DOORS, the windows, the clock, the board).

Usage: python tools/make_wall_layouts.py
"""
import os

from PIL import Image, ImageDraw

K = 4  # px per world px
W, H = 1536, 1024
STRIP_H = 104 * K
TOP = (40, 40 + STRIP_H)  # y range of the left wall strip
BOT = (568, 568 + STRIP_H)  # y range of the right wall strip
MAGENTA = (255, 0, 255)
GREY = (200, 200, 200)
YELLOW = (255, 214, 0)
WHITE = (255, 255, 255)
DARK = (40, 40, 40)
LANES = (5.5, 8.5)
DOOR_W, DOOR_H = 58, 74
DOORS = [(12 - y) * 32 - DOOR_W / 2 for y in LANES]


def wy(strip, v):
    """World v (0 = floor, -104 = top of the wall) to sheet y."""
    return strip[1] + v * K


def rect(d, strip, u0, v0, u1, v1, fill):
    d.rectangle([u0 * K, wy(strip, v0), u1 * K, wy(strip, v1)], fill=fill)


def arched(d, strip, u, w, top_v, bottom_v, fill):
    """An opening with a round top (top_v is the top of the arch)."""
    r = w / 2
    d.rectangle([u * K, wy(strip, top_v + r), (u + w) * K, wy(strip, bottom_v)], fill=fill)
    d.ellipse([u * K, wy(strip, top_v), (u + w) * K, wy(strip, top_v + w)], fill=fill)


def sheet():
    im = Image.new('RGB', (W, H), MAGENTA)
    d = ImageDraw.Draw(im)
    for s in (TOP, BOT):
        d.rectangle([0, s[0], W - 1, s[1]], fill=GREY)
    return im, d


def station():
    im, d = sheet()
    # left wall: two arched doorways and three tall arched windows, the station name over the middle
    for u in DOORS:
        arched(d, TOP, u, DOOR_W, -DOOR_H, 0, MAGENTA)
    left_doors = sorted(DOORS)
    wins = [(12, 64), (left_doors[0] + DOOR_W + 8, left_doors[1] - (left_doors[0] + DOOR_W) - 16), (left_doors[1] + DOOR_W + 22, 72)]
    for u, w in wins:
        arched(d, TOP, u, w, -88, -12, MAGENTA)
    rect(d, TOP, 140, -103, 244, -91, YELLOW)
    # right wall: ticket offices with their sign, the clock, the departures board
    rect(d, BOT, 14, -96, 146, -80, YELLOW)
    for i in range(3):
        u = 20 + i * 42
        rect(d, BOT, u, -66, u + 36, -32, (170, 210, 240))
    d.ellipse([(196 - 15) * K, wy(BOT, -74 - 15), (196 + 15) * K, wy(BOT, -74 + 15)], fill=WHITE)
    rect(d, BOT, 232, -96, 370, -38, DARK)
    return im


def mall():
    im, d = sheet()
    # left wall: two wide glass doorways (straight tops), two windows, the mall sign
    left_doors = sorted(DOORS)
    for u in DOORS:
        rect(d, TOP, u, -DOOR_H, u + DOOR_W, 0, MAGENTA)
        rect(d, TOP, u + 6, -88, u + DOOR_W - 6, -77, YELLOW)
    rect(d, TOP, 10, -88, left_doors[0] - 6, -22, MAGENTA)
    rect(d, TOP, left_doors[0] + DOOR_W + 6, -88, left_doors[1] - 6, -22, MAGENTA)
    rect(d, TOP, 270, -100, 366, -26, YELLOW)
    # right wall: three shop fronts (toys, clothes, cafe), each with an empty sign over its glass front
    for u in (16, 138, 260):
        rect(d, BOT, u, -92, u + 108, -74, YELLOW)
        rect(d, BOT, u + 4, -72, u + 104, -7, (170, 210, 240))
    return im


if __name__ == '__main__':
    os.makedirs('docs/art', exist_ok=True)
    station().save('docs/art/wall_station_layout.png', optimize=True)
    mall().save('docs/art/wall_mall_layout.png', optimize=True)
    print('docs/art/wall_station_layout.png, docs/art/wall_mall_layout.png')
