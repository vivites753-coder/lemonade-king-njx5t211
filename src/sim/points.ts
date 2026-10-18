// "My stands": extra stands at other places, run by hired sellers. Each day of a stand is worked out in one step
// (when the selling starts, or in the evening): only the numbers count. The player can look at a stand while it
// works (see pointScene.ts), but what they see there is only the show.
import { CONFIG } from '../core/config';
import { RNG } from '../core/rng';
import type { LocationId, UpgradeId, WeatherId } from '../core/types';
import { LOCATIONS, LOCATION_IDS, locationUnlocked } from '../data/locations';
import { POINTS, SELLER_NAMES, type WorkerIssue } from '../data/staff';
import { UPGRADES } from '../data/upgrades';
import { WHOLESALE_UNIT_COST } from '../data/goods';
import { expectedDay, lemonsConsumed, type Owned } from './economy';
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

export type PointStatus = 'ok' | 'late' | 'rude' | 'sick' | 'empty' | 'nomoney';

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
  /** The equipment of this stand: what came with it and what was bought for it later. */
  upgrades?: Owned;
  /** A second worker (helps the seller, has a queue of their own at a wide counter, keeps the stand open alone). */
  helper?: Seller | null;
  /** Coins put into this stand (the stand and its upgrades): the payback is counted against this. */
  invested?: number;
  /** The own seller is ill at home for this many more mornings; a stand-in may work meanwhile. */
  away?: { seller: Seller; days: number } | null;
  /** Today's day of the stand, worked out when the selling starts (it is shown bit by bit while you watch). */
  today?: PointDay | null;
  /** Rent and wage of today, paid in the morning when the stand opened (the evening books the rest). */
  paid?: number;
}

/** A new stand comes fully set up: the table, the pitcher, a sign, an umbrella and a hand juicer. */
export const POINT_START: Owned = { sign: true, umbrella: true, juicer_hand: true };

/**
 * Upgrades a stand of yours can get. Not here: delivery, the bike and the scooter (the wholesaler brings the goods
 * to the stands), the toolkit (the stands do not wear out) and branded cups (the reputation is the owner's).
 */
export const POINT_UPGRADE_IDS: UpgradeId[] = [
  'sign',
  'loyalty',
  'banner',
  'speaker',
  'mascot',
  'umbrella',
  'tent',
  'dispenser',
  'tv',
  'big_stand',
  'truck',
  'juicer_hand',
  'juicer_lever',
  'cooler',
  'mixer_pro',
  'cash_lock',
];

const RECIPE = { lemons: CONFIG.IDEAL_LEMONS, sugar: CONFIG.IDEAL_SUGAR };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function pointsOpen(S: GameState): boolean {
  return S.bestRep >= POINTS.MIN_REP - 1e-9;
}

export function pointAt(S: GameState, loc: LocationId): Point | undefined {
  return S.points.find((p) => p.loc === loc);
}

/** The equipment of a stand (older saves: only the sign). */
export function pointUps(p: Point): Owned {
  return p.upgrades ?? { sign: true };
}

/** Places where a new stand can go: open for the player, not home (home is always yours), not taken. */
export function freePlaces(S: GameState): LocationId[] {
  // a stand cannot stand where the stores are (level 4): there are only rented premises
  return LOCATION_IDS.filter((id) => id !== 'yard' && !LOCATIONS[id].store && locationUnlocked(S.bestRep, id) && !pointAt(S, id));
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
  // people who already work at a stand of the player's (or are ill at home) are not among them
  for (const p of S.points) {
    if (p.seller) used.add(p.seller.nameId);
    if (p.helper) used.add(p.helper.nameId);
    if (p.away) used.add(p.away.seller.nameId);
  }
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
  if (rng.chance(POINTS.SICK_CHANCE)) return 'sick';
  if (rng.chance((1.15 - s.skill) * 0.1)) return 'late';
  if (rng.chance((1.15 - s.skill) * 0.08)) return 'rude';
  if (S.day - s.hiredDay >= 7 && s.wage < 45 && rng.chance(0.05)) return 'raise';
  return null;
}

/** A second worker needs a counter of their own: the big stand or the truck. */
export function pointHasRoomFor2(p: Point): boolean {
  const up = pointUps(p);
  return !!(up.big_stand || up.truck);
}

/** Who works at the stand today: the seller (unless ill today) and the second worker. */
export function pointWorkers(p: Point): Seller[] {
  const out: Seller[] = [];
  if (p.seller && p.issue !== 'sick') out.push(p.seller);
  if (p.helper) out.push(p.helper);
  return out;
}

/** The stand opens at 10:00; a late seller opens it at 12:00, unless a second worker is there. */
export function pointOpensAt(p: Point): number {
  return p.issue === 'late' && !p.helper ? POINTS.LATE_OPEN_H : POINTS.OPEN_H;
}

/** Cups the workers can pour in a day: a wide counter, a second worker and a dispenser let them pour more. */
export function pointCapacity(p: Point): number {
  const [first, second] = pointWorkers(p);
  if (!first) return 0;
  const up = pointUps(p);
  const wide = !!(up.big_stand || up.truck);
  let cap = POINTS.CAPACITY * first.skill * (wide ? POINTS.WIDE_CAPACITY : 1);
  if (second && wide) cap += POINTS.CAPACITY * second.skill;
  if (up.dispenser) cap /= UPGRADES.dispenser.serveMult ?? 1;
  return Math.round(cap);
}

