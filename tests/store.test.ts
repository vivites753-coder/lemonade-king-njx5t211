// Level 4, stage A: the own store (rented premises with a counter instead of the stand).
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { LOCATIONS, storeSetupCost } from '../src/data/locations';
import { breakEvenCups, costPerCup, storeTax } from '../src/sim/economy';
import { Game } from '../src/sim/game';
import { freePlaces } from '../src/sim/points';
import { cook } from './bot';

/** A player of level 4 on a morning, with the money for a store. */
function level4(seed = 21, coins = 6000): Game {
  const g = new Game(seed);
  g.newGame({ ageMode: 'pro', avatar: 'boy', lang: 'uk', seed });
  g.S.day = 6;
  g.S.rep = 4.1;
  g.S.bestRep = 4.1;
  g.S.coins = coins;
  g.S.noTips = true;
  return g;
}

/** Buys and makes `jugs` pitchers, then opens at the place chosen. */
function toSelling(g: Game, jugs = 4, price?: number): void {
  expect(g.goMarket()).toBe(true);
  for (let i = 0; i < jugs; i++) g.addPitcherKit();
  expect(g.pay()).toBe(true);
  cook(g, jugs);
  expect(g.phase).toBe('prepare');
  g.setPrice(price ?? LOCATIONS[g.S.location].fairPrice);
  expect(g.startSelling()).toBe(true);
}

function sellAllDay(g: Game): void {
  g.setSpeed(4);
  for (let i = 0; i < 200000 && g.phase === 'sell'; i++) {
    g.update(0.05);
    if (!g.serving && !g.making) g.serve();
  }
}

describe('the own store (level 4)', () => {
  it('opens from the best reputation 4 and costs its renovation and equipment once', () => {
    const g = level4();
    g.S.bestRep = 3.9;
    g.S.rep = 3.9;
    expect(g.canOpenStore('townhall').reason).toBe('locked');
    expect(g.chooseLocation('townhall')).toBe(false);
    g.S.bestRep = 4;
    // not open yet: the place cannot be chosen
    const toasts: string[] = [];
    g.bus.on('toast', (e) => toasts.push(e.key));
    expect(g.chooseLocation('townhall')).toBe(false);
    expect(toasts).toContain('toast.storeClosed');
    const cards: string[] = [];
    g.bus.on('card', (c) => cards.push(c.id));
    const coins = g.S.coins;
    expect(storeSetupCost('townhall')).toBe(5000);
    expect(g.openStore('townhall')).toBe(true);
    expect(g.S.coins).toBe(coins - 5000);
    expect(g.S.location).toBe('townhall');
    expect(g.S.stores.townhall).toEqual({ opened: 6, invested: 5000, earned: 0, days: 0 });
    expect(cards).toContain('storeOpened');
    // once is enough
    expect(g.openStore('townhall')).toBe(false);
    expect(g.S.coins).toBe(coins - 5000);
    g.restDay();
    g.openShop();
    g.sleep();
    expect(g.chooseLocation('townhall')).toBe(true);
    expect(g.S.coins).toBe(coins - 5000);
  });

  it('without the money nothing is paid', () => {
    const g = level4(22, storeSetupCost('parkside') - 1);
    const toasts: string[] = [];
    g.bus.on('toast', (e) => toasts.push(e.key));
    expect(g.openStore('parkside')).toBe(false);
    expect(toasts).toContain('toast.storeNoMoney');
    expect(g.S.coins).toBe(storeSetupCost('parkside') - 1);
    expect(g.S.stores.parkside).toBeUndefined();
  });

  it('a day there: rent and utilities when it opens, the tax on the profit in the evening, the payback grows', () => {
    const g = level4(23, 9000);
    expect(g.openStore('townhall')).toBe(true);
    const before = g.S.coins;
    // the costs of the day before opening include the utilities
    toSelling(g, 5);
    const loc = LOCATIONS.townhall;
    expect(g.D.expenses.rent).toBe(loc.rent);
    expect(g.D.expenses.utilities).toBe(loc.store!.utilities);
    sellAllDay(g);
    const r = g.D.report!;
    expect(r.sold).toBeGreaterThan(20);
    const st = r.store!;
    expect(st).toBeTruthy();
    // the tax is 10 % of the profit of the day (the takings minus the costs), not of the takings
    expect(st.taxBase).toBe(r.sales - (r.expenses - r.tax!));
    expect(st.taxBase).toBeGreaterThan(0);
    expect(r.tax).toBe(Math.round(st.taxBase * CONFIG.STORE_TAX));
    expect(r.tax).toBeLessThan(Math.round(r.sales * CONFIG.STORE_TAX));
    expect(r.utilities).toBe(loc.store!.utilities);
    // the report adds up, and the coins changed by the profit
    expect(r.profit).toBe(r.income - r.expenses);
    expect(g.S.coins - before).toBe(r.profit);
    expect(g.S.stores.townhall!.earned).toBe(st.taxBase - st.tax);
    expect(g.S.stores.townhall!.days).toBe(1);
    // the cups that pay the costs of the day that do not depend on the cups
    expect(st.fixed).toBe(loc.rent + loc.store!.utilities);
    expect(st.breakEven).toBe(breakEvenCups(st.fixed, g.S.price, costPerCup(g.D.recipeUsed, g.active())));
  });

  it('a loss pays no tax, and the lesson counts the cups that would have paid the costs', () => {
    const g = level4(24, 9000);
    expect(g.openStore('parkside')).toBe(true);
    // far too dear: nobody buys
    toSelling(g, 1, CONFIG.PRICE_MAX);
    sellAllDay(g);
    const r = g.D.report!;
    expect(r.profit).toBeLessThan(0);
    expect(r.tax).toBe(0);
    expect(r.store!.tax).toBe(0);
    expect(g.S.stores.parkside!.earned).toBeLessThan(0);
    expect(r.lesson.key).toBe('lesson.storeBreakEven');
  });

  it('the parts of the stand stay at home; the counter has two places, the shop window brings people', () => {
    const g = level4(25, 9000);
    for (const id of ['umbrella', 'tent', 'big_stand', 'truck', 'dispenser', 'sign'] as const) g.S.upgrades[id] = true;
    expect(g.active().truck).toBe(true);
    expect(g.openStore('townhall')).toBe(true);
    const up = g.active();
    expect(up.truck).toBeUndefined();
    expect(up.big_stand).toBeUndefined();
    expect(up.umbrella).toBeUndefined();
    expect(up.tent).toBeUndefined();
    expect(up.dispenser).toBe(true);
    expect(up.sign).toBe(true);
    expect(g.counters()).toBe(2);
    expect(g.calcInterest().parts.some((p) => p.key === 'why.store')).toBe(true);
    // without the store: one counter and no shop window
    g.S.upgrades = {};
    g.S.stores = {};
    g.S.location = 'park';
    expect(g.counters()).toBe(1);
    expect(g.calcInterest().parts.some((p) => p.key === 'why.store')).toBe(false);
  });

  it('the cold display keeps the lemonade that is left until tomorrow', () => {
    const g = level4(26, 9000);
    expect(g.openStore('parkside')).toBe(true);
    toSelling(g, 2);
    g.D.cupsReady += 40;
    g.endDay();
    expect(g.D.report!.carriedCups).toBeGreaterThan(0);
    expect(g.S.carryCups).toBe(g.D.report!.carriedCups);
  });

  it('no stand of the network can stand at a store place', () => {
    const g = level4(27);
    g.S.bestRep = 5;
    expect(freePlaces(g.S)).not.toContain('townhall');
    expect(freePlaces(g.S)).not.toContain('parkside');
    expect(freePlaces(g.S)).toContain('mall');
  });

  it('an old save gets no stores and no utilities or tax', () => {
    const g = level4(28);
    const snap = JSON.parse(JSON.stringify(g.snapshot()));
    delete snap.S.stores;
    delete snap.D.expenses.utilities;
    delete snap.D.expenses.tax;
    const g2 = new Game(1);
    g2.restore(snap);
    expect(g2.S.stores).toEqual({});
    expect(g2.D.expenses.utilities).toBe(0);
    expect(g2.D.expenses.tax).toBe(0);
  });
});

