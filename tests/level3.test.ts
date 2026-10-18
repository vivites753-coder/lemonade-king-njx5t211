// Reputation levels 2 and 3: the prices and levels of the upgrades, online ads, the freezer and the ice in the lemonade.
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { UPGRADES } from '../src/data/upgrades';
import { WEATHER_IDS } from '../src/data/weather';
import { iceBonus, interestChance } from '../src/sim/economy';
import { Game } from '../src/sim/game';
import { cook } from './bot';

function freshGame(seed = 31): Game {
  const g = new Game(seed);
  g.newGame({ ageMode: 'pro', avatar: 'girl', lang: 'uk', seed });
  g.S.day = 5;
  g.debugAddCoins(500);
  return g;
}

/** In the kitchen with two pitcher kits bought. */
function inKitchen(g: Game, kits = 2): void {
  g.goMarket();
  for (let i = 0; i < kits; i++) g.addPitcherKit();
  g.pay();
}

const OWNED_ICE = (g: Game, trays = 2) => {
  g.S.upgrades.freezer = true;
  g.S.condition.freezer = 100;
  g.S.stock.ice = trays;
};

describe('levels and prices', () => {
  it('the neon wagon costs 3000 and the tent opens at reputation 2', () => {
    expect(UPGRADES.truck.price).toBe(3000);
    expect(UPGRADES.truck.minRep).toBe(3);
    expect(UPGRADES.big_stand.minRep).toBe(3);
    expect(UPGRADES.tent.minRep).toBe(2);
    expect(UPGRADES.freezer.minRep).toBe(2);
  });

  it('the tent can be bought at reputation 2 (with the umbrella), not at 1', () => {
    const g = freshGame();
    g.debugAddCoins(2000);
    g.S.upgrades.umbrella = true;
    g.S.bestRep = 1.5;
    expect(g.canBuy('tent').reason).toBe('rep');
    g.S.bestRep = 2;
    expect(g.canBuy('tent').ok).toBe(true);
  });
});

describe('online ads', () => {
  it('raise the stop chance by their share, on top of the flyers', () => {
    const base = { upgrades: {}, speakerOn: true, flyers: false, weather: 'sunny' as const, rep: 3, festival: false };
    const plain = interestChance(base);
    const ads = interestChance({ ...base, onlineAds: true });
    expect(ads.raw / plain.raw).toBeCloseTo((1 + CONFIG.ONLINE_ADS_ADS) / 1, 6);
    expect(ads.parts.some((p) => p.key === 'why.onlineAds' && p.value === CONFIG.ONLINE_ADS_ADS)).toBe(true);
    const both = interestChance({ ...base, flyers: true, onlineAds: true });
    expect(both.raw / plain.raw).toBeCloseTo(1 + CONFIG.FLYERS_ADS + CONFIG.ONLINE_ADS_ADS, 6);
  });

  it('open from reputation 3 and cost a fixed price a day', () => {
    const g = freshGame();
    g.S.bestRep = 2.5;
    inKitchen(g);
    cook(g, 1);
    expect(g.phase).toBe('prepare');
    g.setOnlineAds(true);
    expect(g.D.onlineAds).toBe(false);
    expect(g.onlineAdsOpen()).toBe(false);
    g.S.bestRep = 3;
    g.setOnlineAds(true);
    expect(g.D.onlineAds).toBe(true);
    const rent = g.openingCosts() - CONFIG.ONLINE_ADS_COST;
    const coins = g.S.coins;
    const before = g.calcInterest().raw;
    g.setOnlineAds(false);
    expect(g.calcInterest().raw).toBeLessThan(before);
    g.setOnlineAds(true);
    expect(g.startSelling()).toBe(true);
    expect(g.S.coins).toBe(coins - rent - CONFIG.ONLINE_ADS_COST);
    expect(g.D.expenses.onlineAds).toBe(CONFIG.ONLINE_ADS_COST);
    g.endDay();
    expect(g.D.report?.onlineAds).toBe(CONFIG.ONLINE_ADS_COST);
    expect(g.D.report?.expenses).toBeGreaterThanOrEqual(CONFIG.ONLINE_ADS_COST);
  });

  it('are off again the next day', () => {
    const g = freshGame();
    g.S.bestRep = 3;
    g.restDay();
    g.openShop();
    g.sleep();
    expect(g.D.onlineAds).toBe(false);
  });
});

