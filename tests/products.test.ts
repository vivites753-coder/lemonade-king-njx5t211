import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { Game } from '../src/sim/game';
import { cook } from './bot';

function freshGame(seed = 13): Game {
  const g = new Game(seed);
  g.newGame({ ageMode: 'pro', avatar: 'girl', lang: 'uk', seed });
  return g;
}

/** Morning → market with cookies → kitchen → the stand, then a whole day of serving. */
function dayWithCookies(g: Game, cookiePrice: number): void {
  g.debugAddCoins(300);
  g.D.coinsStart = g.S.coins; // a test top-up, not income
  g.S.bestRep = 2;
  g.goMarket();
  g.addPitcherKit();
  g.addPitcherKit();
  g.addPitcherKit();
  g.setCart('cookies', 3);
  g.pay();
  cook(g, 3);
  g.setCookiePrice(cookiePrice);
  g.startSelling();
  g.setSpeed(4);
  for (let i = 0; i < 100000 && g.phase === 'sell'; i++) {
    g.update(0.05);
    if (!g.serving && !g.making) g.serve();
  }
}

describe('cookies', () => {
  it('can be bought only from reputation 2', () => {
    const g = freshGame();
    g.goMarket();
    expect(g.goodAvailable('cookies')).toBe(false);
    g.setCart('cookies', 2);
    expect(g.cart.cookies).toBe(0);
    g.S.bestRep = 2;
    g.setCart('cookies', 2);
    g.pay();
    expect(g.S.stock.cookies).toBe(20);
  });

  it('customers take cookies with their lemonade, and the money adds up', () => {
    const g = freshGame();
    dayWithCookies(g, 4);
    const r = g.D.report!;
    expect(r.cookiesSold).toBeGreaterThan(0);
    expect(r.cookieSales).toBe(r.cookiesSold * 4);
    expect(r.sales).toBeGreaterThan(r.cookieSales);
    expect(g.S.stock.cookies).toBe(30 - r.cookiesSold);
    expect(g.S.coins - g.D.coinsStart).toBe(r.profit);
  });

  it('nobody buys cookies that are far too expensive', () => {
    const g = freshGame();
    dayWithCookies(g, 20);
    expect(g.D.report!.cookiesSold).toBe(0);
  });
});

describe('TV with cartoons', () => {
  it('makes the queue longer and people more patient', () => {
    const g = freshGame();
    expect(g.maxQueue()).toBe(CONFIG.MAX_QUEUE);
    g.S.upgrades.tv = true;
    g.S.condition.tv = 100;
    expect(g.maxQueue()).toBe(CONFIG.MAX_QUEUE + 3);
    // a broken TV shows nothing
    g.S.broken.tv = true;
    expect(g.maxQueue()).toBe(CONFIG.MAX_QUEUE);
  });
});
