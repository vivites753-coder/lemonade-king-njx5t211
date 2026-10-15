import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { Game } from '../src/sim/game';
import { cook } from './bot';

/** Selling, with a customer at the counter. */
function sellingWithCustomer(seed = 7): Game {
  const g = new Game(seed);
  g.newGame({ ageMode: 'pro', avatar: 'girl', lang: 'uk', seed });
  g.debugAddCoins(200);
  g.goMarket();
  g.addPitcherKit();
  g.addPitcherKit();
  g.pay();
  cook(g, 2);
  g.startSelling();
  g.setSpeed(4);
  for (let i = 0; i < 40000 && !g.street.frontReady(0); i++) g.update(0.05);
  return g;
}

describe('the pouring mini-game', () => {
  it('a cup let go in the green zone is sold', () => {
    const g = sellingWithCustomer();
    expect(g.street.frontReady(0)).not.toBeNull();
    const cups = g.D.cupsReady;
    const sold = g.D.funnel.sold;
    expect(g.pourStart()).toBe('ok');
    const [lo, hi] = g.pourZone();
    expect(g.pourEnd((lo + hi) / 2)).toBe('perfect');
    expect(g.D.cupsReady).toBe(cups - 1);
    expect(g.D.funnel.sold).toBe(sold + 1);
  });

  it('an overflowing cup is lost, nothing is paid and the customer keeps waiting', () => {
    const g = sellingWithCustomer();
    const p = g.street.frontReady(0);
    const cups = g.D.cupsReady;
    const coins = g.S.coins;
    expect(g.pourStart()).toBe('ok');
    expect(g.pourEnd(1)).toBe('over');
    expect(g.D.cupsReady).toBe(cups - 1);
    expect(g.S.coins).toBe(coins);
    expect(g.street.frontReady(0)).toBe(p);
  });

  it('a very short press pours nothing; a cup not full is still sold', () => {
    const g = sellingWithCustomer();
    const cups = g.D.cupsReady;
    expect(g.pourStart()).toBe('ok');
    expect(g.pourEnd(CONFIG.POUR_MIN / 2)).toBe('cancel');
    expect(g.D.cupsReady).toBe(cups);
    expect(g.pourStart()).toBe('ok');
    expect(g.pourEnd(g.pourZone()[0] - 0.05)).toBe('under');
    expect(g.D.cupsReady).toBe(cups - 1);
  });

  it('the cup fills only while the button is held: time alone does not finish it', () => {
    const g = sellingWithCustomer();
    expect(g.pourStart()).toBe('ok');
    for (let i = 0; i < 100; i++) g.update(0.05);
    expect(g.pouringAt()).toBe(0);
    expect(g.pourStart()).toBe('busy');
  });

  it('the stream speed differs a little from cup to cup', () => {
    const g = sellingWithCustomer();
    const rates = new Set<number>();
    for (let i = 0; i < 5; i++) {
      g.pourStart();
      rates.add(g.servings[g.pouringAt()]!.pour!.rate);
      g.pourEnd(0);
    }
    expect(rates.size).toBeGreaterThan(1);
    for (const r of rates) expect(Math.abs(r * CONFIG.POUR_TIME - 1)).toBeLessThanOrEqual(CONFIG.POUR_VARY + 1e-9);
  });
});
