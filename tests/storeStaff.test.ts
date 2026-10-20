// The own store among "My stands": its staff run it while the player works elsewhere and help the player when the
// player works there; its floor gets dirty with the customers and is cleaned by the player or by a hired cleaner.
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { LOCATIONS } from '../src/data/locations';
import { POINTS } from '../src/data/staff';
import { DOOR_IN, DOOR_OUT, throughDoor } from '../src/data/storeRoom';
import { addDirt, cleanPct, dirtShare, stainSpots } from '../src/sim/cleaning';
import { interestChance } from '../src/sim/economy';
import { Game } from '../src/sim/game';
import { PointScene } from '../src/sim/pointScene';
import { pointAt, pointFixedCosts, standCount, storePointAt } from '../src/sim/points';
import { cook } from './bot';

/** A player of level 4 on a morning, rich enough for a store. */
function level4(seed = 61, coins = 12000): Game {
  const g = new Game(seed);
  g.newGame({ ageMode: 'pro', avatar: 'girl', lang: 'uk', seed });
  g.S.day = 6;
  g.S.rep = 4.1;
  g.S.bestRep = 4.1;
  g.S.coins = coins;
  g.S.noTips = true;
  return g;
}

/** The staff of the point: a seller, and a second worker when `two`. */
function hire(g: Game, id: number, two = false): void {
  expect(g.hireSeller(id, 0)).toBe(true);
  if (two) expect(g.hireSeller(id, 1, 'helper')).toBe(true);
}

/** Buys and makes `jugs` pitchers and opens at the place chosen. */
function open(g: Game, jugs = 5): void {
  expect(g.goMarket()).toBe(true);
  for (let i = 0; i < jugs; i++) g.addPitcherKit();
  expect(g.pay()).toBe(true);
  cook(g, jugs);
  g.setPrice(LOCATIONS[g.S.location].fairPrice);
  expect(g.startSelling()).toBe(true);
}

function sellAllDay(g: Game, onStep?: (i: number) => void): void {
  g.setSpeed(4);
  for (let i = 0; i < 200000 && g.phase === 'sell'; i++) {
    g.update(0.05);
    if (!g.serving && !g.making) g.serve();
    onStep?.(i);
  }
}

/** A day at home in the yard (the stores and stands work without the player). */
function dayAway(g: Game): void {
  for (const p of g.S.points) p.issue = null;
  g.D.weather = 'sunny';
  g.restDay();
}

function nextMorning(g: Game): void {
  g.openShop();
  g.sleep();
}

