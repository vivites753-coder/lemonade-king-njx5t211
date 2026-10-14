import type { GoodId, StockKind } from '../core/types';

export interface GoodDef {
  id: GoodId;
  icon: string;
  /** Price per pack. */
  price: number;
  /** Units per pack (sugar: spoons, cups: cups). */
  pack: number;
  stock: StockKind;
  vendor: 'galya' | 'kiosk' | 'bogdan' | 'milana' | 'super' | 'baker' | 'wholesale';
  /** Sold from this reputation (best ever reached). */
  minRep?: number;
  /** Share of rotten lemons in every purchase. */
  rotten?: number;
  /** Only sold when cups are sold out at Milana's. */
  onlyWhenCupsSoldOut?: boolean;
  /** Big packs at the wholesale warehouse: cheaper per piece, sold to owners of a stand network. */
  wholesale?: boolean;
}

export const GOODS: Record<GoodId, GoodDef> = {
  lemon: { id: 'lemon', icon: '🍋', price: 4, pack: 1, stock: 'lemons', vendor: 'galya' },
  lemon_cheap: { id: 'lemon_cheap', icon: '🍋', price: 3, pack: 1, stock: 'lemons', vendor: 'kiosk', rotten: 0.25 },
  water: { id: 'water', icon: '💧', price: 3, pack: 1, stock: 'water', vendor: 'bogdan' },
  sugar: { id: 'sugar', icon: '🍬', price: 10, pack: 10, stock: 'sugar', vendor: 'bogdan' },
  cups: { id: 'cups', icon: '🥤', price: 10, pack: 10, stock: 'cups', vendor: 'milana' },
  cups_super: { id: 'cups_super', icon: '🥤', price: 20, pack: 10, stock: 'cups', vendor: 'super', onlyWhenCupsSoldOut: true },
  cookies: { id: 'cookies', icon: '🍪', price: 20, pack: 10, stock: 'cookies', vendor: 'baker', minRep: 2 },
  // wholesale: a quarter cheaper per piece, but only in big packs (and lemons still spoil)
  lemon_bulk: { id: 'lemon_bulk', icon: '📦', price: 60, pack: 20, stock: 'lemons', vendor: 'wholesale', wholesale: true },
  water_bulk: { id: 'water_bulk', icon: '📦', price: 22, pack: 10, stock: 'water', vendor: 'wholesale', wholesale: true },
  sugar_bulk: { id: 'sugar_bulk', icon: '📦', price: 35, pack: 50, stock: 'sugar', vendor: 'wholesale', wholesale: true },
  cups_bulk: { id: 'cups_bulk', icon: '📦', price: 70, pack: 100, stock: 'cups', vendor: 'wholesale', wholesale: true },
};

/** Cookies: a second product that customers buy together with lemonade. */
export const COOKIES = {
  /** Fair price at a place with a fair lemonade price of 10. */
  FAIR: 5,
  /** Chance that a lemonade customer also takes a cookie (before the type and the price). */
  ATTACH: 0.4,
  PRICE_MIN: 1,
  PRICE_MAX: 20,
} as const;
/** Kids love cookies, sportsmen less so. */
export const COOKIE_TASTE: Record<string, number> = { kid: 1.5, adult: 1, granny: 1.2, sport: 0.6, tourist: 1.1 };

export const GOOD_IDS = Object.keys(GOODS) as GoodId[];

/** Cost of one unit (lemon, bottle, spoon, cup) at base prices. Used for cost per cup. */
export const UNIT_COST = {
  lemons: GOODS.lemon.price / GOODS.lemon.pack,
  water: GOODS.water.price / GOODS.water.pack,
  sugar: GOODS.sugar.price / GOODS.sugar.pack,
  cups: GOODS.cups.price / GOODS.cups.pack,
  cookies: GOODS.cookies.price / GOODS.cookies.pack,
};

/** Sugar price multiplier on a "sugar got pricier" day. */
export const SUGAR_HIKE = 1.3;
