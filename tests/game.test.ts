import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { Game } from '../src/sim/game';
import { lemonsTotal } from '../src/sim/state';
import { cook, playDay } from './bot';

function newGame(seed = 7): Game {
  const g = new Game(seed);
  g.newGame({ ageMode: 'pro', avatar: 'girl', lang: 'uk', seed });
  return g;
}

describe('day loop', () => {
  it('day 1 runs end to end and profit equals the change of coins', () => {
    const g = newGame();
    expect(g.phase).toBe('morning');
    expect(g.S.location).toBe('yard');
    const coins0 = g.S.coins;
    playDay(g, { buyUpgrades: false });
    const r = g.D.report!;
    expect(r).toBeTruthy();
    expect(g.S.coins - coins0).toBe(r.profit);
    expect(r.profit).toBe(r.income - r.expenses);
    expect(r.sold).toBeGreaterThan(5);
  });

  it('funnel numbers always add up and nothing goes negative', () => {
    const g = newGame(11);
    for (let i = 0; i < 12; i++) {
      if (g.phase !== 'morning') g.sleep();
      playDay(g, { catchThief: i % 2 === 0 });
      const f = g.D.report!.funnel;
      expect(f.stopped).toBe(f.tooExpensive + f.queueFull + f.soldOut + f.joined);
      expect(f.joined).toBeGreaterThanOrEqual(f.sold + f.impatient);
      expect(f.inRange).toBeLessThanOrEqual(f.passed);
      expect(f.stopped).toBeLessThanOrEqual(f.inRange);
      expect(g.S.coins).toBeGreaterThanOrEqual(0);
      expect(g.S.stock.water).toBeGreaterThanOrEqual(0);
      expect(g.S.stock.sugar).toBeGreaterThanOrEqual(0);
      expect(g.S.stock.cups).toBeGreaterThanOrEqual(0);
      expect(lemonsTotal(g.S.stock)).toBeGreaterThanOrEqual(0);
      expect(g.S.rep).toBeGreaterThanOrEqual(0);
      expect(g.S.rep).toBeLessThanOrEqual(5);
    }
  });

  it('day 3 is rainy (tutorial)', () => {
    const g = newGame();
    playDay(g);
    g.sleep();
    playDay(g);
    g.sleep();
    expect(g.S.day).toBe(3);
    expect(g.D.weather).toBe('rain');
  });

  it('lemons spoil after four nights', () => {
    const g = newGame();
    g.goMarket();
    g.setCart('lemon', 10);
    g.pay();
    expect(lemonsTotal(g.S.stock)).toBe(10);
    g.phase = 'shop';
    g.sleep(); // age 1
    g.phase = 'shop';
    g.sleep(); // 2
    g.phase = 'shop';
    g.sleep(); // 3
    expect(lemonsTotal(g.S.stock)).toBe(10);
    g.phase = 'shop';
    g.sleep(); // 4 → spoiled
    expect(lemonsTotal(g.S.stock)).toBe(0);
    expect(g.D.spoiledOvernight).toBe(10);
  });

  it('unsold lemonade is poured out at the end of the day', () => {
    const g = newGame();
    g.goMarket();
    g.setCart('lemon', 8);
    g.setCart('water', 4);
    g.setCart('sugar', 1);
    g.setCart('cups', 2);
    expect(g.pay()).toBe(true);
    expect(g.phase).toBe('kitchen');
    expect(cook(g, 2)).toBe(true);
    g.startSelling();
    expect(g.D.cupsReady).toBe(20);
    g.endDay();
    expect(g.D.report!.wastedCups).toBe(20);
    expect(g.D.cupsReady).toBe(0);
  });

  it('cheap lemons can be rotten', () => {
    const g = newGame(3);
    g.goMarket();
    g.setCart('lemon_cheap', 30);
    expect(g.pay()).toBe(true);
    const got = lemonsTotal(g.S.stock);
    expect(got).toBeLessThan(30);
    expect(got).toBeGreaterThan(15);
    expect(g.D.rottenToday).toBe(30 - got);
  });

  it('the thief steals at most 40 coins when not caught', () => {
    const g = newGame(5);
    g.goMarket();
    g.addPitcherKit();
    g.addPitcherKit();
    g.pay();
    cook(g, 2);
    g.startSelling();
    g.debugAddCoins(500);
    g.D.sales = 200;
    g.debugForceEvent('thief');
    const coins = g.S.coins;
    for (let i = 0; i < 200 && !g.D.thief.stolen; i++) g.update(0.05);
    expect(g.D.thief.appeared).toBe(true);
    expect(g.D.thief.stolen).toBe(CONFIG.THIEF_MAX);
    expect(g.S.coins).toBeLessThanOrEqual(coins - CONFIG.THIEF_MAX + 50);
  });

  it('catching the thief gives a reward', () => {
    const g = newGame(5);
    g.goMarket();
    g.addPitcherKit();
    g.pay();
    cook(g, 1);
    g.startSelling();
    g.debugForceEvent('thief');
    for (let i = 0; i < 5; i++) g.update(0.05);
    // three taps: he speeds up after each one
    expect(g.hitThief()).toBe('hit');
    const speed = g.street.thief!.speed;
    expect(speed).toBeCloseTo(CONFIG.THIEF_SPEED * CONFIG.THIEF_SPEED_MULT, 6);
    expect(g.street.thief!.state).toBe('dodge');
    expect(g.D.bonus).toBe(0);
    expect(g.hitThief()).toBe('hit');
    expect(g.hitThief()).toBe('caught');
    expect(g.D.bonus).toBe(CONFIG.THIEF_REWARD);
    expect(g.hitThief()).toBeNull();
  });

  it('save and restore keep the exact state', () => {
    const g = newGame(9);
    playDay(g);
    const snap = g.snapshot();
    const g2 = new Game(1);
    g2.restore(JSON.parse(JSON.stringify(snap)));
    expect(g2.S).toEqual(g.S);
    expect(g2.D).toEqual(g.D);
    expect(g2.phase).toBe(g.phase);
    expect(g2.rng.state).toBe(g.rng.state);
  });

  it('the speaker lets the stand reach the far lane', () => {
    const g = newGame(13);
    g.S.upgrades.speaker = true;
    g.S.speakerOn = true;
    g.refreshInterest();
    const withSpeaker = g.radius;
    g.toggleSpeaker();
    expect(g.radius).toBeLessThan(withSpeaker);
    expect(withSpeaker).toBeGreaterThan(CONFIG.LANES[1].y - CONFIG.STAND.y - CONFIG.LANE_JITTER);
  });
});
