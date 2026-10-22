import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { Game } from '../src/sim/game';
import { cook } from './bot';

function standGame(o: { up: 'big_stand' | 'truck' | null; rep: number; seed?: number }): Game {
  const g = new Game(o.seed ?? 17);
  g.newGame({ ageMode: 'pro', avatar: 'boy', lang: 'uk', seed: o.seed ?? 17 });
  g.S.day = 10;
  g.S.rep = o.rep;
  g.S.bestRep = o.rep;
  if (o.up) g.S.upgrades[o.up] = true;
  g.debugAddCoins(500);
  g.D.coinsStart = g.S.coins;
  g.chooseLocation('park');
  g.goMarket();
  for (let i = 0; i < 4; i++) g.addPitcherKit();
  g.pay();
  cook(g, 4);
  return g;
}

function runDay(g: Game, playerServes: boolean): { q2: number; maxQ1: number; maxQ2: number } {
  g.setSpeed(4);
  let q2 = 0;
  let maxQ1 = 0;
  let maxQ2 = 0;
  for (let i = 0; i < 100000 && g.phase === 'sell'; i++) {
    g.update(0.05);
    maxQ1 = Math.max(maxQ1, g.street.queue.length);
    maxQ2 = Math.max(maxQ2, g.street.queue2.length);
    if (g.street.queue2.length) q2++;
    if (playerServes && !g.making) g.serve();
  }
  return { q2, maxQ1, maxQ2 };
}

describe('stands with two counters', () => {
  it('helpers: one from reputation 2, two only at a wide stand from reputation 3', () => {
    expect(standGame({ up: null, rep: 1 }).helperCap()).toBe(0);
    expect(standGame({ up: null, rep: 3 }).helperCap()).toBe(1);
    expect(standGame({ up: 'big_stand', rep: 2 }).helperCap()).toBe(1);
    expect(standGame({ up: 'big_stand', rep: 3 }).helperCap()).toBe(2);
    const g = standGame({ up: 'truck', rep: 3 });
    expect(g.counters()).toBe(2);
    g.setHelpers(5);
    expect(g.D.helpers).toBe(2);
  });

  it('people use both queues; one helper serves the second one by himself', () => {
    const g = standGame({ up: 'big_stand', rep: 2, seed: 4 });
    g.setHelpers(1);
    expect(g.autoCounter(0)).toBe(false);
    expect(g.autoCounter(1)).toBe(true);
    const coins = g.S.coins;
    g.startSelling();
    expect(g.S.coins).toBe(coins - CONFIG.HELPER_WAGE - 20); // park rent 20
    // the player does nothing: only the second queue moves
    const r = runDay(g, false);
    expect(r.q2).toBeGreaterThan(0);
    expect(g.D.report!.sold).toBeGreaterThan(3);
    expect(g.S.coins - g.D.coinsStart).toBe(g.D.report!.profit);
  });

  it('two helpers serve both queues without the player', () => {
    const g = standGame({ up: 'truck', rep: 3, seed: 6 });
    g.setHelpers(2);
    expect(g.autoCounter(0) && g.autoCounter(1)).toBe(true);
    g.startSelling();
    expect(g.D.expenses.wages).toBe(2 * CONFIG.HELPER_WAGE);
    runDay(g, false);
    expect(g.D.report!.sold).toBeGreaterThan(8);
  });

  it('a seller alone keeps one queue even at the big stand, and it stays within its length', () => {
    const g = standGame({ up: 'big_stand', rep: 2, seed: 9 });
    expect(g.queues()).toBe(1);
    g.startSelling();
    const r = runDay(g, true);
    expect(r.maxQ2).toBe(0);
    expect(r.maxQ1).toBeLessThanOrEqual(g.maxQueue());
    expect(g.D.report!.sold).toBeGreaterThan(5);
  });

  it("the player pours only at their own counter: the customers of a helper are the helper's", () => {
    // a wide stand with one helper: the player has the first counter, the helper the second
    const g = standGame({ up: 'big_stand', rep: 3, seed: 14 });
    g.setHelpers(1);
    g.startSelling();
    expect(g.playerCounters()).toEqual([0]);
    g.setSpeed(4);
    // somebody waits at the helper's counter only (the helper is held back meanwhile)
    let atHelper = false;
    for (let i = 0; i < 40000 && g.phase === 'sell'; i++) {
      g.update(0.05);
      g.servings[1] = null;
      if (g.street.frontReady(0)) g.street.leave(g.street.frontReady(0)!, null);
      if (g.street.frontReady(1) && !g.street.frontReady(0) && !g.making) {
        atHelper = true;
        break;
      }
    }
    expect(atHelper).toBe(true);
    expect(g.serve()).toBe('noCustomer');
    expect(g.pourStart()).toBe('noCustomer');
    expect(g.servings[0]).toBeNull();
  });

  it('with helpers at every counter the player has no counter to pour at', () => {
    // one counter and one helper, a wide stand and two helpers
    const one = standGame({ up: null, rep: 3, seed: 15 });
    one.setHelpers(1);
    one.startSelling();
    expect(one.playerCounters()).toEqual([]);
    const two = standGame({ up: 'truck', rep: 3, seed: 16 });
    two.setHelpers(2);
    two.startSelling();
    expect(two.playerCounters()).toEqual([]);
    // the helpers serve; the player's taps do nothing
    for (const g of [one, two]) {
      g.setSpeed(4);
      for (let i = 0; i < 4000 && g.phase === 'sell'; i++) {
        g.update(0.05);
        // ('no' once the day is over)
        expect(['noCustomer', 'making', 'noCups', 'no']).toContain(g.serve());
      }
      expect(g.D.funnel.sold).toBeGreaterThan(0);
      expect(g.servings.every((s) => !s || s.helper)).toBe(true);
    }
    // alone at a wide stand the player has both counters
    const alone = standGame({ up: 'big_stand', rep: 3, seed: 17 });
    alone.startSelling();
    expect(alone.playerCounters()).toEqual([0, 1]);
  });

  it('the last cup cannot be poured at both counters at once', () => {
    const g = standGame({ up: 'big_stand', rep: 3, seed: 12 });
    g.setHelpers(1);
    g.startSelling();
    g.setSpeed(4);
    // nobody finishes a pour for a while (every pour is called off): the customers line up at both counters
    let ok = false;
    for (let i = 0; i < 40000 && g.phase === 'sell'; i++) {
      g.update(0.05);
      g.servings[0] = null;
      g.servings[1] = null;
      if (g.street.frontReady(0) && g.street.frontReady(1) && !g.making) {
        ok = true;
        break;
      }
    }
    expect(ok).toBe(true);
    g.D.cupsReady = 1;
    expect(g.serveAt(0, false)).toBe('ok');
    expect(g.serveAt(1, true)).toBe('noCups');
    for (let i = 0; i < 400; i++) g.update(0.05);
    expect(g.D.cupsReady).toBeGreaterThanOrEqual(0);
  });
});
