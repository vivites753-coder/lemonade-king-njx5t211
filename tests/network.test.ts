// A chain of stands: their own upgrades, payback, an ill seller and a stand-in, wholesale, looking at a stand.
import { describe, expect, it } from 'vitest';
import { RNG } from '../src/core/rng';
import { POINTS } from '../src/data/staff';
import { UPGRADES } from '../src/data/upgrades';
import { GOODS } from '../src/data/goods';
import type { CardInfo } from '../src/sim/game';
import { Game } from '../src/sim/game';
import { PointScene } from '../src/sim/pointScene';
import { payback, POINT_START, simulatePoint, type Point } from '../src/sim/points';
import { normalizeState, lemonsTotal } from '../src/sim/state';
import { NO_EVENTS } from '../src/sim/traffic';
import { cook } from './bot';

function evening(seed = 21): Game {
  const g = new Game(seed);
  g.newGame({ ageMode: 'pro', avatar: 'boy', lang: 'uk', seed });
  g.S.day = 20;
  g.S.rep = 4.2;
  g.S.bestRep = 4.2;
  g.S.coins = 9000;
  g.restDay();
  g.openShop();
  return g;
}

const seller = { nameId: 3, wage: 30, skill: 0.85, honesty: 1, refs: true, warnings: 0, hiredDay: 1 };

