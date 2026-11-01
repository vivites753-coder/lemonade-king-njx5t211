// How fast a good player reaches the reputation levels: tests/repBot.ts plays eight games and notes the day every level
// opened. `npx vitest run tests/repSpeed.test.ts --silent=false` prints the table; the bounds make a change of the
// balance that makes the levels much faster or much slower noticed.
import { describe, expect, it } from 'vitest';
import { LEVELS, runForRep } from './repBot';

describe('reputation pace (headless player)', () => {
  it('a good player opens reputation level 4 in some weeks of game days, not in days and not in half a year', { timeout: 300_000 }, () => {
    const runs = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => runForRep(seed, 160));
    const cell = (d: number | null) => (d === null ? '—' : String(d)).padStart(7);
    const lines = ['game  level 2  level 3  level 4  level 5   cups sold, customers who left angry'];
    for (const r of runs) lines.push(`${String(r.seed).padStart(4)} ${LEVELS.map((l) => cell(r.day[l])).join('  ')}   ${r.sold}, ${r.angry}`);
    for (const l of LEVELS) {
      const ds = runs.map((r) => r.day[l]).filter((d): d is number => d !== null);
      lines.push(ds.length ? `level ${l}: day ${Math.min(...ds)}–${Math.max(...ds)}, ${(ds.reduce((a, b) => a + b, 0) / ds.length).toFixed(0)} on average` : `level ${l}: not reached`);
    }
    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));
    for (const r of runs) {
      expect(r.day[2]).not.toBeNull();
      expect(r.day[2]!).toBeGreaterThanOrEqual(10);
      expect(r.day[4]).not.toBeNull();
      expect(r.day[4]!).toBeLessThanOrEqual(140);
    }
  });
});
