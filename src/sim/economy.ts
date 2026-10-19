// Pure economy formulas. No state, no randomness: easy to test and to explain in the UI.
import { CONFIG } from '../core/config';
import type { LocationId, PedTypeId, UpgradeId, WeatherId } from '../core/types';
import { UNIT_COST } from '../data/goods';
import { LOCATIONS } from '../data/locations';
import { PED_TYPES } from '../data/pedTypes';
import { UPGRADES } from '../data/upgrades';
import { WEATHER } from '../data/weather';
import type { Recipe, Stock } from './state';
import { lemonsTotal } from './state';
import { NO_EVENTS, nearShare, passersBetween, placeEventStop, type Crowd } from './traffic';

export type Owned = Partial<Record<UpgradeId, true>>;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const round1 = (v: number) => Math.round(v * 10) / 10;

export function lemonReduction(up: Owned): number {
  let r = 0;
  for (const id of Object.keys(up) as UpgradeId[]) r = Math.max(r, UPGRADES[id].lemonReduce ?? 0);
  return r;
}

/** Lemons really used for one pitcher (juicers squeeze more juice out of each lemon). */
export function lemonsConsumed(recipe: Recipe, up: Owned): number {
  return Math.max(1, recipe.lemons - lemonReduction(up));
}

export function quality(recipe: Recipe): number {
  const q = 1 - 0.17 * Math.abs(recipe.lemons - CONFIG.IDEAL_LEMONS) - 0.17 * Math.abs(recipe.sugar - CONFIG.IDEAL_SUGAR);
  return clamp(q, 0.25, 1);
}

/** Positive = sour, negative = sweet. */
export function tasteBalance(recipe: Recipe): number {
  return recipe.lemons - CONFIG.IDEAL_LEMONS - (recipe.sugar - CONFIG.IDEAL_SUGAR);
}

export function tasteKey(recipe: Recipe): 'taste.sour' | 'taste.sweet' | 'taste.good' | 'taste.ok' {
  const d = tasteBalance(recipe);
  if (d >= 2) return 'taste.sour';
  if (d <= -2) return 'taste.sweet';
  return quality(recipe) >= 0.8 ? 'taste.good' : 'taste.ok';
}

export function pitcherCost(recipe: Recipe, up: Owned): number {
  return (
    lemonsConsumed(recipe, up) * UNIT_COST.lemons +
    CONFIG.WATER_PER_PITCHER * UNIT_COST.water +
    recipe.sugar * UNIT_COST.sugar +
    CONFIG.CUPS_PER_PITCHER * UNIT_COST.cups
  );
}

export function costPerCup(recipe: Recipe, up: Owned): number {
  return pitcherCost(recipe, up) / CONFIG.CUPS_PER_PITCHER;
}

export function maxPitchers(stock: Stock, recipe: Recipe, up: Owned): number {
  const byLemons = Math.floor(lemonsTotal(stock) / lemonsConsumed(recipe, up));
  const byWater = Math.floor(stock.water / CONFIG.WATER_PER_PITCHER);
  const bySugar = recipe.sugar > 0 ? Math.floor(stock.sugar / recipe.sugar) : Infinity;
  const byCups = Math.floor(stock.cups / CONFIG.CUPS_PER_PITCHER);
  return Math.max(0, Math.min(byLemons, byWater, bySugar, byCups));
}

export function stockValue(stock: Stock): number {
  return Math.round(
    lemonsTotal(stock) * UNIT_COST.lemons +
      stock.water * UNIT_COST.water +
      stock.sugar * UNIT_COST.sugar +
      stock.cups * UNIT_COST.cups +
      (stock.cookies ?? 0) * UNIT_COST.cookies +
      (stock.oranges ?? 0) * UNIT_COST.oranges +
      (stock.juice ?? 0) * UNIT_COST.juice +
      (stock.pastries ?? 0) * UNIT_COST.pastries,
  );
}

export function attentionRadius(up: Owned, speakerOn: boolean): number {
  let r = CONFIG.BASE_RADIUS;
  for (const id of Object.keys(up) as UpgradeId[]) {
    const u = UPGRADES[id];
    if (!u.radius) continue;
    if (u.toggle && !speakerOn) continue;
    r += u.radius;
  }
  return r;
}

export interface InterestPart {
  key: string;
  kind: 'base' | 'add' | 'mul';
  value: number;
}

export interface InterestInput {
  upgrades: Owned;
  speakerOn: boolean;
  flyers: boolean;
  /** Online ads of the day (left out where there are none: other stands, old tests). */
  onlineAds?: boolean;
  weather: WeatherId;
  rep: number;
  festival: boolean;
  location?: LocationId;
  /** Stop-chance multiplier from a place event (a concert), with its "Why?" key. */
  event?: { key: string; mult: number };
  /** Something scares people away (stray dogs). */
  scare?: { key: string; mult: number };
  /** The own store of level 4: its shop window, comfort and awning. */
  store?: boolean;
}

