import type { GoodId, StockKind } from '../core/types';

export interface GoodDef {
  id: GoodId;
  icon: string;
  /** Price per pack. */
  price: number;
  /** Units per pack (sugar: spoons, cups: cups). */
  pack: number;
  stock: StockKind;
  vendor: 'galya' | 'kiosk' | 'bogdan' | 'milana' | 'super';
  /** Share of rotten lemons in every purchase. */
  rotten?: number;
  /** Only sold when cups are sold out at Milana's. */
  onlyWhenCupsSoldOut?: boolean;
}

export const GOODS: Record<GoodId, GoodDef> = {
  lemon: { id: 'lemon', icon: '🍋', price: 4, pack: 1, stock: 'lemons', vendor: 'galya' },
  lemon_cheap: { id: 'lemon_cheap', icon: '🍋', price: 3, pack: 1, stock: 'lemons', vendor: 'kiosk', rotten: 0.25 },
  water: { id: 'water', icon: '💧', price: 3, pack: 1, stock: 'water', vendor: 'bogdan' },
  sugar: { id: 'sugar', icon: '🍬', price: 10, pack: 10, stock: 'sugar', vendor: 'bogdan' },
  cups: { id: 'cups', icon: '🥤', price: 10, pack: 10, stock: 'cups', vendor: 'milana' },
  cups_super: { id: 'cups_super', icon: '🥤', price: 20, pack: 10, stock: 'cups', vendor: 'super', onlyWhenCupsSoldOut: true },
};

export const GOOD_IDS = Object.keys(GOODS) as GoodId[];

/** Cost of one unit (lemon, bottle, spoon, cup) at base prices. Used for cost per cup. */
export const UNIT_COST = {
  lemons: GOODS.lemon.price / GOODS.lemon.pack,
  water: GOODS.water.price / GOODS.water.pack,
  sugar: GOODS.sugar.price / GOODS.sugar.pack,
  cups: GOODS.cups.price / GOODS.cups.pack,
};

/** Sugar price multiplier on a "sugar got pricier" day. */
export const SUGAR_HIKE = 1.3;
