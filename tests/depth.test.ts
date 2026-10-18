import { describe, expect, it } from 'vitest';
import { drawKey, ROAD } from '../src/render/depth';

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