/** Indoors the weather changes thirst this much less (no sun, no rain on your head). */
export const INDOOR_THIRST_DAMPING = 0.4;

/** Weather factor for the stop chance; a tent (or the awning of a store: `shield0`) removes part of the bad-weather
 * penalty. */
export function weatherThirst(weather: WeatherId, up: Owned, indoor = false, shield0 = 0): number {
  const t = WEATHER[weather].thirst;
  if (indoor) return 1 + (t - 1) * INDOOR_THIRST_DAMPING;
  if (t >= 1) return t;
  let shield = shield0;
  for (const id of Object.keys(up) as UpgradeId[]) shield = Math.max(shield, UPGRADES[id].weatherShield ?? 0);
  return 1 - (1 - t) * (1 - shield);
}

/** What an iced cup adds to the satisfaction of its customer (more on a hot day; indoors the weather matters less). */
export function iceBonus(weather: WeatherId, indoor = false): number {
  const v = WEATHER[weather].ice;
  return indoor ? CONFIG.ICE_INDOOR + (v - CONFIG.ICE_INDOOR) * INDOOR_THIRST_DAMPING : v;
}

/**
 * Chance that a pedestrian in the attention zone stops (before the pedestrian type).
 * `parts` lists every factor so the "Why?" panel can show them; multiplying them gives `chance`.
 */
export function interestChance(i: InterestInput): { chance: number; raw: number; parts: InterestPart[] } {
  const parts: InterestPart[] = [{ key: 'why.base', kind: 'base', value: CONFIG.BASE_STOP_CHANCE }];
  let ads = 0;
  const special = i.festival || i.location === 'school';
  for (const id of Object.keys(i.upgrades) as UpgradeId[]) {
    const u = UPGRADES[id];
    if (!u.ads) continue;
    if (u.toggle && !i.speakerOn) continue;
    const v = special && u.adsSpecial ? u.adsSpecial : u.ads;
    ads += v;
    parts.push({ key: `why.up.${id}`, kind: 'add', value: v });
  }
  if (i.flyers) {
    ads += CONFIG.FLYERS_ADS;
    parts.push({ key: 'why.flyers', kind: 'add', value: CONFIG.FLYERS_ADS });
  }
  if (i.onlineAds) {
    ads += CONFIG.ONLINE_ADS_ADS;
    parts.push({ key: 'why.onlineAds', kind: 'add', value: CONFIG.ONLINE_ADS_ADS });
  }
  if (i.store) {
    ads += CONFIG.STORE_ADS;
    parts.push({ key: 'why.store', kind: 'add', value: CONFIG.STORE_ADS });
  }
  const indoor = !!(i.location && LOCATIONS[i.location].indoor);
  const w = { thirst: weatherThirst(i.weather, i.upgrades, indoor, i.store ? CONFIG.STORE_WEATHER_SHIELD : 0) };
  parts.push({ key: indoor ? 'why.indoor' : `why.weather.${i.weather}`, kind: 'mul', value: w.thirst });
  let comfort = 1;
  for (const id of Object.keys(i.upgrades) as UpgradeId[]) if (!(indoor && UPGRADES[id].outdoorOnly)) comfort *= UPGRADES[id].comfort ?? 1;
  if (i.store) comfort *= CONFIG.STORE_COMFORT;
  // the air conditioner of the store: people come in to cool down on sunny and hot days
  if (i.weather === 'sunny' || i.weather === 'hot') for (const id of Object.keys(i.upgrades) as UpgradeId[]) comfort *= UPGRADES[id].hotComfort ?? 1;
  if (comfort !== 1) parts.push({ key: 'why.comfort', kind: 'mul', value: comfort });
  const repF = 0.85 + 0.06 * i.rep;
  parts.push({ key: 'why.rep', kind: 'mul', value: repF });
  const fest = i.festival ? 1.3 : 1;
  if (i.festival) parts.push({ key: 'why.festival', kind: 'mul', value: fest });
  const ev = i.event?.mult ?? 1;
  if (i.event) parts.push({ key: i.event.key, kind: 'mul', value: ev });
  const scare = i.scare?.mult ?? 1;
  if (i.scare) parts.push({ key: i.scare.key, kind: 'mul', value: scare });
  const raw = CONFIG.BASE_STOP_CHANCE * (1 + ads) * w.thirst * comfort * repF * fest * ev * scare;
  return { chance: Math.min(CONFIG.MAX_STOP_CHANCE, raw), raw, parts };
}

export function walletRange(loc: LocationId, type: PedTypeId): [number, number] {
  const base = LOCATIONS[loc].fairPrice * PED_TYPES[type].priceMult;
  return [base * CONFIG.WALLET_MIN, base * CONFIG.WALLET_MAX];
}

