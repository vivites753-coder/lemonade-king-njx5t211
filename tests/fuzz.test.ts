// Random play: many days of random (but legal) decisions, saving and loading in the middle of a day, the kitchen
// during selling. Nothing may throw, and the numbers of the game must stay sane after every step.
import { describe, expect, it } from 'vitest';
import type { LocationId, UpgradeId } from '../src/core/types';
import { LOCATION_IDS, LOCATIONS } from '../src/data/locations';
import { UPGRADES } from '../src/data/upgrades';
import { ownedEquipment } from '../src/sim/equipment';
import { Game } from '../src/sim/game';
import { lemonsTotal } from '../src/sim/state';

function lcg(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function check(g: Game, where: string): void {
  const S = g.S;
  const D = g.D;
  const ctx = `${where} day ${S.day} phase ${g.phase}`;
  expect(Number.isFinite(S.coins), ctx).toBe(true);
  expect(S.coins, `${ctx} coins`).toBeGreaterThanOrEqual(0);
  expect(S.rep, ctx).toBeGreaterThanOrEqual(0);
  expect(S.rep, ctx).toBeLessThanOrEqual(5);
  for (const k of ['water', 'sugar', 'cups'] as const) {
    expect(Number.isInteger(S.stock[k]), `${ctx} ${k}`).toBe(true);
    expect(S.stock[k], `${ctx} ${k}`).toBeGreaterThanOrEqual(0);
  }
  expect(lemonsTotal(S.stock), `${ctx} lemons`).toBeGreaterThanOrEqual(0);
  expect(D.cupsReady, `${ctx} cupsReady`).toBeGreaterThanOrEqual(0);
  expect(Number.isFinite(g.interest.chance), ctx).toBe(true);
  expect(g.interest.chance, ctx).toBeLessThanOrEqual(0.4 + 1e-9);
  expect(g.street.queue.length, ctx).toBeLessThanOrEqual(g.maxQueue());
  expect(g.street.queue2.length, ctx).toBeLessThanOrEqual(g.maxQueue());
  if (g.queues() < 2) expect(g.street.queue2.length, ctx).toBe(0);
  for (const p of g.street.peds) {
    expect(Number.isFinite(p.x) && Number.isFinite(p.y), ctx).toBe(true);
  }
}

/** Save and load through JSON, as the browser does. */
function roundTrip(g: Game): void {
  const snap = JSON.parse(JSON.stringify(g.snapshot()));
  g.restore(snap);
}

function playRandomDay(g: Game, rnd: () => number): void {
  const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)];
  // morning
  const open = LOCATION_IDS.filter((id) => g.unlocked(id) && !g.S.points.some((p) => p.loc === id));
  g.chooseLocation(pick(open.length ? open : (['yard'] as LocationId[])));
  for (const id of Object.keys(g.S.broken) as (keyof typeof g.S.broken)[]) if (rnd() < 0.5) g.repair(id);
  if (rnd() < 0.15) roundTrip(g);
  if (rnd() < 0.8 && g.goMarket()) {
    const kits = 1 + Math.floor(rnd() * 4);
    for (let i = 0; i < kits; i++) g.addPitcherKit();
    if (rnd() < 0.3) g.setCart('cookies', Math.floor(rnd() * 3));
    if (g.cartTotal() <= g.S.coins) g.pay();
    else g.leaveMarket();
  } else if (g.phase === 'morning') {
    g.skipMarket();
  }
  check(g, 'after market');
  // kitchen: random recipes, random mixing
  if (g.phase === 'kitchen') {
    const jugs = 1 + Math.floor(rnd() * 4);
    for (let j = 0; j < jugs; j++) {
      for (let i = 0; i < 6; i++) g.kitchenAdd(pick(['lemon', 'water', 'sugar'] as const));
      if (rnd() < 0.2) roundTrip(g);
      if (g.phase !== 'kitchen') break;
      if (g.S.broken.mixer) for (let s = 0; s < 20; s++) g.kitchenStir();
      else g.kitchenMix(pick(['under', 'perfect', 'over'] as const));
      g.kitchenPour();
      check(g, 'kitchen');
    }
    if (g.phase === 'kitchen') g.leaveKitchen();
  }
  if (g.phase === 'prepare') {
    const fair = LOCATIONS[g.S.location].fairPrice;
    g.setPrice(Math.max(1, fair - 4 + Math.floor(rnd() * 9)));
    if (rnd() < 0.3) g.setFlyers(true);
    if (g.helperCap() > 0 && rnd() < 0.4) g.setHelpers(1 + Math.floor(rnd() * g.helperCap()));
    if (!g.startSelling()) g.restDay();
  } else if (g.phase !== 'report') {
    g.restDay();
  }
  if (g.phase === 'sell') g.setSpeed(1 + Math.floor(rnd() * 4));
  let guard = 0;
  let kitchenTried = false;
  while (g.phase === 'sell' && guard++ < 200000) {
    g.update(0.05 + rnd() * 0.1);
    if (g.street.thief && rnd() < 0.02) g.catchThief();
    if (!g.serving && !g.making && rnd() < 0.7) {
      if (g.D.cupsReady === 0 && g.canMakePitcher()) g.makePitcher();
      else g.serve();
    }
    if (rnd() < 0.002) g.toggleSpeaker();
    if (rnd() < 0.003) g.setPrice(g.S.price + (rnd() < 0.5 ? -1 : 1));
    // the kitchen in the middle of the day
    if (!kitchenTried && g.D.cupsReady === 0 && rnd() < 0.05 && g.openKitchen()) {
      kitchenTried = true;
      g.kitchenRepeat();
      if (!g.S.broken.mixer) g.kitchenMix('perfect');
      else for (let s = 0; s < 20; s++) g.kitchenStir();
      g.kitchenPour();
      g.leaveKitchen();
    }
    if (rnd() < 0.0015) roundTrip(g);
    if (guard % 400 === 0) check(g, 'selling');
  }
  expect(guard, 'a selling day never ends').toBeLessThan(200000);
  check(g, 'report');
  // evening shop
  g.openShop();
  for (const id of ownedEquipment(g.S)) if (rnd() < 0.3) g.maintain(id);
  const ids = Object.keys(UPGRADES) as UpgradeId[];
  for (let i = 0; i < 3; i++) {
    const id = pick(ids);
    if (g.canBuy(id).ok && rnd() < 0.6) g.buyUpgrade(id);
  }
  if (rnd() < 0.1) roundTrip(g);
  check(g, 'shop');
  g.sleep();
  check(g, 'morning');
}