describe('the own store among "My stands"', () => {
  it('opening a store makes its point: no stand, not sold, its upgrades are the evening shop\'s', () => {
    const g = level4();
    expect(g.openStore('townhall')).toBe(true);
    const p = storePointAt(g.S, 'townhall')!;
    expect(p).toBeTruthy();
    expect(p.store).toBe(true);
    expect(p.invested).toBe(5000);
    // the place is the player's to work at: not "a stand of yours here"
    expect(pointAt(g.S, 'townhall')).toBeUndefined();
    expect(standCount(g.S)).toBe(0);
    expect(g.chooseLocation('townhall')).toBe(true);
    // a store does not count against the stands, cannot be closed and gets no stand upgrades
    g.restDay();
    g.openShop();
    expect(g.canBuyPointUpgrade(p.id, 'sign').ok).toBe(false);
    expect(g.closePoint(p.id)).toBe(false);
    expect(g.S.points).toContain(p);
    for (const loc of ['park', 'school', 'beach'] as const) if (g.canOpenPoint(loc).ok) g.openPoint(loc);
    expect(standCount(g.S)).toBeLessThanOrEqual(POINTS.MAX);
    expect(g.S.points.length).toBe(standCount(g.S) + 1);
  });

  it('an old save: every store gets its point with the payback it had', () => {
    const g = level4(62);
    expect(g.openStore('parkside')).toBe(true);
    const snap = JSON.parse(JSON.stringify(g.snapshot()));
    snap.S.points = [];
    snap.S.stores.parkside.earned = 700;
    snap.S.stores.parkside.days = 3;
    delete snap.S.stores.parkside.stains;
    delete snap.S.stores.parkside.dirt;
    g.restore(snap);
    const p = storePointAt(g.S, 'parkside')!;
    expect(p).toBeTruthy();
    expect(p.total).toBe(700);
    expect(p.invested).toBe(4000);
    expect(g.S.stores.parkside!.stains).toEqual([]);
    // and only one, also after another load
    g.restore(JSON.parse(JSON.stringify(g.snapshot())));
    expect(g.S.points.filter((x) => x.store).length).toBe(1);
  });

  it('without staff the store is closed while the player is away: it costs nothing', () => {
    const g = level4(63);
    expect(g.openStore('townhall')).toBe(true);
    g.chooseLocation('yard');
    const coins = g.S.coins;
    dayAway(g);
    const r = g.D.report!.points.find((x) => x.loc === 'townhall')!;
    expect(r.status).toBe('empty');
    expect(r.profit).toBe(0);
    expect(g.S.coins).toBe(coins);
  });

  it('its staff run it while the player is away: rent, utilities, wages and the tax, all in the evening count', () => {
    const g = level4(64);
    expect(g.openStore('townhall')).toBe(true);
    const p = storePointAt(g.S, 'townhall')!;
    hire(g, p.id);
    g.chooseLocation('yard');
    const coins = g.S.coins;
    const fixed = pointFixedCosts(g.S, p);
    expect(fixed).toBe(LOCATIONS.townhall.rent + LOCATIONS.townhall.store!.utilities + p.seller!.wage);
    dayAway(g);
    const r = g.D.report!.points.find((x) => x.loc === 'townhall')!;
    expect(r.status).toBe('ok');
    expect(r.sold).toBeGreaterThan(20);
    expect(r.utilities).toBe(LOCATIONS.townhall.store!.utilities);
    const before = r.revenue - r.ingredients - r.rent - r.wage - r.utilities!;
    expect(r.tax).toBe(Math.max(0, Math.round(before * CONFIG.STORE_TAX)));
    expect(r.profit).toBe(before - r.tax! - r.stolen);
    // the money: what the store made is in the purse, and in the report
    expect(g.S.coins - coins).toBe(r.profit);
    expect(g.D.report!.pointsProfit).toBe(r.profit);
    // the payback of the store counts it
    expect(p.total).toBe(r.profit);
    expect(g.S.stores.townhall!.earned).toBe(r.profit);
    expect(g.S.stores.townhall!.days).toBe(1);
  });

  it('the player works there with its staff: they are the helpers, with their own wages, and the day is the player\'s', () => {
    const g = level4(65);
    expect(g.openStore('townhall')).toBe(true);
    const p = storePointAt(g.S, 'townhall')!;
    hire(g, p.id, true);
    nextMorningAt(g, 'townhall');
    expect(g.goMarket()).toBe(true);
    for (let i = 0; i < 6; i++) g.addPitcherKit();
    expect(g.pay()).toBe(true);
    cook(g, 6);
    // the helpers of the day are not hired at the store: its staff are
    g.setHelpers(0);
    const wages = p.seller!.wage + p.helper!.wage;
    expect(g.helperWages()).toBe(wages);
    expect(g.openingCosts()).toBe(LOCATIONS.townhall.rent + g.storeUtilities() + wages);
    g.setPrice(LOCATIONS.townhall.fairPrice);
    expect(g.startSelling()).toBe(true);
    expect(g.D.helpers).toBe(2);
    expect(g.autoCounter(0) && g.autoCounter(1)).toBe(true);
    expect(g.D.expenses.wages).toBe(wages);
    // the scene shows the staff as they are
    expect(g.helperGirls?.length).toBe(2);
    // the store where the player is cannot be "looked at": it is the own scene
    g.setView(p.id);
    expect(g.viewPoint).toBeNull();
    sellAllDay(g);
    const r = g.D.report!;
    expect(r.store).toBeTruthy();
    // not among the other points of the day: it was the player's own day
    expect(r.points.some((x) => x.loc === 'townhall')).toBe(false);
    expect(p.last?.status).toBe('owner');
    expect(p.last?.profit).toBe(r.store!.taxBase - r.store!.tax);
    expect(p.total).toBe(g.S.stores.townhall!.earned);
  });

  it('a second store works by itself while the player is at the first one', () => {
    const g = level4(66, 15000);
    expect(g.openStore('parkside')).toBe(true);
    const far = storePointAt(g.S, 'parkside')!;
    hire(g, far.id);
    expect(g.openStore('townhall')).toBe(true);
    for (const x of g.S.points) x.issue = null;
    g.D.weather = 'sunny';
    open(g, 5);
    expect(g.S.location).toBe('townhall');
    // the other store can be watched meanwhile
    g.setView(far.id);
    expect(g.viewPoint).toBe(far.id);
    const scene = new PointScene(g, far);
    expect(scene.counters()).toBe(2);
    for (let i = 0; i < 400; i++) {
      g.update(0.05);
      scene.update(0.2);
    }
    expect(scene.street.peds.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y))).toBe(true);
    g.setView(null);
    sellAllDay(g);
    const r = g.D.report!;
    const other = r.points.find((x) => x.loc === 'parkside')!;
    expect(other.status).not.toBe('empty');
    expect(other.revenue).toBeGreaterThan(0);
    expect(r.store?.loc).toBe('townhall');
  });
});

