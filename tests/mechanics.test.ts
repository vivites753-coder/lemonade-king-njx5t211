import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { interestChance } from '../src/sim/economy';
import { Game } from '../src/sim/game';
import { lemonsTotal } from '../src/sim/state';
import { cook, playDay } from './bot';

function freshGame(seed = 21): Game {
  const g = new Game(seed);
  g.newGame({ ageMode: 'pro', avatar: 'girl', lang: 'uk', seed });
  return g;
}

/** Morning → market (2 pitcher kits) → kitchen. */
function toKitchen(g: Game, kits = 2): void {
  g.goMarket();
  for (let i = 0; i < kits; i++) g.addPitcherKit();
  g.pay();
}

function sellWholeDay(g: Game, serve = true): void {
  g.setSpeed(4);
  for (let i = 0; i < 100000 && g.phase === 'sell'; i++) {
    g.update(0.05);
    if (serve && !g.serving && !g.making) {
      if (g.D.cupsReady === 0 && g.canMakePitcher()) g.makePitcher();
      else g.serve();
    }
  }
}

describe('kitchen mini-game', () => {
  it('builds the recipe from what goes into the jug and needs mixing', () => {
    const g = freshGame();
    toKitchen(g);
    expect(g.phase).toBe('kitchen');
    for (let i = 0; i < 3; i++) expect(g.kitchenAdd('lemon')).toBe('ok');
    expect(g.kitchenAdd('water')).toBe('ok');
    expect(g.kitchenCanMix()).toBe(false); // needs 2 bottles
    expect(g.kitchenAdd('water')).toBe('ok');
    expect(g.kitchenAdd('water')).toBe('full');
    g.kitchenAdd('sugar');
    expect(g.kitchenPour()).toBe(false); // not mixed yet
    g.kitchenMix('under');
    g.kitchenAdd('sugar'); // adding after mixing → mix again
    expect(g.D.kitchen.mix).toBe('none');
    g.kitchenMix('perfect');
    const hour = g.D.hour;
    const lemons = lemonsTotal(g.S.stock);
    expect(g.kitchenPour()).toBe(true);
    expect(g.S.recipe).toEqual({ lemons: 3, sugar: 2 });
    expect(g.D.cupsReady).toBe(10);
    expect(lemonsTotal(g.S.stock)).toBe(lemons - 3);
    expect(g.D.hour).toBeCloseTo(hour + CONFIG.KITCHEN_BASE_H + CONFIG.KITCHEN_PER_PITCHER_H, 6);
    // the jug is empty again: the next pitcher is made from scratch
    expect(g.phase).toBe('kitchen');
    expect(g.D.kitchen.juice).toBe(0);
    expect(g.kitchenPour()).toBe(false);
    g.kitchenRepeat();
    g.kitchenMix('perfect');
    expect(g.kitchenPour()).toBe(true);
    expect(g.D.cupsReady).toBe(20);
    expect(g.D.hour).toBeCloseTo(hour + CONFIG.KITCHEN_BASE_H + 2 * CONFIG.KITCHEN_PER_PITCHER_H, 6);
    g.leaveKitchen();
    expect(g.phase).toBe('prepare');
  });

  it('shows what is left on the shelf while the jug fills up', () => {
    const g = freshGame();
    toKitchen(g, 1);
    const lemons = lemonsTotal(g.S.stock);
    g.kitchenAdd('lemon');
    g.kitchenAdd('lemon');
    // nothing is used up until pouring, but the shelf count must go down (see the kitchen panel)
    expect(lemonsTotal(g.S.stock)).toBe(lemons);
    expect(g.kitchenCanAdd('lemon')).toBe('ok');
  });

  it('cannot put in more lemons than there are', () => {
    const g = freshGame();
    g.goMarket();
    g.setCart('lemon', 2);
    g.setCart('water', 2);
    g.setCart('cups', 1);
    g.pay();
    expect(g.kitchenAdd('lemon')).toBe('ok');
    expect(g.kitchenAdd('lemon')).toBe('ok');
    expect(g.kitchenAdd('lemon')).toBe('noStock');
  });

  it('a broken mixer means stirring by hand, which takes twice as long', () => {
    const g = freshGame();
    g.S.broken.mixer = true;
    toKitchen(g);
    g.kitchenRepeat();
    g.kitchenMix('perfect'); // the mixer does not work
    expect(g.D.kitchen.mix).toBe('none');
    let taps = 0;
    while (!g.kitchenStir()) taps++;
    expect(taps + 1).toBe(CONFIG.STIR_TAPS);
    const hour = g.D.hour;
    g.kitchenPour();
    expect(g.D.hour).toBeCloseTo(hour + 2 * (CONFIG.KITCHEN_BASE_H + CONFIG.KITCHEN_PER_PITCHER_H), 6);
  });
});

