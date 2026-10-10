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
import { passersBetween, nearShare } from './traffic';

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
      stock.cups * UNIT_COST.cups,
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
  weather: WeatherId;
  rep: number;
  festival: boolean;
}

/**
 * Chance that a pedestrian in the attention zone stops (before the pedestrian type).
 * `parts` lists every factor so the "Why?" panel can show them; multiplying them gives `chance`.
 */
export function interestChance(i: InterestInput): { chance: number; raw: number; parts: InterestPart[] } {
  const parts: InterestPart[] = [{ key: 'why.base', kind: 'base', value: CONFIG.BASE_STOP_CHANCE }];
  let ads = 0;
  for (const id of Object.keys(i.upgrades) as UpgradeId[]) {
    const u = UPGRADES[id];
    if (!u.ads) continue;
    if (u.toggle && !i.speakerOn) continue;
    ads += u.ads;
    parts.push({ key: `why.up.${id}`, kind: 'add', value: u.ads });
  }
  if (i.flyers) {
    ads += 0.25;
    parts.push({ key: 'why.flyers', kind: 'add', value: 0.25 });
  }
  const w = WEATHER[i.weather];
  parts.push({ key: `why.weather.${i.weather}`, kind: 'mul', value: w.thirst });
  let comfort = 1;
  for (const id of Object.keys(i.upgrades) as UpgradeId[]) comfort *= UPGRADES[id].comfort ?? 1;
  if (comfort !== 1) parts.push({ key: 'why.comfort', kind: 'mul', value: comfort });
  const repF = 0.85 + 0.06 * i.rep;
  parts.push({ key: 'why.rep', kind: 'mul', value: repF });
  const fest = i.festival ? 1.3 : 1;
  if (i.festival) parts.push({ key: 'why.festival', kind: 'mul', value: fest });
  const raw = CONFIG.BASE_STOP_CHANCE * (1 + ads) * w.thirst * comfort * repF * fest;
  return { chance: Math.min(CONFIG.MAX_STOP_CHANCE, raw), raw, parts };
}

export function walletRange(loc: LocationId, type: PedTypeId): [number, number] {
  const base = LOCATIONS[loc].fairPrice * PED_TYPES[type].priceMult;
  return [base * CONFIG.WALLET_MIN, base * CONFIG.WALLET_MAX];
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

/** Reputation grows slowly (harder near 5 stars) and falls quickly. */
export function repDelta(sat: number, rep: number): number {
  const d = (sat - CONFIG.REP_SAT_PIVOT) * CONFIG.REP_SAT_SCALE;
  return d > 0 ? d * Math.max(0, (5 - rep) / 4) : d;
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
}): { passers: number; inRange: number; buyers: number; revenue: number; profit: number; profitPerPasser: number } {
  const loc = LOCATIONS[o.loc];
  const to = o.to ?? CONFIG.DAY_END;
  const passers = passersBetween(o.loc, o.weather, o.from, to, false);
  const radius = attentionRadius(o.upgrades, o.speakerOn ?? true);
  const inRange = passers * (nearShare(radius) + (1 - CONFIG.LANES[0].weight) * farCoverage(radius));
  const base = interestChance({
    upgrades: o.upgrades,
    speakerOn: o.speakerOn ?? true,
    flyers: false,
    weather: o.weather,
    rep: o.rep ?? 1,
    festival: false,
  }).chance;
  let buyShare = 0;
  for (const [type, share] of Object.entries(loc.mix) as [PedTypeId, number][]) {
    const stop = Math.min(CONFIG.MAX_STOP_CHANCE, base * PED_TYPES[type].interest);
    buyShare += share * stop * acceptProb(o.loc, type, o.price);
  }
  const buyers = inRange * buyShare;
  const revenue = buyers * o.price;
  const profit = buyers * (o.price - costPerCup(o.recipe ?? { lemons: 4, sugar: 2 }, o.upgrades)) - loc.rent;
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
