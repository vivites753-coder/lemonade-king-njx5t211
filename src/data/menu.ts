// The menu of the own store (level 4): besides lemonade and cookies it sells fresh orange juice, multifruit juice and
// pastries. They open with the best reputation 4 and a store of one's own, and they are sold in the store only (its
// counter has the juicer, the fridge and the glass case).
import type { PedTypeId } from '../core/types';
import { UNIT_COST } from './goods';

export type DrinkId = 'orange' | 'multifruit';
export type ExtraId = DrinkId | 'pastry';
/** What a customer of the store orders to drink. */
export type Order = 'lemonade' | DrinkId;

export interface ExtraDef {
  id: ExtraId;
  icon: string;
  /** What it is made of in the stock, and how much one portion takes. */
  stock: 'oranges' | 'juice' | 'pastries';
  per: number;
  /** The fair price as a share of the place's fair price of lemonade. */
  fair: number;
  /** Time to make a portion at the counter as a share of a cup of lemonade (oranges are squeezed for every glass). */
  time: number;
  /** How good it is (lemonade: by its recipe). */
  quality: number;
  /** How much each kind of customer likes it: drinks against lemonade (1), pastries as the chance to take one. */
  taste: Record<PedTypeId, number>;
}

export const EXTRAS: Record<ExtraId, ExtraDef> = {
  orange: { id: 'orange', icon: '🍊', stock: 'oranges', per: 2, fair: 1.6, time: 1.5, quality: 1, taste: { kid: 0.5, adult: 0.9, granny: 0.6, sport: 1.6, tourist: 1.2 } },
  multifruit: { id: 'multifruit', icon: '🧃', stock: 'juice', per: 1, fair: 1.25, time: 1, quality: 0.85, taste: { kid: 1.5, adult: 0.6, granny: 0.8, sport: 0.5, tourist: 0.8 } },
  pastry: { id: 'pastry', icon: '🍰', stock: 'pastries', per: 1, fair: 1.1, time: 0, quality: 1, taste: { kid: 1.2, adult: 1, granny: 1.4, sport: 0.4, tourist: 1.2 } },
};

export const DRINK_IDS: DrinkId[] = ['orange', 'multifruit'];
export const EXTRA_IDS: ExtraId[] = ['orange', 'multifruit', 'pastry'];

export const MENU = {
  /** Opened by this best reputation (and a store of one's own). */
  MIN_REP: 4,
  /** Chance that a customer also takes a pastry (before the taste and the price). */
  PASTRY_ATTACH: 0.3,
  /** Pastries are fresh: this share of what is left in the evening goes stale overnight. */
  PASTRY_STALE: 0.5,
  PRICE_MIN: 1,
  PRICE_MAX: 60,
} as const;

/** What the goods of one portion cost (a drink also takes a paper cup). */
export function extraCost(id: ExtraId): number {
  const e = EXTRAS[id];
  return e.per * UNIT_COST[e.stock] + (e.stock === 'pastries' ? 0 : UNIT_COST.cups);
}

/** The fair price of a product of the menu at a place (from the place's fair price of lemonade). */
export function extraFair(id: ExtraId, fairLemonade: number): number {
  return Math.round(EXTRAS[id].fair * fairLemonade);
}