describe('breakdowns and repairs', () => {
  it('equipment wears out with use and eventually breaks', () => {
    const g = freshGame(4);
    let broke = false;
    // the bot repairs things in the morning, so listen for the breakdown card
    g.bus.on('card', (c) => {
      if (c.id === 'broke') broke = true;
    });
    for (let d = 0; d < 25 && !broke; d++) {
      if (g.phase !== 'morning') g.sleep();
      playDay(g, { buyUpgrades: false, maintain: false });
    }
    expect(g.S.condition.mixer).toBeLessThan(100);
    expect(broke).toBe(true);
  });

  it('a broken umbrella gives no bonus until it is repaired; the repair is a daily expense', () => {
    const g = freshGame();
    g.S.upgrades.umbrella = true;
    g.S.condition.umbrella = 100;
    g.refreshInterest();
    const withUmbrella = g.interest.raw;
    g.debugBreak('umbrella');
    expect(g.interest.raw).toBeLessThan(withUmbrella);
    const coins = g.S.coins;
    expect(g.repair('umbrella')).toBe(true);
    expect(g.S.coins).toBe(coins - g.repairCost('umbrella'));
    expect(g.D.expenses.repairs).toBe(g.repairCost('umbrella'));
    expect(g.interest.raw).toBeCloseTo(withUmbrella, 10);
    g.restDay();
    expect(g.S.coins - g.D.coinsStart).toBe(g.D.report!.profit);
  });

  it('the toolkit makes repairs cheaper and maintenance restores condition', () => {
    const g = freshGame();
    const full = g.repairCost('mixer');
    g.S.upgrades.toolkit = true;
    expect(g.repairCost('mixer')).toBeLessThan(full);
    g.S.condition.mixer = 30;
    g.restDay();
    g.openShop();
    const cost = g.maintenanceCost('mixer');
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(g.repairCost('mixer'));
    expect(g.maintain('mixer')).toBe(true);
    expect(g.S.condition.mixer).toBe(100);
  });
});

describe('helper', () => {
  it('serves customers by himself and his wage is an expense', () => {
    const g = freshGame(8);
    toKitchen(g, 2);
    cook(g, 2);
    g.debugAddCoins(100);
    g.D.coinsStart += 100; // a test top-up, not income
    g.S.bestRep = 2; // the helper is hired from reputation 2
    g.setHelper(true);
    const coins = g.S.coins;
    expect(g.startSelling()).toBe(true);
    expect(g.S.coins).toBe(coins - CONFIG.HELPER_WAGE);
    sellWholeDay(g, false); // the player does nothing
    const r = g.D.report!;
    expect(r.sold).toBeGreaterThan(1);
    expect(r.wages).toBe(CONFIG.HELPER_WAGE);
    expect(g.S.coins - g.D.coinsStart).toBe(r.profit);
  });

  it('does not make lemonade by himself: the player is asked when it runs out', () => {
    const g = freshGame(8);
    g.debugAddCoins(200);
    toKitchen(g, 3);
    cook(g, 1);
    g.S.bestRep = 2;
    g.setHelper(true);
    g.debugAddCoins(100);
    g.startSelling();
    g.D.cupsReady = 1; // the last cup
    const asked: string[] = [];
    g.bus.on('card', (c) => asked.push(c.id));
    g.setSpeed(4);
    for (let i = 0; i < 100000 && g.D.cupsReady > 0 && g.phase === 'sell'; i++) g.update(0.05);
    expect(g.D.cupsReady).toBe(0);
    for (let i = 0; i < 200 && g.phase === 'sell'; i++) g.update(0.05);
    expect(g.D.pitchersMade).toBe(1);
    expect(g.making).toBeNull();
    expect(asked.filter((id) => id === 'outOfLemonade')).toHaveLength(1);
  });
});

