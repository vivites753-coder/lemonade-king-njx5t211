import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { addRep, repDelta, repLevel, repLevelCost } from '../src/sim/economy';
import { Game } from '../src/sim/game';

/** Happy cups (the best satisfaction, no upgrades) needed to go from `from` to `to`. */
function cupsBetween(from: number, to: number): number {
  const per = repDelta(1);
  let r = from;
  let n = 0;
  while (r < to - 1e-9 && n < 100000) {
    r = addRep(r, per);
    n++;
  }
  return n;
}

describe('reputation levels', () => {
  it('every level takes about 20 % more happy customers than the one before', () => {
    const cups = [1, 2, 3, 4].map((l) => cupsBetween(l, l + 1));
    for (let i = 1; i < cups.length; i++) {
      const k = cups[i] / cups[i - 1];
      expect(k).toBeGreaterThan(1.17);
      expect(k).toBeLessThan(1.23);
    }
    // and the first level is a real task: hundreds of happy customers, not a few days
    expect(cups[0]).toBeGreaterThan(300);
    expect(repLevelCost(4) / repLevelCost(1)).toBeCloseTo(CONFIG.REP_LEVEL_GROWTH ** 3, 6);
  });

  it('a change crosses whole levels and stays within 0..5', () => {
    // from the middle of level 1: half its bar, then the rest goes into the longer bar of level 2
    const r = addRep(1.5, 0.5 + 0.6);
    expect(r).toBeCloseTo(2 + 0.6 / CONFIG.REP_LEVEL_GROWTH, 9);
    // and back down the same way
    expect(addRep(r, -(0.5 + 0.6))).toBeCloseTo(1.5, 9);
    expect(addRep(4.9, 100)).toBe(5);
    expect(addRep(0.2, -100)).toBe(0);
    expect(addRep(3, 0)).toBe(3);
  });

  it('is shown as a whole level and the filled part of its bar', () => {
    expect(repLevel(2.999999)).toEqual({ level: 2, bar: expect.closeTo(1, 5) });
    expect(repLevel(3)).toEqual({ level: 3, bar: 0 });
    expect(repLevel(3.25)).toEqual({ level: 3, bar: 0.25 });
    expect(repLevel(5)).toEqual({ level: 5, bar: 1 });
  });

  it('a new whole level opens what it promises at once, while selling, and the report sums it up', () => {
    const g = new Game(3);
    g.newGame({ ageMode: 'pro', avatar: 'girl', lang: 'uk', seed: 3 });
    g.S.day = 5;
    g.S.rep = 1.999;
    g.chooseLocation('park');
    g.D.cupsReady = 20;
    g.S.stock.cups = 30;
    (g as unknown as { setPhase(p: string): void }).setPhase('prepare');
    expect(g.startSelling()).toBe(true);
    const toasts: string[] = [];
    g.bus.on('toast', (e) => toasts.push(e.key));
    // one happy customer is enough to reach level 2: the beach is open at once, not in the evening
    (g as unknown as { changeRep(d: number): void }).changeRep(repDelta(1));
    expect(g.S.rep).toBeGreaterThanOrEqual(2);
    expect(g.S.bestRep).toBe(g.S.rep);
    expect(g.unlocked('beach')).toBe(true);
    expect(toasts).toContain('toast.repLevel');
    g.endDay();
    expect(g.D.report?.unlocked).toEqual(['beach', 'station']);
  });
});
