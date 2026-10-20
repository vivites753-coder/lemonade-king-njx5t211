// Random play of a rich player with a chain of stands: opening, upgrading, closing stands, hiring and firing,
// answering every card about the sellers, wholesale shopping, looking at the stands while selling, juicers in the
// kitchen, saving and loading. Nothing may throw and the numbers must stay sane.
import { describe, expect, it } from 'vitest';
import type { GoodId, LocationId, UpgradeId } from '../src/core/types';
import { GOODS, GOOD_IDS } from '../src/data/goods';
import { LOCATION_IDS, LOCATIONS } from '../src/data/locations';
import { CONFIG } from '../src/core/config';
import { POINTS } from '../src/data/staff';
import { UPGRADES } from '../src/data/upgrades';
import type { CardInfo } from '../src/sim/game';
import { Game } from '../src/sim/game';
import { PointScene } from '../src/sim/pointScene';
import { freePlaces, payback, POINT_UPGRADE_IDS, pointHasRoomFor2, pointUps, standCount } from '../src/sim/points';
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
  const ctx = `${where} day ${S.day} phase ${g.phase}`;
  expect(Number.isFinite(S.coins), ctx).toBe(true);
  expect(S.coins, `${ctx} coins`).toBeGreaterThanOrEqual(0);
  for (const k of ['water', 'sugar', 'cups'] as const) {
    expect(Number.isInteger(S.stock[k]), `${ctx} ${k}`).toBe(true);
    expect(S.stock[k], `${ctx} ${k}`).toBeGreaterThanOrEqual(0);
  }
  expect(lemonsTotal(S.stock), `${ctx} lemons`).toBeGreaterThanOrEqual(0);
  for (const b of S.stock.lemons) expect(Number.isInteger(b.n) && b.n > 0, `${ctx} lemon batch`).toBe(true);
  expect(g.D.cupsReady, `${ctx} cups`).toBeGreaterThanOrEqual(0);
  if (g.phase === 'kitchen' || g.midKitchen) for (const v of Object.values(g.kitchenLeft())) expect(v, `${ctx} kitchen shelf`).toBeGreaterThanOrEqual(0);
  expect(standCount(S), ctx).toBeLessThanOrEqual(POINTS.MAX);
  const locs = new Set<string>();
  for (const p of S.points) {
    expect(locs.has(p.loc), `${ctx} two stands at one place`).toBe(false);
    locs.add(p.loc);
    expect(p.loc, ctx).not.toBe('yard');
    expect(Number.isFinite(p.total) && Number.isFinite(p.invested ?? 0), ctx).toBe(true);
    expect(p.invested ?? 0, ctx).toBeGreaterThanOrEqual(POINTS.COST);
    expect(p.history.length, ctx).toBeLessThanOrEqual(7);
    if (p.helper) {
      expect(p.helper.nameId === p.seller?.nameId, `${ctx} one person twice`).toBe(false);
      expect(pointHasRoomFor2(p), `${ctx} a second worker at a small table`).toBe(true);
    }
    if (p.away) {
      expect(p.away.days, `${ctx} ill days`).toBeGreaterThanOrEqual(0);
      expect(p.away.seller.nameId === p.seller?.nameId, `${ctx} the ill seller also works`).toBe(false);
    }
    for (const id of Object.keys(pointUps(p)) as UpgradeId[]) expect(POINT_UPGRADE_IDS.includes(id) || id === 'sign', `${ctx} ${id}`).toBe(true);
    const pb = payback(p);
    expect(Number.isFinite(pb.share), ctx).toBe(true);
  }
  // the player never sells where a stand of theirs works (at an own store the staff work with the player)
  if (g.phase === 'sell') expect(S.points.some((p) => p.loc === S.location && !p.store), ctx).toBe(false);
  // every store is among the points, once; a store's floor has room for so many stains
  for (const loc of Object.keys(S.stores)) expect(S.points.filter((p) => p.store && p.loc === loc).length, `${ctx} store point`).toBe(1);
  for (const st of Object.values(S.stores)) expect(st!.stains?.length ?? 0, ctx).toBeLessThanOrEqual(CONFIG.STAINS_MAX);
  if (g.viewPoint !== null) expect(g.pointById(g.viewPoint), `${ctx} view of a closed stand`).toBeTruthy();
}

function roundTrip(g: Game): void {
  g.restore(JSON.parse(JSON.stringify(g.snapshot())));
}

