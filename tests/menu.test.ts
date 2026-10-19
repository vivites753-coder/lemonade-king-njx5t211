// The menu of the own store (level 4): fresh orange juice, multifruit juice and pastries.
import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../src/data/locations';
import { EXTRAS, MENU } from '../src/data/menu';
import { Game } from '../src/sim/game';
import { shopPanel } from '../src/ui/panels/shop';
import { cook } from './bot';

/** A player of level 4 on a morning, with the money for a store. */
function level4(seed = 31, coins = 9000): Game {
  const g = new Game(seed);
  g.newGame({ ageMode: 'pro', avatar: 'girl', lang: 'uk', seed });
  g.S.day = 6;
  g.S.rep = 4.1;
  g.S.bestRep = 4.1;
  g.S.coins = coins;
  g.S.noTips = true;
  return g;
}

/** To the market: lemonade for `jugs` pitchers and the goods of the menu, then cooked and opened. */
function shopAndOpen(g: Game, jugs: number, menu: { orange?: number; juice?: number; pastry?: number; cups?: number }): void {
  expect(g.goMarket()).toBe(true);
  for (let i = 0; i < jugs; i++) g.addPitcherKit();
  for (const [id, n] of Object.entries(menu)) g.setCart(id as 'orange', g.cart[id as 'orange'] + (n ?? 0));
  expect(g.pay()).toBe(true);
  if (jugs > 0) cook(g, jugs);
  else g.leaveKitchen();
  expect(g.phase).toBe('prepare');
  g.setPrice(LOCATIONS[g.S.location].fairPrice);
  expect(g.startSelling()).toBe(true);
}

function sellAllDay(g: Game): void {
  g.setSpeed(4);
  for (let i = 0; i < 200000 && g.phase === 'sell'; i++) {
    g.update(0.05);
    if (!g.serving && !g.making) g.serve();
  }
}

describe('the menu of the own store', () => {
  it('opens with the best reputation 4 and a store of one\'s own', () => {
    const g = level4();
    expect(g.extrasOpen()).toBe(false);
    expect(g.goodAvailable('orange')).toBe(false);
    expect(g.goodAvailable('juice')).toBe(false);
    expect(g.goodAvailable('pastry')).toBe(false);
    expect(g.openStore('townhall')).toBe(true);
    expect(g.extrasOpen()).toBe(true);
    expect(g.extrasHere()).toBe(true);
    for (const id of ['orange', 'juice', 'pastry'] as const) expect(g.goodAvailable(id)).toBe(true);
  });

  it('in the store people buy fresh juice, multifruit juice and pastries; the stock goes down to match', () => {
    const g = level4(32);
    expect(g.openStore('townhall')).toBe(true);
    shopAndOpen(g, 4, { orange: 30, juice: 4, pastry: 3, cups: 4 });
    const before = { oranges: g.S.stock.oranges, juice: g.S.stock.juice, pastries: g.S.stock.pastries };
    expect(before).toEqual({ oranges: 30, juice: 20, pastries: 18 });
    sellAllDay(g);
    const D = g.D;
    expect(D.extraSold.orange).toBeGreaterThan(0);
    expect(D.extraSold.multifruit).toBeGreaterThan(0);
    expect(D.extraSold.pastry).toBeGreaterThan(0);
    // what was sold came out of the stock (pastries also go stale only overnight)
    expect(before.oranges - g.S.stock.oranges).toBeGreaterThanOrEqual(D.extraSold.orange * EXTRAS.orange.per);
    expect(before.juice - g.S.stock.juice).toBeGreaterThanOrEqual(D.extraSold.multifruit);
    expect(before.pastries - g.S.stock.pastries).toBe(D.extraSold.pastry);
    // the money: every product at its price, all in the sales of the day and in the report
    expect(D.extraSales.orange).toBe(D.extraSold.orange * g.S.extraPrices.orange);
    expect(D.extraSales.pastry).toBe(D.extraSold.pastry * g.S.extraPrices.pastry);
    const r = D.report!;
    expect(r.extras!.multifruit).toEqual({ sold: D.extraSold.multifruit, sales: D.extraSales.multifruit });
    expect(r.sales).toBeGreaterThan(r.cookieSales + D.extraSales.orange + D.extraSales.multifruit + D.extraSales.pastry);
  });

  it('at a stand outside the menu is not sold, even with the goods at home', () => {
    const g = level4(33);
    expect(g.openStore('parkside')).toBe(true);
    g.restDay();
    g.openShop();
    g.sleep();
    expect(g.chooseLocation('park')).toBe(true);
    expect(g.extrasHere()).toBe(false);
    shopAndOpen(g, 3, { orange: 20, juice: 2, pastry: 2 });
    sellAllDay(g);
    expect(g.D.extraSold).toEqual({ orange: 0, multifruit: 0, pastry: 0 });
    expect(g.D.funnel.sold).toBeGreaterThan(0);
  });

  it('without lemonade the store still sells its juices (it is not sold out)', () => {
    const g = level4(34);
    expect(g.openStore('townhall')).toBe(true);
    shopAndOpen(g, 0, { orange: 40, juice: 6, cups: 6 });
    expect(g.D.cupsReady).toBe(0);
    expect(g.isSoldOut()).toBe(false);
    sellAllDay(g);
    expect(g.D.extraSold.orange + g.D.extraSold.multifruit).toBeGreaterThan(10);
  });

  it('half of the pastries left go stale overnight', () => {
    const g = level4(35);
    expect(g.openStore('townhall')).toBe(true);
    g.S.stock.pastries = 10;
    g.restDay();
    g.openShop();
    g.sleep();
    expect(g.S.stock.pastries).toBe(10 - Math.round(10 * MENU.PASTRY_STALE));
  });

  it('a juice far over its fair price is chosen much more rarely', () => {
    const sold = (price: number) => {
      const g = level4(36);
      expect(g.openStore('townhall')).toBe(true);
      g.setExtraPrice('orange', price);
      shopAndOpen(g, 4, { orange: 60, cups: 4 });
      sellAllDay(g);
      return g.D.extraSold.orange;
    };
    const fair = Math.round(EXTRAS.orange.fair * LOCATIONS.townhall.fairPrice);
    expect(sold(fair * 2)).toBeLessThan(sold(fair) / 2);
  });

  it('an old save gets the menu: no goods and the usual prices', () => {
    const g = level4(37);
    const snap = JSON.parse(JSON.stringify(g.snapshot()));
    delete snap.S.extraPrices;
    delete snap.S.stock.oranges;
    delete snap.S.stock.juice;
    delete snap.S.stock.pastries;
    delete snap.D.extraSales;
    delete snap.D.extraSold;
    g.restore(snap);
    expect(g.S.stock.oranges).toBe(0);
    expect(g.S.stock.pastries).toBe(0);
    expect(g.S.extraPrices.orange).toBeGreaterThan(0);
    expect(g.D.extraSold.pastry).toBe(0);
  });

  it('on an evening in the store the shop does not offer the things of a stand', () => {
    const g = level4(38);
    g.restDay();
    g.openShop();
    expect(shopPanel.render(g, {} as never)).toContain('data-anchor="up:umbrella"');
    g.sleep();
    expect(g.openStore('townhall')).toBe(true);
    g.restDay();
    g.openShop();
    const html = shopPanel.render(g, {} as never);
    for (const id of ['umbrella', 'tent', 'big_stand', 'truck']) expect(html).not.toContain(`data-anchor="up:${id}"`);
    expect(html).toContain('data-anchor="up:store_ac"');
  });
});
