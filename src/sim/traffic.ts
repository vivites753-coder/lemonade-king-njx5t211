// How many people walk past: depends on the location, the hour, the weather and events — never on the player.
import { CONFIG } from '../core/config';
import type { LocationId, WeatherId } from '../core/types';
import { FESTIVAL_PED } from '../data/events';
import { LOCATIONS } from '../data/locations';
import { WEATHER } from '../data/weather';

export function weatherPedFactor(loc: LocationId, weather: WeatherId): number {
  const w = WEATHER[weather];
  return Math.max(0.05, 1 + (w.ped - 1) * LOCATIONS[loc].weatherSensitivity);
}

/** Pedestrians per game hour. */
export function spawnRatePerHour(loc: LocationId, hour: number, weather: WeatherId, festival: boolean): number {
  const l = LOCATIONS[loc];
  return l.density * l.hourCurve(hour) * weatherPedFactor(loc, weather) * (festival ? FESTIVAL_PED : 1);
}

/** Expected pedestrians between two hours (numeric integration). */
export function passersBetween(loc: LocationId, weather: WeatherId, from: number, to: number, festival: boolean): number {
  const step = 1 / 60;
  let sum = 0;
  for (let h = from; h < to; h += step) sum += spawnRatePerHour(loc, h + step / 2, weather, festival) * step;
  return sum;
}

/** Share of all passers on the near lane (always inside the base radius). */
export function nearShare(radius: number): number {
  const lane = CONFIG.LANES[0];
  return radius >= lane.y + CONFIG.LANE_JITTER - CONFIG.STAND.y ? lane.weight : lane.weight * 0.5;
}
