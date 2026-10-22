import { describe, expect, it } from 'vitest';
import { ROOM_D } from '../src/data/storeRoom';
import { drawKey, ROAD, storeKey, STORE_WALLS } from '../src/render/depth';
import { STORE_PIECES } from '../src/render/proc/store';

describe('the order of drawing on a street with cars', () => {
  it('a car in the near lane is always drawn after one in the far lane, whatever their places along the road', () => {
    for (let i = 0; i < 400; i++) {
      const far = Math.random() * 16 - 2;
      const near = Math.random() * 16 - 2;
      expect(drawKey(near + 7.5, 7.5, true)).toBeGreaterThan(drawKey(far + 6.5, 6.5, true));
    }
  });

  it('people behind the road come before the cars, people in front of it after them', () => {
    for (let i = 0; i < 400; i++) {
      const car = drawKey(Math.random() * 12 + 6.5, 6.5, true);
      expect(drawKey(Math.random() * 12 + 5.5, 5.5, true)).toBeLessThan(car);
      expect(drawKey(Math.random() * 12 + 8.5, 8.5, true)).toBeGreaterThan(car);
    }
  });

  it('the order is a real order (the same as the depth where there is no road)', () => {
    // a sort by these keys can never go round in a circle, unlike the old comparison of cars by their lanes
    const things = Array.from({ length: 300 }, () => {
      const y = Math.random() * 12;
      return { y, d: Math.random() * 12 + y };
    });
    const keys = things.map((t) => drawKey(t.d, t.y, true));
    const sorted = [...keys].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i]).toBeGreaterThanOrEqual(sorted[i - 1]);
    for (const t of things) expect(drawKey(t.d, t.y, false)).toBe(t.d);
    expect(ROAD.y0).toBeLessThan(ROAD.y1);
  });
});

describe('the order of drawing at the own store', () => {
  const wallKeys = STORE_PIECES.map((s) => STORE_WALLS + s.cx + s.cy);

  it('people walking along the low walls outside are drawn over every piece of them, wherever they are', () => {
    for (const road of [false, true]) {
      for (let i = 0; i < 400; i++) {
        // the pavement right in front of the front wall, and the corner by the side wall
        const x = Math.random() * 14 - 1;
        const y = ROOM_D + 0.01 + Math.random() * 0.9;
        const k = storeKey(x + y, y, road);
        for (const w of wallKeys) expect(k).toBeGreaterThan(w);
      }
    }
  });

  it('everything in the room comes before the walls (they hide its lower part)', () => {
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * 12;
      const y = Math.random() * (ROOM_D - 0.01);
      const k = storeKey(x + y, y, true);
      for (const w of wallKeys) expect(k).toBeLessThan(w);
    }
  });

  it('outside, the road keeps its layers', () => {
    expect(storeKey(9, 6.5, true)).toBeGreaterThan(storeKey(20, 5.5, true));
    expect(storeKey(9, 8.5, true)).toBeGreaterThan(storeKey(20, 7.5, true));
  });
});