describe('the numbers of a business', () => {
  it('the break-even: the costs of the day over what one cup brings', () => {
    expect(breakEvenCups(100, 10, 3)).toBe(15);
    expect(breakEvenCups(70, 10, 3)).toBe(10);
    expect(breakEvenCups(0, 10, 3)).toBe(0);
    expect(breakEvenCups(50, 3, 3)).toBeNull();
    expect(breakEvenCups(50, 2, 3)).toBeNull();
  });

  it('the tax: a share of the profit, nothing on a loss', () => {
    expect(storeTax(500)).toBe(50);
    expect(storeTax(105)).toBe(11);
    expect(storeTax(0)).toBe(0);
    expect(storeTax(-200)).toBe(0);
  });

  it('a store pays back its opening in about two weeks of good days (a player of level 4)', () => {
    for (const loc of ['townhall', 'parkside'] as const) {
      let earned = 0;
      for (const seed of [41, 42, 43]) {
        const g = level4(seed, 9000);
        // what a player of level 4 usually has: a scooter, advertising, the dispenser, the TV, two helpers
        for (const id of ['sign', 'banner', 'speaker', 'dispenser', 'tv', 'loyalty', 'scooter', 'juicer_hand', 'mixer_pro'] as const) {
          g.S.upgrades[id] = true;
          if (id === 'speaker' || id === 'dispenser' || id === 'tv' || id === 'scooter' || id === 'juicer_hand') g.S.condition[id] = 100;
        }
        expect(g.openStore(loc)).toBe(true);
        g.D.weather = 'sunny';
        g.D.events.busy = {};
        expect(g.goMarket()).toBe(true);
        // about what sells there in a day (what is left waits in the cold display for tomorrow)
        const jugs = loc === 'townhall' ? 9 : 7;
        for (let i = 0; i < jugs; i++) g.addPitcherKit();
        expect(g.pay()).toBe(true);
        cook(g, jugs);
        g.setPrice(LOCATIONS[loc].fairPrice);
        g.setHelpers(2);
        expect(g.startSelling()).toBe(true);
        sellAllDay(g);
        earned += g.D.report!.store!.earned;
      }
      const perDay = earned / 3;
      expect(perDay, loc).toBeGreaterThan(150);
      expect(storeSetupCost(loc) / perDay, loc).toBeLessThan(20);
    }
  });
});
