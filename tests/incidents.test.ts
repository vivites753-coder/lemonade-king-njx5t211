import { describe, expect, it } from 'vitest';
import { BONUSES, INCIDENT } from '../src/data/incidents';
import { Game } from '../src/sim/game';
import { cook } from './bot';

function selling(seed = 21, helpers = 0): Game {
  const g = new Game(seed);
  g.newGame({ ageMode: 'pro', avatar: 'girl', lang: 'uk', seed });
  g.S.day = 8;
  g.devSetRep(2.5);
  g.devGift(300);
  g.goMarket();
  g.addPitcherKit();
  g.addPitcherKit();
  g.pay();
  cook(g, 2);
  g.setHelpers(helpers);
  g.startSelling();
  return g;
}

/** Start an incident now and let the day run a moment. */
function trigger(g: Game, id: string): void {
  g.devIncident(id);
  g.update(0.05);
}

describe('accidents', () => {
  it('a running boy spills cups, and the report counts them', () => {
    const g = selling();
    const cups = g.D.cupsReady;
    trigger(g, 'runner');
    expect(g.D.cupsReady).toBeLessThan(cups);
    expect(g.D.spilled).toBe(cups - g.D.cupsReady);
    expect(g.critters.list.some((c) => c.kind === 'runner')).toBe(true);
    g.endDay();
    expect(g.D.report!.spilled).toBeGreaterThan(0);
  });

  it('a football breaks the pitcher (up to 10 cups)', () => {
    const g = selling();
    trigger(g, 'football');
    expect(g.D.spilled).toBe(10);
  });

  it('a blackout switches off electric things for a while', () => {
    const g = selling();
    g.S.upgrades.speaker = true;
    g.S.condition.speaker = 100;
    expect(g.active().speaker).toBe(true);
    trigger(g, 'blackout');
    expect(g.active().speaker).toBeUndefined();
    g.D.hour = g.D.blackoutUntil + 0.01;
    g.update(0.05);
    expect(g.D.blackoutUntil).toBe(0);
    expect(g.active().speaker).toBe(true);
  });

  it('stray dogs scare customers for an hour', () => {
    const g = selling();
    const before = g.interest.chance;
    trigger(g, 'dogs');
    expect(g.interest.chance).toBeCloseTo(before * INCIDENT.DOGS_STOP, 5);
    expect(g.critters.list.filter((c) => c.kind === 'dog')).toHaveLength(3);
  });

  it('helper accidents need a helper', () => {
    const g = selling();
    g.D.sales = 100;
    const coins = g.S.coins;
    trigger(g, 'helperStole');
    expect(g.S.coins).toBe(coins);
    const h = selling(21, 1);
    h.D.sales = 100;
    const c2 = h.S.coins;
    trigger(h, 'helperStole');
    expect(h.S.coins).toBe(c2 - 25);
    expect(h.D.expenses.stolen).toBe(25);
  });
});

describe('lucky finds', () => {
  it('tapping the lost cat pays the reward as a gift', () => {
    const g = selling();
    trigger(g, 'cat');
    const cat = g.critters.list.find((c) => c.kind === 'cat')!;
    expect(cat.bonus).toBe(true);
    const coins = g.S.coins;
    expect(g.tapCritter(cat.id)).toBe(true);
    const reward = BONUSES.find((b) => b.id === 'cat')!.reward;
    expect(g.S.coins).toBe(coins + reward);
    expect(g.D.bonus).toBe(reward);
    expect(g.tapCritter(cat.id)).toBe(false);
  });

  it('accidents cannot be tapped for money', () => {
    const g = selling();
    trigger(g, 'runner');
    const r = g.critters.list.find((c) => c.kind === 'runner')!;
    expect(g.tapCritter(r.id)).toBe(false);
  });
});