describe('the freezer and the ice', () => {
  it('fills up every night (14 trays, what does not fit is thrown away), and a broken one makes none', () => {
    const g = freshGame();
    OWNED_ICE(g, 0);
    g.restDay();
    g.openShop();
    g.sleep();
    expect(CONFIG.FREEZER_ICE_MAX).toBe(14);
    expect(g.S.stock.ice).toBe(CONFIG.FREEZER_ICE_PER_NIGHT);
    // some of it used: the next morning the freezer is full again, never more
    g.S.stock.ice = 9;
    g.restDay();
    g.openShop();
    g.sleep();
    expect(g.S.stock.ice).toBe(CONFIG.FREEZER_ICE_MAX);
    for (let i = 0; i < 6; i++) {
      g.restDay();
      g.openShop();
      g.sleep();
    }
    expect(g.S.stock.ice).toBe(CONFIG.FREEZER_ICE_MAX);
    // a broken freezer: the ice melts and nothing is made
    g.S.broken.freezer = true;
    g.restDay();
    g.openShop();
    g.sleep();
    expect(g.S.stock.ice).toBe(0);
  });

  it('a jug takes one tray: it goes in last (no new mixing), and pours cold cups', () => {
    const g = freshGame();
    OWNED_ICE(g, 2);
    inKitchen(g);
    expect(g.kitchenCanAdd('ice')).toBe('ok');
    g.kitchenRepeat();
    g.kitchenMix('perfect');
    expect(g.kitchenAdd('ice')).toBe('ok');
    // ice does not need the jug to be mixed again
    expect(g.D.kitchen.mix).toBe('perfect');
    expect(g.D.kitchen.ice).toBe(1);
    expect(g.kitchenIceLeft()).toBe(1);
    expect(g.kitchenAdd('ice')).toBe('full');
    expect(g.kitchenPour()).toBe(true);
    expect(g.S.stock.ice).toBe(1);
    expect(g.D.coldCups).toBe(CONFIG.CUPS_PER_PITCHER);
    expect(g.D.cupsReady).toBe(CONFIG.CUPS_PER_PITCHER);
    expect(g.S.recipe.ice).toBe(1);
    // the recipe of the day has no ice: the quick pitcher would take it out of the freezer
    expect(g.D.recipeUsed.ice).toBeUndefined();
    // "like last time" puts the ice in again
    g.kitchenRepeat();
    expect(g.D.kitchen.ice).toBe(1);
    g.kitchenMix('perfect');
    expect(g.kitchenPour()).toBe(true);
    expect(g.S.stock.ice).toBe(0);
    expect(g.D.coldCups).toBe(2 * CONFIG.CUPS_PER_PITCHER);
    // no ice left: the next jug is warm
    g.kitchenRepeat();
    expect(g.D.kitchen.ice).toBe(0);
    expect(g.kitchenCanAdd('ice')).toBe('noStock');
  });

  it('a broken freezer gives no ice, and without a freezer there is none', () => {
    const g = freshGame();
    OWNED_ICE(g, 3);
    inKitchen(g);
    g.S.broken.freezer = true;
    expect(g.kitchenCanAdd('ice')).toBe('noStock');
    expect(g.kitchenAdd('ice')).toBe('noStock');
    delete g.S.broken.freezer;
    expect(g.kitchenCanAdd('ice')).toBe('ok');
    delete g.S.upgrades.freezer;
    expect(g.kitchenCanAdd('ice')).toBe('noStock');
  });

  it('an iced cup pleases more, most on a hot day and not at all in the cold', () => {
    for (const w of WEATHER_IDS) expect(iceBonus(w)).toBeGreaterThanOrEqual(0);
    expect(iceBonus('hot')).toBeGreaterThan(iceBonus('sunny'));
    expect(iceBonus('sunny')).toBeGreaterThan(iceBonus('rain'));
    expect(iceBonus('cold')).toBe(0);
    // indoors the weather matters less: the hot-day bonus shrinks, the cold-day one grows
    expect(iceBonus('hot', true)).toBeLessThan(iceBonus('hot'));
    expect(iceBonus('cold', true)).toBeGreaterThan(iceBonus('cold'));
  });

  it('the same day sold with ice earns more reputation than without', () => {
    const run = (ice: boolean) => {
      const g = freshGame(77);
      g.S.rep = 2;
      g.S.bestRep = 2;
      OWNED_ICE(g, ice ? 4 : 0);
      inKitchen(g, 3);
      // the same jugs; the iced ones are made in the kitchen
      for (let i = 0; i < 3 && g.phase === 'kitchen'; i++) {
        g.kitchenRepeat();
        if (ice) g.kitchenAdd('ice');
        if (!g.kitchenCanMix() || g.kitchenMaxPitchers() < 1) break;
        g.kitchenMix('perfect');
        g.kitchenPour();
      }
      g.leaveKitchen();
      g.D.weather = 'hot';
      expect(g.startSelling()).toBe(true);
      g.setSpeed(4);
      for (let i = 0; i < 100000 && g.phase === 'sell'; i++) {
        g.update(0.05);
        if (!g.serving && !g.making) g.serve();
      }
      return { rep: g.S.rep, coldSold: g.D.report?.coldSold ?? 0, sold: g.D.report?.sold ?? 0 };
    };
    const plain = run(false);
    const iced = run(true);
    expect(plain.coldSold).toBe(0);
    expect(iced.coldSold).toBeGreaterThan(0);
    // the same customers, the same cups: only the ice differs
    expect(iced.sold).toBe(plain.sold);
    expect(iced.rep).toBeGreaterThan(plain.rep);
  });

  it('the iced cups are some of the ready ones: lemonade that was lost cannot stay iced', () => {
    const g = freshGame();
    inKitchen(g, 1);
    // ten iced cups were ready, but three are left (the rest was lost or sold)
    g.D.cupsReady = 3;
    g.D.coldCups = 10;
    g.kitchenRepeat();
    g.kitchenMix('perfect');
    expect(g.kitchenPour()).toBe(true);
    // a jug without ice: only the three that are left are iced
    expect(g.D.cupsReady).toBe(3 + CONFIG.CUPS_PER_PITCHER);
    expect(g.D.coldCups).toBe(3);
  });
});
