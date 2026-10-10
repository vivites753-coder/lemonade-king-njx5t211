import { describe, expect, it } from 'vitest';
import { runBot } from './bot';

describe('balance (headless bot)', () => {
  it('a sensible player finishes stage 1 in 6–20 days', () => {
    const results = [1, 2, 3, 4, 5, 6].map((seed) => ({ seed, ...runBot(seed, 30) }));
    for (const r of results) {
      // eslint-disable-next-line no-console
      console.log(
        `seed ${r.seed}: reached=${r.reached} day=${r.days} coins=${r.coins} rep=${r.rep.toFixed(2)} | ` +
          r.log.map((d) => `${d.day}:${d.loc[0]}${d.weather[0]}${d.profit >= 0 ? '+' : ''}${d.profit}`).join(' '),
      );
    }
    for (const r of results) {
      expect(r.reached).toBe(true);
      expect(r.days).toBeGreaterThanOrEqual(6);
      expect(r.days).toBeLessThanOrEqual(20);
    }
  });
});
