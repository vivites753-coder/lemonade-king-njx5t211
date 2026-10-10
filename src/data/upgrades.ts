import type { UpgradeId } from '../core/types';

export interface UpgradeDef {
  id: UpgradeId;
  icon: string;
  price: number;
  requires?: UpgradeId;
  /** Additive advertising bonus to the stop chance. */
  ads?: number;
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
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  sign: { id: 'sign', icon: '🖍️', price: 60, ads: 0.2 },
  umbrella: { id: 'umbrella', icon: '⛱️', price: 80, comfort: 1.1, patience: 1.3 },
  juicer_hand: { id: 'juicer_hand', icon: '🍋', price: 120, lemonReduce: 1 },
  banner: { id: 'banner', icon: '🎏', price: 150, ads: 0.45, radius: 0.7 },
  speaker: { id: 'speaker', icon: '🔊', price: 250, ads: 0.35, radius: 2.3, toggle: true },
  bike: { id: 'bike', icon: '🚲', price: 300, tripHours: 1, travelReduce: 1 },
  juicer_lever: { id: 'juicer_lever', icon: '⚙️', price: 300, requires: 'juicer_hand', lemonReduce: 2 },
};

/** Display order in the shop. */
export const UPGRADE_ORDER: UpgradeId[] = ['sign', 'umbrella', 'juicer_hand', 'banner', 'speaker', 'bike', 'juicer_lever'];