describe('cleaning the store', () => {
  it('the customers bring dirt in; the stains stay overnight and in a save', () => {
    const g = level4(71);
    expect(g.openStore('townhall')).toBe(true);
    g.D.weather = 'sunny';
    open(g, 6);
    sellAllDay(g);
    const st = g.S.stores.townhall!;
    const n = st.stains!.length;
    expect(n).toBeGreaterThanOrEqual(Math.floor(g.D.report!.sold * CONFIG.DIRT_PER_CUSTOMER) - 1);
    expect(n).toBeGreaterThan(0);
    expect(g.D.report!.clean).toBe(cleanPct(st));
    // every stain lies on the floor of the room, apart from the others
    for (const s of st.stains!) expect(stainSpots('townhall').some((q) => q.x === s.x && q.y === s.y)).toBe(true);
    nextMorning(g);
    expect(g.S.stores.townhall!.stains!.length).toBe(n);
    g.restore(JSON.parse(JSON.stringify(g.snapshot())));
    expect(g.S.stores.townhall!.stains!.length).toBe(n);
  });

  it('a tap wipes a stain off (in the morning too); a dirty floor puts people off', () => {
    const g = level4(72);
    expect(g.openStore('townhall')).toBe(true);
    addDirt(g.S, 'townhall', 6, 'sunny');
    expect(g.S.stores.townhall!.stains!.length).toBe(6);
    g.refreshInterest();
    const dirty = g.interest.raw;
    expect(g.interest.parts.some((x) => x.key === 'why.dirty')).toBe(true);
    const wiped: number[] = [];
    g.bus.on('wiped', (e) => wiped.push(e.x));
    const s = g.S.stores.townhall!.stains![2];
    expect(g.cleanStain(s)).toBe(true);
    expect(g.S.stores.townhall!.stains).not.toContain(s);
    expect(wiped).toEqual([s.x]);
    // the button wipes the next one
    while (g.cleanStain()) {}
    expect(g.cleanliness()).toBe(100);
    g.refreshInterest();
    expect(g.interest.raw).toBeGreaterThan(dirty);
    expect(g.interest.parts.some((x) => x.key === 'why.dirty')).toBe(false);
    // the economy: the more dirt, the fewer stop
    const base = { upgrades: {}, speakerOn: true, flyers: false, weather: 'sunny' as const, rep: 4, festival: false, location: 'townhall' as const, store: true };
    expect(interestChance({ ...base, dirt: 1 }).raw).toBeCloseTo(interestChance(base).raw * (1 - CONFIG.DIRT_STOP), 6);
  });

  it('a full floor gets no dirtier; a stand has no floor to clean', () => {
    const g = level4(73);
    expect(g.openStore('townhall')).toBe(true);
    addDirt(g.S, 'townhall', 40, 'rain');
    expect(g.S.stores.townhall!.stains!.length).toBe(CONFIG.STAINS_MAX);
    expect(dirtShare(g.S.stores.townhall)).toBe(1);
    // rain brings mud in
    expect(g.S.stores.townhall!.stains!.some((s) => s.k === 1)).toBe(true);
    g.chooseLocation('yard');
    expect(g.dirt()).toBe(0);
    expect(g.cleanStain()).toBe(false);
  });

  it('a cleaner keeps the floor clean while the player sells; her wage is paid at the opening', () => {
    const g = level4(74);
    expect(g.openStore('townhall')).toBe(true);
    addDirt(g.S, 'townhall', 5, 'sunny');
    expect(g.setCleaner('townhall', true)).toBe(true);
    expect(g.cleanerWage()).toBe(CONFIG.CLEANER_WAGE);
    g.D.weather = 'sunny';
    open(g, 6);
    expect(g.D.expenses.cleaning).toBe(CONFIG.CLEANER_WAGE);
    expect(g.cleaner).toBeTruthy();
    let most = 0;
    sellAllDay(g, () => {
      most = Math.max(most, g.S.stores.townhall!.stains!.length);
    });
    // she got rid of yesterday's dirt and kept up with the new one
    expect(g.S.stores.townhall!.stains!.length).toBeLessThanOrEqual(2);
    expect(g.D.report!.cleaning).toBe(CONFIG.CLEANER_WAGE);
    expect(g.cleaner).toBeNull();
    // not while selling: hiring and letting her go is for before or after the day
    nextMorning(g);
    expect(g.setCleaner('townhall', false)).toBe(true);
    expect(g.cleanerWage()).toBe(0);
  });

  it('a store its staff run gets dirty without a cleaner; with one it stays clean and pays her', () => {
    const dirtAfter = (cleaner: boolean) => {
      const g = level4(75);
      expect(g.openStore('townhall')).toBe(true);
      const p = storePointAt(g.S, 'townhall')!;
      hire(g, p.id);
      if (cleaner) g.setCleaner('townhall', true);
      g.chooseLocation('yard');
      let cleaning = 0;
      for (let d = 0; d < 4; d++) {
        dayAway(g);
        cleaning += g.D.report!.points.find((x) => x.loc === 'townhall')!.cleaning ?? 0;
        nextMorning(g);
        if (p.away) {
          p.seller = p.away.seller;
          p.away = null;
        }
        g.chooseLocation('yard');
      }
      return { stains: g.S.stores.townhall!.stains!.length, cleaning, sold: p.last!.sold };
    };
    const dirty = dirtAfter(false);
    const clean = dirtAfter(true);
    expect(dirty.stains).toBeGreaterThan(8);
    expect(dirty.cleaning).toBe(0);
    expect(clean.stains).toBe(0);
    expect(clean.cleaning).toBe(4 * CONFIG.CLEANER_WAGE);
    // a clean store sells more
    expect(clean.sold).toBeGreaterThan(dirty.sold);
  });
});

describe('the door of the store', () => {
  it('opens only for those who go in or out, not for passers-by', () => {
    expect(throughDoor([DOOR_OUT, DOOR_IN, { x: 3, y: 3 }])).toBe(true);
    expect(throughDoor([DOOR_IN, DOOR_OUT, { x: 12, y: 5.5 }])).toBe(true);
    expect(throughDoor([{ x: 2.8, y: 5.5 }, { x: 13, y: 5.5 }])).toBe(false);
    expect(throughDoor([])).toBe(false);
  });
});

/** Rest today and wake up at this place tomorrow. */
function nextMorningAt(g: Game, loc: 'townhall' | 'parkside'): void {
  g.restDay();
  nextMorning(g);
  for (const x of g.S.points) x.issue = null;
  if (g.S.location !== loc) expect(g.chooseLocation(loc)).toBe(true);
}

describe('the wholesale warehouse', () => {
  it('stays for the owners of stands: a store of one\'s own does not open it', () => {
    const g = level4(81);
    expect(g.openStore('townhall')).toBe(true);
    expect(g.S.points.length).toBe(1);
    expect(g.goodAvailable('lemon_bulk')).toBe(false);
  });
});
