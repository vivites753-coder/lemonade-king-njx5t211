import type { UpgradeId } from '../core/types';

export type UpgradeCat = 'ads' | 'comfort' | 'production' | 'protection';

export interface UpgradeDef {
  id: UpgradeId;
  icon: string;
  price: number;
  cat: UpgradeCat;
  requires?: UpgradeId;
  /** Additive advertising bonus to the stop chance. */
  ads?: number;
  /** Advertising bonus at the school and on festival days (instead of `ads`). */
  adsSpecial?: number;
  /** Extra attention radius in tiles. */
  radius?: number;
  /** Multiplier for the stop chance (comfort). */
  comfort?: number;
  /** Multiplier for customer patience. */
  patience?: number;
  /** Market trip hours with this upgrade. */
  tripHours?: number;
  /** Hours removed from travel to a location. */
  travelReduce?: number;
  /** Lemons saved per pitcher (the best owned juicer counts). */
  lemonReduce?: number;
  /** Can be switched on/off while selling. */
  toggle?: boolean;
  /** Multiplier for the time to pour one cup. */
  serveMult?: number;
  /** Multiplier for reputation growth. */
  repMult?: number;
  /** Every N-th cup is free (loyalty card). */
  freeEvery?: number;
  /** The fox cannot steal. */
  lockCash?: boolean;
  /** Share of the bad-weather penalty that is removed (0.5 = half). */
  weatherShield?: number;
  /** Multipliers for equipment wear and repair costs. */
  wearMult?: number;
  repairMult?: number;
  /** Unsold lemonade keeps until tomorrow. */
  carryOver?: boolean;
  /** Only useful outdoors: no effect and no wear under a roof (station, mall). */
  outdoorOnly?: boolean;
  /** Mixing in the kitchen is always perfect. */
  perfectMix?: boolean;
  /** Market prices markup when the goods are delivered (no trip). */
  deliveryMarkup?: number;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  // advertising
  sign: { id: 'sign', icon: '🖍️', price: 60, cat: 'ads', ads: 0.2 },
  banner: { id: 'banner', icon: '🎏', price: 150, cat: 'ads', ads: 0.45, radius: 0.7 },
  loyalty: { id: 'loyalty', icon: '🎟️', price: 100, cat: 'ads', ads: 0.15, freeEvery: 10 },
  branded_cups: { id: 'branded_cups', icon: '🥤', price: 200, cat: 'ads', repMult: 1.5 },
  mascot: { id: 'mascot', icon: '🍋', price: 220, cat: 'ads', ads: 0.15, adsSpecial: 0.4 },
  speaker: { id: 'speaker', icon: '🔊', price: 250, cat: 'ads', ads: 0.35, radius: 2.3, toggle: true },
  // comfort and speed
  umbrella: { id: 'umbrella', icon: '⛱️', price: 80, cat: 'comfort', comfort: 1.1, patience: 1.3, outdoorOnly: true },
  dispenser: { id: 'dispenser', icon: '🚰', price: 180, cat: 'comfort', serveMult: 0.7 },
  bike: { id: 'bike', icon: '🚲', price: 300, cat: 'comfort', tripHours: 1, travelReduce: 1 },
  delivery: { id: 'delivery', icon: '🚚', price: 80, cat: 'comfort', deliveryMarkup: 1.1 },
  tent: { id: 'tent', icon: '⛺', price: 400, cat: 'comfort', requires: 'umbrella', weatherShield: 0.5, comfort: 1.05, outdoorOnly: true },
  // production
  juicer_hand: { id: 'juicer_hand', icon: '🍋', price: 120, cat: 'production', lemonReduce: 1 },
  juicer_lever: { id: 'juicer_lever', icon: '⚙️', price: 300, cat: 'production', requires: 'juicer_hand', lemonReduce: 2 },
  mixer_pro: { id: 'mixer_pro', icon: '🌀', price: 250, cat: 'production', perfectMix: true },
  cooler: { id: 'cooler', icon: '🧊', price: 150, cat: 'production', carryOver: true },
  // protection
  cash_lock: { id: 'cash_lock', icon: '🔒', price: 120, cat: 'protection', lockCash: true },
  toolkit: { id: 'toolkit', icon: '🧰', price: 150, cat: 'protection', wearMult: 0.5, repairMult: 0.6 },
};

/** Display order in the shop, grouped by category. */
export const UPGRADE_ORDER: UpgradeId[] = [
  'sign',
  'banner',
  'loyalty',
  'branded_cups',
  'mascot',
  'speaker',
  'umbrella',
  'dispenser',
  'delivery',
  'bike',
  'tent',
  'juicer_hand',
  'cooler',
  'mixer_pro',
  'juicer_lever',
  'cash_lock',
  'toolkit',
];

export const UPGRADE_CATS: UpgradeCat[] = ['ads', 'comfort', 'production', 'protection'];