describe('kitchen in the middle of the day', () => {
  it('the world waits while cooking, and the jugs are made at the stand afterwards', () => {
    const g = freshGame(5);
    g.debugAddCoins(200);
    toKitchen(g, 3);
    cook(g, 1);
    g.startSelling();
    g.D.cupsReady = 0;
    expect(g.openKitchen()).toBe(true);
    const hour = g.D.hour;
    g.update(1);
    expect(g.D.hour).toBe(hour); // paused
    for (let i = 0; i < 2; i++) {
      g.kitchenRepeat();
      g.kitchenMix('perfect');
      expect(g.kitchenPour()).toBe(true);
    }
    expect(g.D.cupsReady).toBe(0);
    expect(g.making?.jugs).toBe(2);
    g.closeKitchen();
    expect(g.midKitchen).toBe(false);
    for (let i = 0; i < 400 && g.making; i++) g.update(0.05);
    expect(g.making).toBeNull();
    expect(g.D.cupsReady).toBe(20);
    expect(g.D.hour).toBeGreaterThan(hour);
  });

  it('a kitchen left open by going to the title does not freeze the next game', () => {
    const g = freshGame(5);
    g.debugAddCoins(200);
    toKitchen(g, 3);
    cook(g, 1);
    g.startSelling();
    g.D.cupsReady = 0;
    expect(g.openKitchen()).toBe(true);
    g.goTitle();
    expect(g.midKitchen).toBe(false);
    g.newGame({ ageMode: 'pro', avatar: 'boy', lang: 'uk', seed: 9 });
    expect(g.midKitchen).toBe(false);
  });
});

describe('new upgrades', () => {
  it('the cooler keeps unsold lemonade for tomorrow', () => {
    const g = freshGame();
    g.S.upgrades.cooler = true;
    toKitchen(g, 2);
    cook(g, 2);
    g.startSelling();
    g.endDay();
    expect(g.D.report!.carriedCups).toBe(20);
    expect(g.D.report!.wastedCups).toBe(0);
    g.openShop();
    g.sleep();
    expect(g.D.cupsReady).toBe(20);
    // not sold again: yesterday's cups are poured out tonight
    g.skipMarket();
    g.leaveKitchen();
    g.startSelling();
    g.endDay();
    expect(g.D.report!.wastedCups).toBe(20);
    expect(g.D.report!.carriedCups).toBe(0);
  });

  it('the cash lock stops the fox', () => {
    const g = freshGame(5);
    g.S.upgrades.cash_lock = true;
    toKitchen(g, 1);
    cook(g, 1);
    g.startSelling();
    g.D.sales = 200;
    g.debugForceEvent('thief');
    const coins = g.S.coins;
    for (let i = 0; i < 200; i++) g.update(0.05);
    expect(g.D.thief.appeared).toBe(true);
    expect(g.D.thief.stolen).toBe(0);
    expect(g.S.coins).toBeGreaterThanOrEqual(coins);
  });

  it('the loyalty card gives every 10th cup away', () => {
    const g = freshGame(9);
    g.S.upgrades.loyalty = true;
    toKitchen(g, 2);
    cook(g, 2);
    g.startSelling();
    sellWholeDay(g);
    const r = g.D.report!;
    expect(r.freeCups).toBe(Math.floor(r.sold / 10));
    expect(r.sales).toBe((r.sold - r.freeCups) * g.S.price);
  });

  it('delivery costs 10% more but takes no time', () => {
    const g = freshGame();
    g.S.upgrades.delivery = true;
    const hour = g.D.hour;
    expect(g.goMarket(true)).toBe(true);
    expect(g.D.hour).toBe(hour);
    expect(g.goodPrice('lemon')).toBe(5);
    expect(g.goodPrice('water')).toBe(4);
  });

  it('the tent halves the rain penalty', () => {
    const base = { speakerOn: true, flyers: false, weather: 'rain' as const, rep: 1, festival: false };
    const plain = interestChance({ ...base, upgrades: {} }).raw;
    const tent = interestChance({ ...base, upgrades: { tent: true } }).raw;
    expect(tent).toBeGreaterThan(plain * 1.3);
  });

  it('the mascot works best at the school', () => {
    const base = { speakerOn: true, flyers: false, weather: 'sunny' as const, rep: 1, festival: false, upgrades: { mascot: true as const } };
    expect(interestChance({ ...base, location: 'school' }).raw).toBeGreaterThan(interestChance({ ...base, location: 'park' }).raw);
  });
});

