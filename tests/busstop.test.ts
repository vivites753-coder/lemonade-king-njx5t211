// The bus stop (reputation 3): buses stop at the shelter and let out waves of people; two place events.
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/core/config';
import { LOCATIONS, LOCATION_IDS, locationUnlocked } from '../src/data/locations';
import { LOC_EVENTS } from '../src/data/events';
import { rollDayEvents } from '../src/sim/randomEvents';
import { Game } from '../src/sim/game';
import { NO_EVENTS, passersBetween, spawnRatePerHour, weatherPedFactor } from '../src/sim/traffic';
import type { Car } from '../src/sim/street';
import { cook } from './bot';

const STOP = LOCATIONS.busstop;

function freshGame(seed = 41, loc: 'busstop' | 'park' = 'busstop'): Game {
  const g = new Game(seed);
  g.newGame({ ageMode: 'pro', avatar: 'boy', lang: 'uk', seed });
  g.S.day = 6;
  g.S.bestRep = 3;
  g.S.rep = 3;
  g.debugAddCoins(800);
  g.D.weather = 'sunny';
  g.chooseLocation(loc);
  g.goMarket();
  for (let i = 0; i < 4; i++) g.addPitcherKit();
  g.pay();
  cook(g, 4);
  g.setPrice(LOCATIONS[loc].fairPrice);
  expect(g.startSelling()).toBe(true);
  return g;
}

/** Runs the selling day with nobody serving; calls `each` after every step. */
function runDay(g: Game, each: (g: Game) => void): void {
  g.setSpeed(4);
  for (let i = 0; i < 100000 && g.phase === 'sell'; i++) {
    g.update(0.05);
    each(g);
  }
}

describe('the place', () => {
  it('opens at reputation 3, outdoors, with a rent below the station', () => {
    expect(LOCATION_IDS).toContain('busstop');
    expect(STOP.minRep).toBe(3);
    expect(STOP.indoor).toBeFalsy();
    expect(locationUnlocked(2.9, 'busstop')).toBe(false);
    expect(locationUnlocked(3, 'busstop')).toBe(true);
    expect(STOP.rent).toBeLessThan(LOCATIONS.station.rent);
    expect(STOP.bus).toBeDefined();
  });

  it('people wait for their bus: rain keeps more of them here than in the park', () => {
    expect(weatherPedFactor('busstop', 'rain')).toBeGreaterThan(weatherPedFactor('park', 'rain'));
    expect(weatherPedFactor('busstop', 'rain')).toBeLessThan(weatherPedFactor('busstop', 'sunny'));
  });

  it('has its rush hours in the morning and after work', () => {
    const c = STOP.hourCurve;
    expect(c(9)).toBeGreaterThan(c(11));
    expect(c(17.5)).toBeGreaterThan(c(14));
    expect(c(17.5)).toBeGreaterThan(c(21));
  });
});

describe('place events of the bus stop', () => {
  it('extra buses bring more people, a road repair fewer, only at the bus stop', () => {
    const base = spawnRatePerHour('busstop', 12, 'sunny', NO_EVENTS);
    expect(spawnRatePerHour('busstop', 12, 'sunny', { festival: false, busRush: true })).toBeGreaterThan(1.5 * base);
    expect(spawnRatePerHour('busstop', 12, 'sunny', { festival: false, busStrike: true })).toBeLessThan(0.6 * base);
    expect(spawnRatePerHour('park', 12, 'sunny', { festival: false, busRush: true })).toBe(spawnRatePerHour('park', 12, 'sunny', NO_EVENTS));
    expect(LOC_EVENTS.filter((e) => e.loc === 'busstop').map((e) => e.id).sort()).toEqual(['busRush', 'busStrike']);
  });

  it('happen only once the bus stop is open, and never both on one day', () => {
    const g = new Game(5);
    g.newGame({ ageMode: 'pro', avatar: 'boy', lang: 'uk', seed: 5 });
    g.S.day = 10;
    g.S.bestRep = 2;
    let early = 0;
    for (let i = 0; i < 200; i++) {
      rollDayEvents(g);
      if (g.D.events.busRush || g.D.events.busStrike) early++;
    }
    expect(early).toBe(0);
    g.S.bestRep = 3;
    let seen = 0;
    for (let i = 0; i < 300; i++) {
      rollDayEvents(g);
      if (g.D.events.busRush || g.D.events.busStrike) seen++;
      expect(g.D.events.busRush && g.D.events.busStrike).toBe(false);
    }
    expect(seen).toBeGreaterThan(40);
  });
});