describe('random play with a chain of stands', () => {
  it('a rich player opens, upgrades and runs stands for 30 days (24 games)', () => {
    const realRandom = Math.random;
    let opened = 0;
    let upgraded = 0;
    let watched = 0;
    let standins = 0;
    let bulk = 0;
    let stores = 0;
    let wiped = 0;
    for (let seed = 1; seed <= 24; seed++) {
      Math.random = lcg(seed * 7727);
      const rnd = lcg(seed * 3571);
      const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
      const g = new Game(seed);
      const phase = (): string => g.phase;
      g.newGame({ ageMode: seed % 2 ? 'pro' : 'kid', avatar: seed % 2 ? 'boy' : 'girl', lang: 'uk', seed });
      g.S.coins = 12000;
      g.S.rep = 4.2;
      g.S.bestRep = 4.6;
      g.S.day = 2;
      // every card with a choice is answered at random (like a player tapping one of the buttons)
      const cards: CardInfo[] = [];
      g.bus.on('card', (c) => cards.push(c));
      g.bus.on('hire', (e) => {
        if (rnd() < 0.8 && g.hireSeller(e.point, Math.floor(rnd() * 3))) standins++;
      });
      const answer = () => {
        while (cards.length) {
          const c = cards.shift()!;
          if (c.choices?.length) g.cardChoice(c, pick(c.choices.filter((x) => !x.disabled)).act ?? c.choices[0].act);
        }
      };
      for (let d = 0; d < 30 && g.phase === 'morning'; d++) {
        answer();
        check(g, 'morning');
        // level 4: now and then a store of one's own (its staff and its cleaner are hired in the evening)
        for (const id of LOCATION_IDS) if (g.canOpenStore(id).ok && rnd() < 0.1 && g.openStore(id)) stores++;
        const open = LOCATION_IDS.filter((id) => g.unlocked(id) && !g.S.points.some((p) => p.loc === id && !p.store));
        g.chooseLocation(pick(open.length ? open : (['yard'] as LocationId[])));
        if (g.goMarket()) {
          for (let i = 0; i < 1 + Math.floor(rnd() * 3); i++) g.addPitcherKit();
          for (const id of GOOD_IDS) {
            if (GOODS[id].wholesale && g.goodAvailable(id) && rnd() < 0.25) {
              g.setCart(id as GoodId, 1);
              bulk++;
            }
          }
          if (g.cartTotal() <= g.S.coins) g.pay();
          else g.leaveMarket();
        } else g.skipMarket();
        if (phase() === 'kitchen') {
          for (let j = 0; j < 1 + Math.floor(rnd() * 3); j++) {
            if (rnd() < 0.5) g.kitchenRepeat();
            else for (let i = 0; i < 6; i++) g.kitchenAdd(pick(['lemon', 'water', 'sugar'] as const));
            check(g, 'kitchen');
            if (g.S.broken.mixer) for (let s = 0; s < 20; s++) g.kitchenStir();
            else g.kitchenMix('perfect');
            g.kitchenPour();
          }
          g.leaveKitchen();
        }
        answer();
        if (phase() === 'prepare') {
          g.setPrice(LOCATIONS[g.S.location].fairPrice);
          if (!g.startSelling()) g.restDay();
        } else if (phase() !== 'report') g.restDay();
        // selling, now and then looking at one of the stands (the scene of the stand runs too)
        let scene: PointScene | null = null;
        let guard = 0;
        while (phase() === 'sell' && guard++ < 200000) {
          g.update(0.1);
          if (rnd() < 0.002 && g.S.points.length) {
            g.setView(pick(g.S.points).id);
            watched++;
          }
          if (rnd() < 0.002) g.setView(null);
          const vp = g.viewPoint !== null ? g.pointById(g.viewPoint) : undefined;
          if (vp && (!scene || scene.point !== vp)) scene = new PointScene(g, vp);
          if (scene && vp) {
            scene.refresh();
            scene.update(0.1 * g.speed);
            for (const p of scene.street.peds) expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
          }
          if (!g.serving && !g.making && rnd() < 0.7) {
            if (g.D.cupsReady === 0 && g.canMakePitcher()) g.makePitcher();
            else g.serve();
          }
          if (g.street.thief && rnd() < 0.05) g.catchThief();
          if (rnd() < 0.01 && g.cleanStain()) wiped++;
          if (rnd() < 0.0015) roundTrip(g);
          if (guard % 500 === 0) check(g, 'selling');
          answer();
        }
        expect(guard).toBeLessThan(200000);
        answer();
        check(g, 'report');
        g.openShop();
        answer();
        // the evening: stands are opened, upgraded, closed; sellers hired and fired
        if (rnd() < 0.5) {
          const free = freePlaces(g.S);
          if (free.length && g.openPoint(pick(free))) opened++;
        }
        for (const p of [...g.S.points]) {
          if (!p.seller && rnd() < 0.7) g.hireSeller(p.id, Math.floor(rnd() * 3));
          if (!p.helper && rnd() < 0.3) g.hireSeller(p.id, Math.floor(rnd() * 3), 'helper');
          if (p.helper && rnd() < 0.05) g.fireHelper(p.id);
          if (rnd() < 0.5) {
            const id = pick(POINT_UPGRADE_IDS);
            if (g.canBuyPointUpgrade(p.id, id).ok && g.buyPointUpgrade(p.id, id)) upgraded++;
          }
          if (rnd() < 0.05) g.fireSeller(p.id);
          if (rnd() < 0.04) g.closePoint(p.id);
          if (p.store && rnd() < 0.2) g.setCleaner(p.loc, rnd() < 0.6);
        }
        for (let i = 0; i < 2; i++) {
          const id = pick(Object.keys(UPGRADES) as UpgradeId[]);
          if (g.canBuy(id).ok && rnd() < 0.5) g.buyUpgrade(id);
        }
        if (rnd() < 0.2) roundTrip(g);
        check(g, 'shop');
        g.sleep();
      }
      Math.random = realRandom;
    }
    expect(opened).toBeGreaterThan(20);
    expect(upgraded).toBeGreaterThan(40);
    expect(watched).toBeGreaterThan(10);
    expect(bulk).toBeGreaterThan(10);
    expect(standins).toBeGreaterThan(0);
    expect(stores).toBeGreaterThan(5);
    expect(wiped).toBeGreaterThan(5);
  }, 180000);
});
