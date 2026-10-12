// How many people walk past: depends on the location, the hour, the weather and events — never on the player.
import { CONFIG } from '../core/config';
import type { LocationId, WeatherId } from '../core/types';
import { FESTIVAL_PED, LOC_EVENTS, type LocEventId } from '../data/events';
import { LOCATIONS } from '../data/locations';
import { WEATHER } from '../data/weather';

/** The day's events that change the crowd. */
export type Crowd = { festival: boolean } & Partial<Record<LocEventId, boolean>>;

export const NO_EVENTS: Crowd = { festival: false };

export function weatherPedFactor(loc: LocationId, weather: WeatherId): number {
  const w = WEATHER[weather];
  return Math.max(0.05, 1 + (w.ped - 1) * LOCATIONS[loc].weatherSensitivity);
}

/** Crowd multiplier from today's events at this place (the city festival is outdoors only). */
export function eventPedFactor(loc: LocationId, hour: number, ev: Crowd): number {
  let m = ev.festival && !LOCATIONS[loc].indoor ? FESTIVAL_PED : 1;
  for (const e of LOC_EVENTS) if (e.loc === loc && ev[e.id]) m *= e.ped(hour);
  return m;
}

/** A place event that makes people stop more often (a concert at the mall), with its "Why?" key. */
export function placeEventStop(loc: LocationId, ev: Crowd): { key: string; mult: number } | undefined {
  const e = LOC_EVENTS.find((x) => x.loc === loc && x.stop && ev[x.id]);
  return e ? { key: `why.ev.${e.id}`, mult: e.stop! } : undefined;
}

/** Pedestrians per game hour. */
export function spawnRatePerHour(loc: LocationId, hour: number, weather: WeatherId, ev: Crowd): number {
  const l = LOCATIONS[loc];
  return l.density * l.hourCurve(hour) * weatherPedFactor(loc, weather) * eventPedFactor(loc, hour, ev);
}

/** Expected pedestrians between two hours (numeric integration). */
export function passersBetween(loc: LocationId, weather: WeatherId, from: number, to: number, ev: Crowd): number {
  const step = 1 / 60;
  let sum = 0;
  for (let h = from; h < to; h += step) sum += spawnRatePerHour(loc, h + step / 2, weather, ev) * step;
  return sum;
}

/** Share of all passers on the near lane (always inside the base radius). */
export function nearShare(radius: number): number {
  const lane = CONFIG.LANES[0];
  return radius >= lane.y + CONFIG.LANE_JITTER - CONFIG.STAND.y ? lane.weight : lane.weight * 0.5;
}
