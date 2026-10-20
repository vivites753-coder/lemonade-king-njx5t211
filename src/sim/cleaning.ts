// The floor of the own store (level 4): the customers bring dirt in (spilt lemonade, crumbs, muddy shoes on a rainy
// day) and the stains stay, overnight too, until somebody wipes them off: the player with a tap, or a hired cleaner. A
// dirty floor puts people off, pleases the customers less and keeps the tips away.
import { CONFIG } from '../core/config';
import { RNG } from '../core/rng';
import type { LocationId, Vec, WeatherId } from '../core/types';
import { LOCATIONS } from '../data/locations';
import { ROOM_D, STORE_COUNTER_DY } from '../data/storeRoom';
import type { GameState, Stain, StoreState } from './state';

const spotCache = new Map<LocationId, Vec[]>();

/**
 * Where stains can be on the floor of a store: in front of the counter, not under the tables, chairs and plants, and
 * not so close to the low front and side walls that the walls hide them (a wall 30 px high hides about a tile of floor
 * behind it).
 */
export function stainSpots(loc: LocationId): Vec[] {
  const cached = spotCache.get(loc);
  if (cached) return cached;
  const things = LOCATIONS[loc].decor.filter((d) => d.y < ROOM_D);
  const out: Vec[] = [];
  const front = CONFIG.STAND.y + STORE_COUNTER_DY + 0.45;
  let i = 0;
  for (let y = front; y <= ROOM_D - 1.05; y += 0.45) {
    for (let x = 0.6; x <= 10.9; x += 0.55) {
      // a little off the grid, so that the stains do not stand in rows
      const at = { x: x + ((i * 37) % 7 - 3) * 0.04, y: y + ((i * 53) % 5 - 2) * 0.03 };
      i++;
      if (things.every((d) => Math.hypot(d.x - at.x, d.y - at.y) > 0.85)) out.push(at);
    }
  }
  spotCache.set(loc, out);
  return out;
}

/** The share of the floor that is dirty (0: clean, 1: full of stains). */
export function dirtShare(st: StoreState | undefined): number {
  return st ? Math.min(1, (st.stains?.length ?? 0) / CONFIG.STAINS_MAX) : 0;
}

/** How clean the floor is, in per cent (shown to the player). */
export function cleanPct(st: StoreState | undefined): number {
  return Math.round((1 - dirtShare(st)) * 100);
}

/** The dirt one served customer brings in today (stains' worth): more on a rainy day. */
export function dirtPerCustomer(weather: WeatherId): number {
  return CONFIG.DIRT_PER_CUSTOMER * (weather === 'rain' ? CONFIG.DIRT_RAIN : 1);
}

/**
 * Dirt comes in (`n` stains' worth): a new stain each time a whole one has gathered, on a free spot of the floor (a
 * floor full of stains gets no dirtier). Returns the stains added.
 */
export function addDirt(S: GameState, loc: LocationId, n: number, weather: WeatherId): number {
  const st = S.stores[loc];
  if (!st || n <= 0) return 0;
  const stains = (st.stains ??= []);
  let dirt = (st.dirt ?? 0) + n;
  let added = 0;
  while (dirt >= 1 && stains.length < CONFIG.STAINS_MAX) {
    dirt -= 1;
    stains.push(newStain(S, loc, stains, weather));
    added++;
  }
  st.dirt = stains.length >= CONFIG.STAINS_MAX ? 0 : dirt;
  return added;
}

/** A new stain on a free spot (its own dice: the game's dice are not touched). */
function newStain(S: GameState, loc: LocationId, stains: Stain[], weather: WeatherId): Stain {
  const all = stainSpots(loc);
  const rng = new RNG((S.seed ^ Math.imul(S.day, 7919) ^ Math.imul(stains.length + 1, 104729) ^ Math.imul(S.totals.sold + 1, 2654435761)) >>> 0);
  const free = all.filter((s) => stains.every((o) => Math.hypot(o.x - s.x, o.y - s.y) > 0.6));
  const from = free.length ? free : all;
  const at = from[rng.int(0, from.length - 1)];
  // a rainy day brings mud on the shoes; otherwise spilt lemonade or crumbs
  const k: Stain['k'] = weather === 'rain' && rng.chance(0.6) ? 1 : rng.chance(0.6) ? 0 : 2;
  return { x: at.x, y: at.y, k };
}

/** A stain is wiped off (true when it was there). */
export function wipeStain(st: StoreState, s: Stain): boolean {
  const i = st.stains?.indexOf(s) ?? -1;
  if (i < 0) return false;
  st.stains!.splice(i, 1);
  return true;
}