/** Price of the ingredients of one cup at a stand: the same prices as the big packs of the wholesale warehouse. */
export function pointCupCost(p: Point): number {
  const u = WHOLESALE_UNIT_COST;
  const pitcher =
    lemonsConsumed(RECIPE, pointUps(p)) * u.lemons + CONFIG.WATER_PER_PITCHER * u.water + RECIPE.sugar * u.sugar + CONFIG.CUPS_PER_PITCHER * u.cups;
  return pitcher / CONFIG.CUPS_PER_PITCHER;
}

/** One day of a stand, in numbers. */
export function simulatePoint(S: GameState, p: Point, weather: WeatherId, ev: Crowd, rng: RNG): PointDay {
  const day: PointDay = { day: S.day, status: 'empty', sold: 0, revenue: 0, ingredients: 0, rent: 0, wage: 0, stolen: 0, profit: 0 };
  const workers = pointWorkers(p);
  // nobody works today (the seller is ill and nobody stands in): the stand stays closed and pays nothing
  if (!workers.length) return { ...day, status: p.away || p.issue === 'sick' ? 'sick' : 'empty' };
  const lead = workers[0];
  const sellerHere = !!p.seller && p.issue !== 'sick';
  const loc = LOCATIONS[p.loc];
  const up = pointUps(p);
  const price = loc.fairPrice;
  const from = pointOpensAt(p);
  const e = expectedDay({ loc: p.loc, weather, price, upgrades: up, rep: S.rep, from, events: ev, recipe: RECIPE });
  const mood = sellerHere && p.issue === 'rude' ? 0.65 : 1;
  // a good seller keeps the queue; a TV, shade and a second worker keep people waiting less; a perfect mix tastes better
  const shade = !loc.indoor && (up.umbrella || up.tent) ? POINTS.SHADE_SERVICE : 0;
  const two = workers.length > 1 ? POINTS.SECOND_SERVICE : 0;
  const service = Math.min(1, 0.55 + 0.45 * lead.skill + (up.tv ? POINTS.TV_SERVICE : 0) + shade + two);
  const taste = up.mixer_pro ? POINTS.PRO_MIX : 1;
  const sold = Math.min(Math.round(e.buyers * service * mood * taste * rng.range(0.85, 1.15)), pointCapacity(p));
  // the loyalty card gives every 10th cup for free
  const free = up.loyalty ? Math.floor(sold / 10) : 0;
  const revenue = (sold - free) * price;
  const waste = up.cooler ? POINTS.WASTE_COOLER : POINTS.WASTE;
  const ingredients = Math.round(sold * (1 + waste) * pointCupCost(p));
  const status: PointStatus = from > POINTS.OPEN_H ? 'late' : sellerHere && p.issue === 'rude' ? 'rude' : 'ok';
  const wage = workers.reduce((n, w) => n + w.wage, 0);
  return { ...day, status, sold, revenue, ingredients, rent: loc.rent, wage, profit: revenue - ingredients - loc.rent - wage };
}

/** Evening count: a dishonest seller may take money from the till (a locked cash box makes it harder). */
export function rollTheft(p: Point, d: PointDay, rng: RNG): number {
  // the seller looks after the till (when they work today)
  const s = p.seller && p.issue !== 'sick' && p.issue !== 'stole' ? p.seller : null;
  // what is in the till after the wholesaler is paid for the goods
  const till = d.revenue - d.ingredients;
  if (!s || till <= 0) return 0;
  const lock = pointUps(p).cash_lock ? POINTS.LOCK_THEFT : 1;
  if (!rng.chance((1 - s.honesty) * 0.5 * lock)) return 0;
  const n = Math.max(1, Math.round(till * rng.range(0.25, 0.45)));
  d.stolen = n;
  d.profit -= n;
  return n;
}

/** Rent and wage a stand needs for today (nothing when it is closed anyway). */
export function pointFixedCosts(p: Point): number {
  const workers = pointWorkers(p);
  if (!workers.length) return 0;
  return LOCATIONS[p.loc].rent + workers.reduce((n, w) => n + w.wage, 0);
}

/** Book a finished day into the stand's history. */
export function recordDay(p: Point, d: PointDay): void {
  p.last = d;
  p.history.push(d.profit);
  if (p.history.length > 7) p.history.shift();
  p.total += d.profit;
}

/** How much of today is behind the stand (0 before it opens, 1 at closing time). */
export function pointProgress(p: Point, hour: number): number {
  const from = pointOpensAt(p);
  return clamp((hour - from) / (CONFIG.DAY_END - from), 0, 1);
}

/**
 * Payback: the coins put into the stand against the profit it has brought. `days` is how many more days it needs at
 * the pace of the last week (null when it does not earn).
 */
export function payback(p: Point): { invested: number; earned: number; share: number; days: number | null } {
  const invested = p.invested ?? POINTS.COST;
  const earned = p.total;
  const avg = p.history.length ? p.history.reduce((a, b) => a + b, 0) / p.history.length : 0;
  const left = invested - earned;
  return {
    invested,
    earned,
    share: invested > 0 ? earned / invested : 1,
    days: left <= 0 ? 0 : avg > 0 ? Math.ceil(left / avg) : null,
  };
}