describe('a chain of stands', () => {
  it('a new stand costs 2000, comes with its equipment, and half of what was put in comes back on closing', () => {
    const g = evening();
    const coins = g.S.coins;
    const p = g.openPoint('park')!;
    expect(POINTS.COST).toBe(2000);
    expect(g.S.coins).toBe(coins - 2000);
    expect(p.upgrades).toEqual(POINT_START);
    expect(p.invested).toBe(2000);
    expect(g.buyPointUpgrade(p.id, 'banner')).toBe(true);
    expect(p.invested).toBe(2000 + UPGRADES.banner.price);
    const before = g.S.coins;
    expect(g.closePoint(p.id)).toBe(true);
    expect(g.S.coins).toBe(before + Math.round((2000 + UPGRADES.banner.price) * POINTS.SELL_BACK));
  });

  it('stand upgrades: evening only, the rules of the shop, nothing that makes no sense at a stand', () => {
    const g = evening();
    const p = g.openPoint('park')!;
    expect(g.canBuyPointUpgrade(p.id, 'sign').reason).toBe('owned');
    expect(g.canBuyPointUpgrade(p.id, 'delivery').reason).toBe('na');
    expect(g.canBuyPointUpgrade(p.id, 'toolkit').reason).toBe('na');
    expect(g.canBuyPointUpgrade(p.id, 'juicer_lever').ok).toBe(true); // the hand juicer came with the stand
    g.S.bestRep = 2;
    expect(g.canBuyPointUpgrade(p.id, 'truck').reason).toBe('rep');
    g.S.bestRep = 4.2;
    const coins = g.S.coins;
    expect(g.buyPointUpgrade(p.id, 'truck')).toBe(true);
    expect(g.S.coins).toBe(coins - UPGRADES.truck.price);
    // the player's own stand does not get it
    expect(g.S.upgrades.truck).toBeUndefined();
    g.sleep();
    expect(g.canBuyPointUpgrade(p.id, 'banner').reason).toBe('evening');
  });

  it('upgrades bring more customers and cheaper cups', () => {
    const g = evening();
    const rng = new RNG(4);
    const mk = (upgrades: Point['upgrades']): Point => ({ id: 1, loc: 'park', opened: 1, seller, issue: null, last: null, history: [], total: 0, upgrades });
    const avg = (p: Point) => {
      let sold = 0;
      let profit = 0;
      for (let i = 0; i < 60; i++) {
        const d = simulatePoint(g.S, p, 'sunny', NO_EVENTS, rng);
        sold += d.sold;
        profit += d.profit;
      }
      return { sold: sold / 60, profit: profit / 60 };
    };
    const base = avg(mk({ ...POINT_START }));
    const ads = avg(mk({ ...POINT_START, banner: true, speaker: true }));
    expect(ads.sold).toBeGreaterThan(base.sold * 1.4);
    expect(ads.profit).toBeGreaterThan(base.profit);
    // a stand with only the basics pays back in a few weeks in the park
    expect(2000 / base.profit).toBeLessThan(30);
  });

  it('payback: the share that has come back and the days left at the pace of the last week', () => {
    const p: Point = { id: 1, loc: 'park', opened: 1, seller, issue: null, last: null, history: [100, 100], total: 500, upgrades: { ...POINT_START }, invested: 2000 };
    const pb = payback(p);
    expect(pb.share).toBeCloseTo(0.25, 9);
    expect(pb.days).toBe(15);
    p.total = 2100;
    expect(payback(p).days).toBe(0);
    p.total = -50;
    p.history = [-20, -30];
    expect(payback(p).days).toBeNull();
  });

  it('an ill seller stays home for days: a stand-in works, then the player chooses who stays', () => {
    const g = evening(5);
    const p = g.openPoint('park')!;
    g.hireSeller(p.id, 0);
    const own = p.seller!;
    const cards: CardInfo[] = [];
    const hires: number[] = [];
    g.bus.on('card', (c) => cards.push(c));
    g.bus.on('hire', (e) => hires.push(e.point));
    // force the illness in the morning
    const chance = POINTS.SICK_CHANCE;
    (POINTS as { SICK_CHANCE: number }).SICK_CHANCE = 1;
    g.sleep();
    (POINTS as { SICK_CHANCE: number }).SICK_CHANCE = chance;
    expect(p.seller).toBeNull();
    expect(p.away?.seller).toBe(own);
    const ill = cards.find((c) => c.id === 'staff.ill')!;
    expect(ill.choices?.map((c) => c.act)).toEqual(['standin', 'wait']);
    // a closed stand earns and costs nothing
    expect(simulatePoint(g.S, p, 'sunny', NO_EVENTS, new RNG(1)).status).toBe('sick');
    expect(g.cardChoice(ill, 'standin')).toBe(true);
    expect(hires).toEqual([p.id]);
    // the ill seller is not among the people who want the job
    expect(g.candidates(p.id).some((s) => s.nameId === own.nameId)).toBe(false);
    expect(g.hireSeller(p.id, 0)).toBe(true);
    const standin = p.seller!;
    // days pass until the own seller is well again
    for (let i = 0; i < 4 && p.away; i++) {
      g.restDay();
      g.openShop();
      p.issue = null;
      g.sleep();
    }
    expect(p.away).not.toBeNull();
    const back = cards.find((c) => c.id === 'staff.back')!;
    expect(back.choices?.map((c) => c.act)).toEqual(['keepOld', 'keepNew']);
    expect(p.seller).toBe(standin);
    g.workerChoice(p.id, 'keepOld');
    expect(p.seller).toBe(own);
    expect(p.away).toBeNull();
  });

  it('the wholesale warehouse opens with the first stand; a box holds many pieces, each cheaper', () => {
    const g = evening();
    g.sleep();
    g.goMarket();
    expect(g.goodAvailable('lemon_bulk')).toBe(false);
    g.leaveMarket();
    g.restDay();
    g.openShop();
    g.openPoint('park');
    g.sleep();
    g.goMarket();
    expect(g.goodAvailable('lemon_bulk')).toBe(true);
    for (const id of ['lemon_bulk', 'water_bulk', 'sugar_bulk', 'cups_bulk'] as const) {
      const bulk = GOODS[id];
      const single = GOODS[({ lemon_bulk: 'lemon', water_bulk: 'water', sugar_bulk: 'sugar', cups_bulk: 'cups' } as const)[id]];
      expect(bulk.price / bulk.pack).toBeLessThan(single.price / single.pack);
    }
    const lemons = lemonsTotal(g.S.stock);
    g.setCart('lemon_bulk', 1);
    expect(g.stockWithCart().lemons).toBe(lemons + 20);
    g.D.events.badLemons = false;
    g.pay();
    expect(lemonsTotal(g.S.stock)).toBe(lemons + 20);
  });

  it('looking at a stand: the view follows the player, closes with a new part of the day, the scene sells', () => {
    const g = evening(9);
    const p = g.openPoint('beach')!;
    g.hireSeller(p.id, 0);
    g.setView(p.id);
    expect(g.viewPoint).toBe(p.id);
    g.sleep();
    expect(g.viewPoint).toBeNull();
    // a selling day: the stand's day is known when the selling starts and shown bit by bit
    g.goMarket();
    for (let i = 0; i < 3; i++) g.addPitcherKit();
    g.pay();
    cook(g, 3);
    expect(g.startSelling()).toBe(true);
    expect(p.today).toBeTruthy();
    g.setView(p.id);
    const scene = new PointScene(g, p);
    scene.S.settings.reduceMotion = false;
    let sales = 0;
    scene.onSale = () => sales++;
    g.D.hour = 13;
    for (let i = 0; i < 4000; i++) scene.update(0.05);
    expect(sales).toBeGreaterThan(0);
    // the evening books exactly the day that was known
    const today = p.today!;
    g.endDay();
    expect(p.last).toEqual(today);
  });

  it('old saves: stands get their equipment and price', () => {
    const g = evening();
    const p = g.openPoint('park')!;
    delete p.upgrades;
    delete p.invested;
    delete p.away;
    normalizeState(g.S, g.D);
    expect(p.upgrades).toEqual({ sign: true });
    expect(p.invested).toBe(400);
    expect(p.away).toBeNull();
  });
});

