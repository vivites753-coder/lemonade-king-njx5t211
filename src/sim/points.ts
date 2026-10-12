// "My stands": extra stands at other places, run by hired sellers. The player does not see them working:
// each one is simulated in a single step at the end of the day, and only the numbers come back.
import { CONFIG } from '../core/config';
import { RNG } from '../core/rng';
import type { LocationId, WeatherId } from '../core/types';
import { LOCATIONS, LOCATION_IDS, locationUnlocked } from '../data/locations';
import { POINTS, SELLER_NAMES, type WorkerIssue } from '../data/staff';
import { costPerCup, expectedDay, type Owned } from './economy';
import type { GameState } from './state';
import type { Crowd } from './traffic';

export interface Seller {
  /** i18n `staff.name<N>`; 1…6 are girls' names, 7…12 boys'. */
  nameId: number;
  wage: number;
  /** 0.6–1.1: how fast and friendly. Shown as 1–5 stars. */
  skill: number;
  /** 0–1, hidden. Good references mean an honest person. */
  honesty: number;
  refs: boolean;
  warnings: number;
  hiredDay: number;
}

export type PointStatus = 'ok' | 'late' | 'rude' | 'sick' | 'empty';

export interface PointDay {
  day: number;
  status: PointStatus;
  sold: number;
  revenue: number;
  ingredients: number;
  rent: number;
  wage: number;
  stolen: number;
  profit: number;
}

export interface Point {
  id: number;
  loc: LocationId;
  opened: number;
  seller: Seller | null;
  /** Today's problem with the seller (rolled in the morning, a theft in the evening). */
  issue: WorkerIssue | null;
  last: PointDay | null;
  /** Profit of the last 7 days. */
  history: number[];
  total: number;
}

/** A stand of your own at another place: the basics and a sign. */
export const POINT_UPGRADES: Owned = { sign: true };
const RECIPE = { lemons: CONFIG.IDEAL_LEMONS, sugar: CONFIG.IDEAL_SUGAR };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function pointsOpen(S: GameState): boolean {
  return S.bestRep >= POINTS.MIN_REP - 1e-9;
}

export function pointAt(S: GameState, loc: LocationId): Point | undefined {
  return S.points.find((p) => p.loc === loc);
}

/** Places where a new stand can go: open for the player, not home (home is always yours), not taken. */
export function freePlaces(S: GameState): LocationId[] {
  return LOCATION_IDS.filter((id) => id !== 'yard' && locationUnlocked(S.bestRep, id) && !pointAt(S, id));
}

export function skillStars(skill: number): number {
  return clamp(1 + Math.round((skill - 0.6) / 0.125), 1, 5);
}

export function isGirl(nameId: number): boolean {
  return nameId <= SELLER_NAMES / 2;
}

/** People who want the job today (the same list all day, and it does not touch the game's dice). */
export function candidates(S: GameState, pointId: number): Seller[] {
  const rng = new RNG((S.seed ^ Math.imul(S.day, 7919) ^ Math.imul(pointId, 104729)) >>> 0);
  const out: Seller[] = [];
  const used = new Set<number>();
  for (let i = 0; i < 3; i++) {
    let nameId = rng.int(1, SELLER_NAMES);
    while (used.has(nameId)) nameId = (nameId % SELLER_NAMES) + 1;
    used.add(nameId);
    const skill = Math.round(rng.range(0.6, 1.1) * 100) / 100;
    const refs = rng.chance(0.5);
    const honesty = refs ? rng.range(0.9, 1) : rng.range(0.6, 0.95);
    // skilled people and people with good references ask for more
    const wage = Math.round(22 + (skill - 0.6) * 30 + (refs ? 6 : 0) + rng.range(-3, 3));
    out.push({ nameId, wage, skill, honesty, refs, warnings: 0, hiredDay: S.day });
  }
  return out;
}

/** Morning: does the seller have a problem today? */
export function rollMorningIssue(S: GameState, p: Point, rng: RNG): WorkerIssue | null {
  const s = p.seller;
  if (!s) return null;
  if (rng.chance(0.04)) return 'sick';
  if (rng.chance((1.15 - s.skill) * 0.1)) return 'late';
  if (rng.chance((1.15 - s.skill) * 0.08)) return 'rude';
  if (S.day - s.hiredDay >= 7 && s.wage < 45 && rng.chance(0.05)) return 'raise';
  return null;
}

/** One day of a stand, in numbers. */
export function simulatePoint(S: GameState, p: Point, weather: WeatherId, ev: Crowd, rng: RNG): PointDay {
  const day: PointDay = { day: S.day, status: 'empty', sold: 0, revenue: 0, ingredients: 0, rent: 0, wage: 0, stolen: 0, profit: 0 };
  const s = p.seller;
  if (!s) return day;
  // a closed stand pays nothing (the seller is paid for working days only)
  if (p.issue === 'sick') return { ...day, status: 'sick' };
  const loc = LOCATIONS[p.loc];
  const price = loc.fairPrice;
  const from = p.issue === 'late' ? POINTS.LATE_OPEN_H : POINTS.OPEN_H;
  const e = expectedDay({ loc: p.loc, weather, price, upgrades: POINT_UPGRADES, rep: S.rep, from, events: ev, recipe: RECIPE });
  const mood = p.issue === 'rude' ? 0.65 : 1;
  const sold = Math.min(Math.round(e.buyers * (0.55 + 0.45 * s.skill) * mood * rng.range(0.85, 1.15)), Math.round(POINTS.CAPACITY * s.skill));
  const revenue = sold * price;
  const ingredients = Math.round(sold * (1 + POINTS.WASTE) * costPerCup(RECIPE, {}));
  const status: PointStatus = p.issue === 'late' || p.issue === 'rude' ? p.issue : 'ok';
  return { ...day, status, sold, revenue, ingredients, rent: loc.rent, wage: s.wage, profit: revenue - ingredients - loc.rent - s.wage };
}

/** Evening count: a dishonest seller may take money from the till. Returns the amount. */
export function rollTheft(p: Point, d: PointDay, rng: RNG): number {
  const s = p.seller;
  if (!s || d.revenue <= 0) return 0;
  if (!rng.chance((1 - s.honesty) * 0.5)) return 0;
  const n = Math.max(1, Math.round(d.revenue * rng.range(0.25, 0.45)));
  d.stolen = n;
  d.profit -= n;
  return n;
}

/** Book a finished day into the stand's history. */
export function recordDay(p: Point, d: PointDay): void {
  p.last = d;
  p.history.push(d.profit);
  if (p.history.length > 7) p.history.shift();
  p.total += d.profit;
}