describe('buses and the people who get off them', () => {
  it('a bus stops at its stop, people get off one by one and walk away, then it drives on', () => {
    const g = freshGame();
    let stops = 0;
    let busy = false;
    const gotOff: number[] = [];
    let inBurst = 0;
    runDay(g, (gg) => {
      const buses = gg.street.cars.filter((c) => c.bus);
      expect(buses.length).toBeLessThanOrEqual(2);
      for (const c of buses) {
        expect(c.bus!.released).toBeLessThanOrEqual(c.bus!.load);
        expect(Number.isFinite(c.x)).toBe(true);
        // it stands only in the lane of the kerb, and only at its stop
        if (c.bus!.state === 'dwell') {
          expect(c.x).toBeCloseTo(STOP.bus!.stopX, 6);
          expect(c.speed).toBe(0);
        }
      }
      const dwelling = buses.find((c) => c.bus!.state === 'dwell');
      if (dwelling && !busy) {
        stops++;
        inBurst = 0;
      }
      busy = !!dwelling;
      if (dwelling) {
        // the people who have just got off stand by the door
        const atDoor = gg.street.peds.filter((p) => p.y > 5.6 && Math.abs(p.x - dwelling.x) < 1.2).length;
        inBurst = Math.max(inBurst, atDoor);
      }
      if (!busy && inBurst) {
        gotOff.push(inBurst);
        inBurst = 0;
      }
    });
    expect(stops).toBeGreaterThan(4);
    // a wave: several people at once at the door
    expect(Math.max(...gotOff)).toBeGreaterThanOrEqual(3);
  });

  it('the people who come by bus are their share of the crowd, and the crowd is the usual one', () => {
    const g = freshGame(52);
    const start = g.D.hour;
    let byBus = 0;
    const done = new Set<object>();
    runDay(g, (gg) => {
      for (const c of gg.street.cars) {
        if (c.bus && c.bus.state === 'out' && !done.has(c.bus)) {
          done.add(c.bus);
          byBus += c.bus.load;
        }
      }
    });
    const passed = g.D.report!.funnel.passed;
    // the same number of people as without buses (the day's busy factor and the weather are in the events)
    const expected = passersBetween('busstop', 'sunny', start, CONFIG.DAY_END, g.D.events);
    expect(passed).toBeGreaterThan(expected * 0.7);
    expect(passed).toBeLessThan(expected * 1.3);
    expect(byBus / passed).toBeGreaterThan(STOP.bus!.share - 0.15);
    expect(byBus / passed).toBeLessThan(STOP.bus!.share + 0.15);
  });

  it('is the same day every time for the same seed (the buses do not use the traffic dice)', () => {
    const run = () => {
      const g = freshGame(63);
      runDay(g, () => undefined);
      return { passed: g.D.report!.funnel.passed, rep: g.S.rep, coins: g.S.coins };
    };
    expect(run()).toEqual(run());
  });

  it('there are no buses at a place without a bus stop', () => {
    const g = freshGame(41, 'park');
    let buses = 0;
    runDay(g, (gg) => {
      buses += gg.street.cars.filter((c) => c.bus).length;
    });
    expect(buses).toBe(0);
  });

  it('cars wait behind a bus that stands, and drive on afterwards (they do not stay slow)', () => {
    const g = new Game(9);
    g.newGame({ ageMode: 'pro', avatar: 'boy', lang: 'uk', seed: 9 });
    g.S.day = 6;
    g.S.bestRep = 3;
    expect(g.chooseLocation('busstop')).toBe(true);
    const st = g.street;
    const stopX = STOP.bus!.stopX;
    st.cars.length = 0;
    const bus: Car = { x: stopX, y: 6.5, dir: -1, speed: 0, cruise: 2.2, color: '#2f9e44', variant: 5, bus: { state: 'dwell', t: 0, load: 40, released: 0 } };
    const car: Car = { x: stopX + 3.4, y: 6.5, dir: -1, speed: 3, cruise: 3, color: '#ffffff', variant: 0 };
    st.cars.push(bus, car);
    for (let i = 0; i < 120; i++) st.update(0.05);
    // the car stopped behind the standing bus, a bus length away
    expect(bus.bus!.state).toBe('dwell');
    expect(car.speed).toBe(0);
    expect(car.x - bus.x).toBeCloseTo(2.7, 6);
    // the bus drives off: the car is not slow any more
    st.cars.splice(st.cars.indexOf(bus), 1);
    st.update(0.05);
    expect(car.speed).toBe(car.cruise);
  });

  it('a bus leaves its stop by itself after the people got off, and the next one waits for it', () => {
    const g = freshGame(88);
    let out = 0;
    const seen = new Set<object>();
    let together = 0;
    runDay(g, (gg) => {
      const buses = gg.street.cars.filter((c) => c.bus);
      for (const c of buses) {
        if (c.bus!.state === 'out' && !seen.has(c.bus!)) {
          seen.add(c.bus!);
          out++;
          expect(c.bus!.released).toBe(c.bus!.load);
        }
      }
      // never two buses at the stop (one standing or arriving at a time)
      if (buses.filter((c) => c.bus!.state !== 'out').length > 1) together++;
    });
    expect(out).toBeGreaterThan(5);
    expect(together).toBe(0);
  });
});
