import { describe, expect, it } from 'vitest';
import type { LocationId } from '../src/core/types';
import { LOCATIONS, LOCATION_IDS } from '../src/data/locations';
import { expectedDay } from '../src/sim/economy';
import { Game } from '../src/sim/game';
import { rollDayEvents } from '../src/sim/randomEvents';
import { NO_EVENTS, spawnRatePerHour, weatherPedFactor } from '../src/sim/traffic';

function freshGame(seed = 7): Game {
  const g = new Game(seed);
  g.newGame({ ageMode: 'pro', avatar: 'boy', lang: 'uk', seed });
  return g;
}

const OUTDOOR = LOCATION_IDS.filter((id) => !LOCATIONS[id].indoor);
const profit = (loc: LocationId, weather: 'rain' | 'hot' | 'sunny') =>
  expectedDay({ loc, weather, price: LOCATIONS[loc].fairPrice, upgrades: { sign: true, banner: true }, rep: 2, from: 10.5 }).profit;

describe('station and mall', () => {
  it('open with reputation (beach and station at 2, the mall and the bus stop at 3) and stay open even if it drops', () => {
    const g = freshGame();
    g.S.day = 5;
    expect(g.chooseLocation('station')).toBe(false);
    const cards: string[] = [];
    g.bus.on('card', (c) => cards.push(c.id));
    g.S.rep = 2.05;
    g.restDay();
    expect(g.D.report?.unlocked).toEqual(['beach', 'station']);
    expect(cards).toContain('locUnlocked');
    g.S.rep = 1.6;
    g.openShop();
    g.sleep();
    expect(g.phase).toBe('morning');
    expect(g.chooseLocation('station')).toBe(true);
    expect(g.S.location).toBe('station');
    expect(g.chooseLocation('mall')).toBe(false);
    // the same milestone does not repeat the card; the next one opens the mall and the bus stop
    g.restDay();
    expect(g.D.report?.unlocked).toEqual([]);
    g.S.rep = 3.02;
    g.openShop();
    g.sleep();
    g.restDay();
    expect(g.D.report?.unlocked).toEqual(['mall', 'busstop']);
  });

  it('rain brings people inside, while the street empties', () => {
    for (const id of ['station', 'mall'] as const) expect(weatherPedFactor(id, 'rain')).toBeGreaterThan(weatherPedFactor(id, 'sunny'));
    for (const id of OUTDOOR) expect(weatherPedFactor(id, 'rain')).toBeLessThan(weatherPedFactor(id, 'sunny'));
    // in the rain a roof wins; on a hot day the beach wins
    for (const id of OUTDOOR) {
      expect(profit('mall', 'rain')).toBeGreaterThan(profit(id, 'rain'));
      expect(profit('station', 'rain')).toBeGreaterThan(profit(id, 'rain'));
    }
    expect(profit('beach', 'hot')).toBeGreaterThan(profit('mall', 'hot'));
  });

  it('the rent is higher than outdoors, and the mall is the dearest', () => {
    const outdoorMax = Math.max(...OUTDOOR.map((id) => LOCATIONS[id].rent));
    expect(LOCATIONS.station.rent).toBeGreaterThan(outdoorMax);
    expect(LOCATIONS.mall.rent).toBeGreaterThan(LOCATIONS.station.rent);
  });

  it('place events change the crowd only at their place', () => {
    const base = spawnRatePerHour('station', 12, 'sunny', NO_EVENTS);
    expect(spawnRatePerHour('station', 12, 'sunny', { festival: false, trains: true })).toBeGreaterThan(1.5 * base);
    expect(spawnRatePerHour('station', 12, 'sunny', { festival: false, trackRepair: true })).toBeLessThan(0.6 * base);
    expect(spawnRatePerHour('park', 12, 'sunny', { festival: false, trains: true })).toBe(spawnRatePerHour('park', 12, 'sunny', NO_EVENTS));
    // a concert fills the mall in the evening; the street festival does not reach indoors
    expect(spawnRatePerHour('mall', 18, 'sunny', { festival: false, concert: true })).toBeGreaterThan(2 * spawnRatePerHour('mall', 18, 'sunny', NO_EVENTS));
    expect(spawnRatePerHour('mall', 18, 'sunny', { festival: true })).toBe(spawnRatePerHour('mall', 18, 'sunny', NO_EVENTS));
  });

  it('place events only happen once the place is open', () => {
    const g = freshGame(3);
    g.S.day = 10;
    let trains = 0;
    for (let i = 0; i < 200; i++) {
      rollDayEvents(g);
      if (g.D.events.trains || g.D.events.concert) trains++;
    }
    expect(trains).toBe(0);
    g.S.bestRep = 2;
    for (let i = 0; i < 200; i++) {
      rollDayEvents(g);
      if (g.D.events.trains || g.D.events.concert) trains++;
      // never two events at one place
      expect(g.D.events.trains && g.D.events.trackRepair).toBe(false);
      expect(g.D.events.concert && g.D.events.mallSale).toBe(false);
    }
    expect(trains).toBeGreaterThan(20);
  });

  it('an umbrella does nothing under a roof (and does not wear out there)', () => {
    const g = freshGame();
    g.S.day = 5;
    g.S.bestRep = 3;
    g.S.upgrades.umbrella = true;
    g.S.condition.umbrella = 100;
    g.chooseLocation('park');
    expect(g.active().umbrella).toBe(true);
    g.chooseLocation('mall');
    expect(g.active().umbrella).toBeUndefined();
    const withUmbrella = g.calcInterest().chance;
    delete g.S.upgrades.umbrella;
    expect(g.calcInterest().chance).toBeCloseTo(withUmbrella, 9);
  });
});