describe('busy and quiet days', () => {
  it('every morning each place gets its own crowd between half and a bit more than usual, and it differs from day to day', () => {
    const g = freshGame(5);
    const seen = new Set<number>();
    for (let i = 0; i < 12; i++) {
      for (const [id, v] of Object.entries(g.D.events.busy ?? {})) {
        expect(v, id).toBeGreaterThanOrEqual(CONFIG.CROWD_DAY_MIN);
        expect(v, id).toBeLessThanOrEqual(CONFIG.CROWD_DAY_MAX);
        seen.add(v);
      }
      g.restDay();
      g.sleep();
    }
    expect(seen.size).toBeGreaterThan(10);
  });
});

describe('bike and scooter', () => {
  it('the bike does not wear out or break while a working scooter does the trips', async () => {
    const { applyWear, rollBreaks, rollMiddayBreak, retired, inUseEquipment } = await import('../src/sim/equipment');
    const { RNG } = await import('../src/core/rng');
    const g = freshGame(3);
    g.S.upgrades.bike = true;
    g.S.condition.bike = 100;
    const rng = new RNG(1);
    // alone, the bike wears out
    applyWear(g.S, rng, 'sunny', false, true);
    expect(g.S.condition.bike).toBeLessThan(100);
    g.S.condition.bike = 100;
    // with a scooter it stays as good as new
    g.S.upgrades.scooter = true;
    g.S.condition.scooter = 100;
    expect(retired(g.S, 'bike')).toBe(true);
    expect(inUseEquipment(g.S)).not.toContain('bike');
    for (let i = 0; i < 20; i++) applyWear(g.S, rng, 'sunny', false, true);
    expect(g.S.condition.bike).toBe(100);
    g.S.condition.bike = 5;
    g.S.condition.scooter = 100; // the scooter itself got worn above
    for (let i = 0; i < 50; i++) {
      expect(rollBreaks(g.S, rng).includes('bike')).toBe(false);
      expect(rollMiddayBreak(g.S, rng, 'sunny')).not.toBe('bike');
    }
    // a broken scooter puts the bike back to work
    g.S.broken.scooter = true;
    expect(retired(g.S, 'bike')).toBe(false);
    expect(inUseEquipment(g.S)).toContain('bike');
  });
});

describe('replaced equipment', () => {
  it('the hand juicer and the umbrella are not looked after once the lever juicer and the tent work', async () => {
    const { inUseEquipment, retired } = await import('../src/sim/equipment');
    const g = freshGame(4);
    g.S.upgrades.juicer_hand = true;
    g.S.upgrades.umbrella = true;
    expect(inUseEquipment(g.S)).toEqual(expect.arrayContaining(['juicer_hand', 'umbrella']));
    g.S.upgrades.juicer_lever = true;
    g.S.upgrades.tent = true;
    expect(retired(g.S, 'juicer_hand')).toBe(true);
    expect(retired(g.S, 'umbrella')).toBe(true);
    expect(inUseEquipment(g.S)).not.toContain('juicer_hand');
    expect(inUseEquipment(g.S)).not.toContain('umbrella');
    // a broken tent: the umbrella is needed again
    g.S.broken.tent = true;
    expect(inUseEquipment(g.S)).toContain('umbrella');
    // the truck has its own roof: neither the umbrella nor the tent is looked after any more
    g.S.upgrades.truck = true;
    expect(inUseEquipment(g.S)).not.toContain('umbrella');
    expect(inUseEquipment(g.S)).not.toContain('tent');
  });
});
