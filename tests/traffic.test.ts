import { describe, expect, it } from 'vitest';
import type { LocationId, WeatherId } from '../src/core/types';
import { LOCATIONS, LOCATION_IDS } from '../src/data/locations';
import { expectedDay } from '../src/sim/economy';
import { passersBetween, spawnRatePerHour, weatherPedFactor } from '../src/sim/traffic';

const day = (loc: LocationId, weather: WeatherId = 'sunny', price = LOCATIONS[loc].fairPrice) =>
  expectedDay({ loc, weather, price, upgrades: {}, from: 10 });

describe('foot traffic', () => {
  it('weather hurts the beach far more than the yard', () => {
    const beach = weatherPedFactor('beach', 'rain') / weatherPedFactor('beach', 'sunny');
    const yard = weatherPedFactor('yard', 'rain') / weatherPedFactor('yard', 'sunny');
    expect(beach).toBeLessThan(0.1);
    expect(yard).toBeGreaterThan(0.4);
  });

  it('school has short crowded breaks', () => {
    expect(spawnRatePerHour('school', 12.5, 'sunny', false)).toBeGreaterThan(5 * spawnRatePerHour('school', 14, 'sunny', false));
  });

  it('festival brings more people', () => {
    expect(passersBetween('park', 'sunny', 10, 20, true)).toBeGreaterThan(passersBetween('park', 'sunny', 10, 20, false));
  });

  it('locations teach different lessons', () => {
    const yard = day('yard');
    const park = day('park');
    const school = day('school', 'sunny', 5);
    const beachHot = day('beach', 'hot');
    const beachRain = day('beach', 'rain');
    // the school is busier than the yard, but each passer brings the least profit
    expect(school.passers).toBeGreaterThan(yard.passers);
    for (const id of LOCATION_IDS) {
      if (id === 'school') continue;
      expect(school.profitPerPasser).toBeLessThan(day(id).profitPerPasser);
    }
    // the beach is the best place on a hot day and the worst in the rain
    expect(beachHot.profit).toBeGreaterThan(park.profit);
    expect(beachHot.profit).toBeGreaterThan(yard.profit);
    expect(beachRain.profit).toBeLessThan(day('yard', 'rain').profit);
    expect(beachRain.profit).toBeLessThan(0);
    // the yard is safe: free and still profitable in the rain
    expect(day('yard', 'rain').profit).toBeGreaterThan(0);
  });

  it('a first day at the yard sells around a pitcher', () => {
    const d = day('yard', 'sunny', 8);
    expect(d.buyers).toBeGreaterThan(8);
    expect(d.buyers).toBeLessThan(20);
  });
});