/**
 * Cups to sell today so that the day is not a loss: the costs that do not depend on the cups (`fixed`: rent,
 * utilities, advertising, wages) divided by what one cup brings (price minus its ingredients). Null when a cup brings
 * nothing: then no number of cups covers them.
 */
export function breakEvenCups(fixed: number, price: number, cupCost: number): number | null {
  const margin = price - cupCost;
  if (fixed <= 0) return 0;
  return margin > 0.001 ? Math.ceil(fixed / margin - 1e-9) : null;
}

/** The tax of the own store on a day's profit (nothing on a loss). */
export function storeTax(profit: number): number {
  return profit > 0 ? Math.round(profit * CONFIG.STORE_TAX) : 0;
}

/** Probability that a pedestrian of this type accepts the price (wallet is uniform). */
export function acceptProb(loc: LocationId, type: PedTypeId, price: number): number {
  const [a, b] = walletRange(loc, type);
  return clamp((b - price) / (b - a), 0, 1);
}

export function satisfaction(q: number, price: number, maxPrice: number, waited: number, patienceMax: number): number {
  const pricePain = Math.max(0, price / maxPrice - 0.8) * 0.3;
  const waitPain = patienceMax > 0 ? (waited / patienceMax) * 0.2 : 0;
  return clamp(0.35 + 0.65 * q - pricePain - waitPain, 0, 1);
}

/** Reputation grows slowly (harder near 5 stars) and falls quickly. Branded cups speed up the growth. */
export function repDelta(sat: number, rep: number, up: Owned = {}): number {
  const d = (sat - CONFIG.REP_SAT_PIVOT) * CONFIG.REP_SAT_SCALE;
  if (d <= 0) return d;
  let mult = 1;
  for (const id of Object.keys(up) as UpgradeId[]) mult *= UPGRADES[id].repMult ?? 1;
  return d * mult * Math.max(0, (5 - rep) / 4);
}

/** Seconds (simulation) to pour one cup. */
export function serveTime(up: Owned, helper: boolean): number {
  let t = CONFIG.SERVE_TIME * (helper ? CONFIG.HELPER_SERVE_MULT : 1);
  for (const id of Object.keys(up) as UpgradeId[]) t *= UPGRADES[id].serveMult ?? 1;
  return t;
}

export function stars(rep: number): number {
  return clamp(rep, 0, 5);
}

/**
 * Analytic expectation for one selling day (unlimited stock, instant service).
 * Used by tests and the debug panel to compare locations.
 */
export function expectedDay(o: {
  loc: LocationId;
  weather: WeatherId;
  price: number;
  upgrades: Owned;
  speakerOn?: boolean;
  rep?: number;
  from: number;
  to?: number;
  recipe?: Recipe;
  /** Today's events (crowd and stop chance); none by default. */
  events?: Crowd;
}): { passers: number; inRange: number; buyers: number; revenue: number; profit: number; profitPerPasser: number } {
  const loc = LOCATIONS[o.loc];
  const to = o.to ?? CONFIG.DAY_END;
  const ev = o.events ?? NO_EVENTS;
  const passers = passersBetween(o.loc, o.weather, o.from, to, ev);
  const radius = attentionRadius(o.upgrades, o.speakerOn ?? true);
  const inRange = passers * (nearShare(radius) + (1 - CONFIG.LANES[0].weight) * farCoverage(radius));
  const base = interestChance({
    upgrades: o.upgrades,
    speakerOn: o.speakerOn ?? true,
    flyers: false,
    weather: o.weather,
    rep: o.rep ?? 1,
    festival: ev.festival && !loc.indoor,
    location: o.loc,
    event: placeEventStop(o.loc, ev),
    store: !!loc.store,
  }).chance;
  let buyShare = 0;
  for (const [type, share] of Object.entries(loc.mix) as [PedTypeId, number][]) {
    const stop = Math.min(CONFIG.MAX_STOP_CHANCE, base * PED_TYPES[type].interest);
    buyShare += share * stop * acceptProb(o.loc, type, o.price);
  }
  const buyers = inRange * buyShare;
  const revenue = buyers * o.price;
  // a store also pays for electricity and water, and the tax on its profit
  const before = buyers * (o.price - costPerCup(o.recipe ?? { lemons: 4, sugar: 2 }, o.upgrades)) - loc.rent - (loc.store?.utilities ?? 0);
  const profit = loc.store ? before - storeTax(before) : before;
  return { passers, inRange, buyers, revenue, profit, profitPerPasser: passers > 0 ? profit / passers : 0 };
}

/** Share of the far lane that falls inside the attention circle. */
export function farCoverage(radius: number): number {
  const lane = CONFIG.LANES[1];
  const dy0 = lane.y - CONFIG.LANE_JITTER - CONFIG.STAND.y;
  const dy1 = lane.y + CONFIG.LANE_JITTER - CONFIG.STAND.y;
  if (radius <= dy0) return 0;
  if (radius >= dy1) return 1;
  return (radius - dy0) / (dy1 - dy0);
}