describe('stand goods', () => {
  it('a stand pays for its cups the prices of the big packs at the wholesale warehouse', async () => {
    const { pointCupCost } = await import('../src/sim/points');
    const { WHOLESALE_UNIT_COST: u } = await import('../src/data/goods');
    const p: Point = { id: 1, loc: 'park', opened: 1, seller, issue: null, last: null, history: [], total: 0, upgrades: { sign: true } };
    // 4 lemons, 2 bottles of water, 2 spoons of sugar and 10 cups make 10 cups of lemonade
    expect(pointCupCost(p)).toBeCloseTo((4 * u.lemons + 2 * u.water + 2 * u.sugar + 10 * u.cups) / 10, 9);
    // a hand juicer saves a lemon there too
    p.upgrades = { sign: true, juicer_hand: true };
    expect(pointCupCost(p)).toBeCloseTo((3 * u.lemons + 2 * u.water + 2 * u.sugar + 10 * u.cups) / 10, 9);
  });
});

describe('a second worker at a stand', () => {
  it('only with a big stand or a truck; serves a queue of their own and keeps the stand open alone', async () => {
    const { pointCapacity, pointFixedCosts } = await import('../src/sim/points');
    const g = evening(31);
    const p = g.openPoint('park')!;
    g.hireSeller(p.id, 0);
    // a small table: no room for a second worker
    expect(g.hireSeller(p.id, 1, 'helper')).toBe(false);
    expect(p.helper).toBeNull();
    g.buyPointUpgrade(p.id, 'big_stand');
    const one = pointCapacity(p);
    const fixedOne = pointFixedCosts(g.S, p);
    expect(g.hireSeller(p.id, 1, 'helper')).toBe(true);
    const h = p.helper!;
    expect(h.nameId).not.toBe(p.seller!.nameId);
    expect(pointCapacity(p)).toBeGreaterThan(one * 1.5);
    expect(pointFixedCosts(g.S, p)).toBe(fixedOne + h.wage);
    // the people who work there are not offered again
    expect(g.candidates(p.id).some((c) => c.nameId === h.nameId || c.nameId === p.seller!.nameId)).toBe(false);
    // the seller is ill today: the second worker runs the stand alone
    p.issue = 'sick';
    const d = simulatePoint(g.S, p, 'sunny', NO_EVENTS, new RNG(2));
    expect(d.status).toBe('ok');
    expect(d.sold).toBeGreaterThan(0);
    expect(d.wage).toBe(h.wage);
    // a late seller: the second worker opens on time
    p.issue = 'late';
    expect(simulatePoint(g.S, p, 'sunny', NO_EVENTS, new RNG(2)).status).toBe('ok');
    p.issue = null;
    expect(g.fireHelper(p.id)).toBe(true);
    expect(p.helper).toBeNull();
  });
});
