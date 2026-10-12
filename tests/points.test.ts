import { describe, expect, it } from 'vitest';
import { RNG } from '../src/core/rng';
import { POINTS } from '../src/data/staff';
import type { CardInfo } from '../src/sim/game';
import { Game } from '../src/sim/game';
import { rollTheft, simulatePoint, type Point } from '../src/sim/points';
import { NO_EVENTS } from '../src/sim/traffic';

function freshGame(seed = 11): Game {
  const g = new Game(seed);
  g.newGame({ ageMode: 'pro', avatar: 'girl', lang: 'uk', seed });
  return g;
}

/** A game in the evening shop with reputation for stands and some money. */
function eveningWithStands(seed = 11): Game {
  const g = freshGame(seed);
  g.S.day = 20;
  g.S.rep = 3.1;
  g.S.bestRep = 3.1;
  g.S.coins = 2000;
  g.restDay();
  g.openShop();
  return g;
}

describe('my stands', () => {
  it('open only with reputation 3, only in the evening, and cost money', () => {
    const g = freshGame();
    g.S.coins = 2000;
    expect(g.canOpenPoint('park').reason).toBe('locked');
    g.S.bestRep = 3;
    expect(g.canOpenPoint('park').reason).toBe('evening');
    g.restDay();
    g.openShop();
    expect(g.canOpenPoint('yard').ok).toBe(false); // home is always the player's own place
    expect(g.canOpenPoint('mall').ok).toBe(true);
    const coins = g.S.coins;
    const p = g.openPoint('mall')!;
    expect(g.S.coins).toBe(coins - POINTS.COST);
    expect(g.canOpenPoint('mall').reason).toBe('taken');
    expect(p.seller).toBeNull();
  });

  it('a stand needs a seller; candidates are the same all day and do not touch the game dice', () => {
    const g = eveningWithStands();
    const p = g.openPoint('park')!;
    const state = g.rng.state;
    const a = g.candidates(p.id);
    const b = g.candidates(p.id);
    expect(a).toEqual(b);
    expect(g.rng.state).toBe(state);
    // better sellers ask for more on average
    expect(g.hireSeller(p.id, 1)).toBe(true);
    expect(p.seller?.nameId).toBe(a[1].nameId);
    expect(g.hireSeller(p.id, 0)).toBe(false); // already has one
  });

  it('the day of every stand is in the report, and the money adds up', () => {
    const g = eveningWithStands();
    const p = g.openPoint('park')!;
    g.hireSeller(p.id, 0);
    g.sleep();
    g.D.weather = 'sunny';
    for (const x of g.S.points) x.issue = null;
    g.restDay();
    const r = g.D.report!;
    expect(r.points).toHaveLength(1);
    expect(r.points[0].sold).toBeGreaterThan(0);
    expect(r.pointsProfit).toBe(r.points[0].profit);
    expect(g.S.coins - g.D.coinsStart).toBe(r.profit);
    expect(p.history).toHaveLength(1);
    expect(p.total).toBe(r.points[0].profit);
  });

  it('fixed costs: in the rain an outdoor stand loses money, a stand under a roof earns', () => {
    const g = eveningWithStands();
    const rng = new RNG(5);
    const seller = { nameId: 1, wage: 30, skill: 0.85, honesty: 1, refs: true, warnings: 0, hiredDay: 1 };
    const mk = (loc: 'park' | 'mall'): Point => ({ id: 1, loc, opened: 1, seller, issue: null, last: null, history: [], total: 0 });
    const avg = (loc: 'park' | 'mall', w: 'rain' | 'sunny') => {
      let sum = 0;
      for (let i = 0; i < 50; i++) sum += simulatePoint(g.S, mk(loc), w, NO_EVENTS, rng).profit;
      return sum / 50;
    };
    expect(avg('park', 'sunny')).toBeGreaterThan(50);
    expect(avg('park', 'rain')).toBeLessThan(0);
    expect(avg('mall', 'rain')).toBeGreaterThan(50);
  });

  it('a sick seller closes the stand for the day without costs', () => {
    const g = eveningWithStands();
    const seller = { nameId: 8, wage: 30, skill: 0.85, honesty: 1, refs: true, warnings: 0, hiredDay: 1 };
    const d = simulatePoint(g.S, { id: 1, loc: 'park', opened: 1, seller, issue: 'sick', last: null, history: [], total: 0 }, 'sunny', NO_EVENTS, new RNG(1));
    expect(d.status).toBe('sick');
    expect(d.profit).toBe(0);
  });

  it('a dishonest seller takes money; a second chance makes it more likely', () => {
    const rng = new RNG(9);
    const seller = { nameId: 2, wage: 30, skill: 0.85, honesty: 0.2, refs: false, warnings: 0, hiredDay: 1 };
    const p: Point = { id: 1, loc: 'park', opened: 1, seller, issue: null, last: null, history: [], total: 0 };
    let thefts = 0;
    for (let i = 0; i < 200; i++) {
      const d = { day: 1, status: 'ok' as const, sold: 30, revenue: 300, ingredients: 100, rent: 20, wage: 30, stolen: 0, profit: 150 };
      if (rollTheft(p, d, rng) > 0) {
        thefts++;
        expect(d.profit).toBe(150 - d.stolen);
      }
    }
    expect(thefts).toBeGreaterThan(60);

    const g = eveningWithStands();
    const q = g.openPoint('park')!;
    g.hireSeller(q.id, 0);
    q.issue = 'stole';
    const honesty = q.seller!.honesty;
    g.workerChoice(q.id, 'chance');
    expect(q.seller!.honesty).toBeCloseTo(honesty - POINTS.SECOND_CHANCE_HONESTY, 9);
    q.issue = 'stole';
    g.workerChoice(q.id, 'fire');
    expect(q.seller).toBeNull();
  });

  it('worker problems come as cards with choices, and the choices work', () => {
    const g = eveningWithStands(4);
    const p = g.openPoint('park')!;
    g.hireSeller(p.id, 0);
    p.seller!.skill = 0.6; // a clumsy seller: late and rude more often
    const cards: CardInfo[] = [];
    g.bus.on('card', (c) => cards.push(c));
    for (let i = 0; i < 60 && cards.filter((c) => c.point).length < 3; i++) {
      g.sleep();
      g.restDay();
      if (!p.seller) g.hireSeller(p.id, 0);
      g.openShop();
    }
    const staff = cards.filter((c) => c.point === p.id);
    expect(staff.length).toBeGreaterThan(0);
    for (const c of staff) if (c.id !== 'staff.sick' && c.id !== 'staff.quit') expect(c.choices?.length).toBeGreaterThan(0);

    // training costs money, makes the seller better and counts as today's expense
    p.seller ??= g.candidates(p.id)[0];
    const skill = p.seller.skill;
    const coins = g.S.coins;
    p.issue = 'rude';
    g.workerChoice(p.id, 'train');
    expect(g.S.coins).toBe(coins - POINTS.TRAIN_COST);
    expect(g.D.expenses.training).toBe(POINTS.TRAIN_COST);
    expect(p.seller.skill).toBeGreaterThan(skill);
    // three times late and the only choice left is to fire
    p.seller.warnings = POINTS.MAX_WARNINGS - 1;
    p.issue = 'late';
    (g as unknown as { staffCard(p: Point): void }).staffCard(p);
    expect(cards[cards.length - 1].choices?.map((c) => c.act)).toEqual(['fire']);
  });

  it('the player cannot sell where their own stand works', () => {
    const g = eveningWithStands();
    const p = g.openPoint('park')!;
    g.hireSeller(p.id, 0);
    g.S.location = 'park';
    g.sleep();
    expect(g.S.location).toBe('yard');
    expect(g.chooseLocation('park')).toBe(false);
    expect(g.chooseLocation('beach')).toBe(true);
  });
});