describe('random play', () => {
  it('40 days of random decisions, saving and loading on the way, keep the game sane (40 games)', () => {
    let days = 0;
    let sold = 0;
    const realRandom = Math.random;
    for (let seed = 1; seed <= 40; seed++) {
      // the decoration (critters, cars, looks) uses Math.random: make it repeatable too
      Math.random = lcg(seed * 104729);
      const g = new Game(seed);
      g.newGame({ ageMode: seed % 2 ? 'pro' : 'kid', avatar: seed % 3 ? 'boy' : 'girl', lang: 'uk', seed });
      // a rich start opens more of the game (points, trucks, helpers)
      if (seed % 3 === 0) {
        g.debugAddCoins(3000);
        g.S.bestRep = 4;
        g.S.rep = 4;
      }
      const rnd = lcg(seed * 7919);
      for (let d = 0; d < 40; d++) {
        if (g.phase !== 'morning') break;
        playRandomDay(g, rnd);
      }
      expect(g.S.day).toBeGreaterThan(1);
      days += g.S.day - 1;
      Math.random = realRandom;
      sold += g.S.totals.sold;
    }
    // the random player really played: hundreds of days and many cups
    expect(days).toBeGreaterThan(1200);
    expect(sold).toBeGreaterThan(1000);
  }, 120000);
});
