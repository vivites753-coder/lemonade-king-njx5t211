import type { EquipId, UpgradeId, WeatherId } from '../core/types';

/**
 * Equipment wears out a little every working day. Worn equipment breaks more often; broken equipment stops
 * working until it is repaired (repairs cost coins). Regular maintenance in the shop is cheaper than repairs.
 */
export interface EquipDef {
  id: EquipId;
  icon: string;
  /** The upgrade that gives this equipment; the mixer is owned from the start. */
  upgrade?: UpgradeId;
  /** Condition lost per working day (percent), random in this range. */
  wear: [number, number];
  /** Repair cost in coins. */
  repair: number;
  /** Extra wear in some weather. */
  weather?: Partial<Record<WeatherId, number>>;
}

export const EQUIPMENT: Record<EquipId, EquipDef> = {
  mixer: { id: 'mixer', icon: '🌀', wear: [7, 13], repair: 30 },
  umbrella: { id: 'umbrella', icon: '⛱️', upgrade: 'umbrella', wear: [4, 8], repair: 30, weather: { wind: 3, rain: 1.5 } },
  tent: { id: 'tent', icon: '⛺', upgrade: 'tent', wear: [3, 6], repair: 80, weather: { wind: 2.5 } },
  juicer_hand: { id: 'juicer_hand', icon: '🍋', upgrade: 'juicer_hand', wear: [5, 9], repair: 25 },
  juicer_lever: { id: 'juicer_lever', icon: '⚙️', upgrade: 'juicer_lever', wear: [4, 8], repair: 60 },
  speaker: { id: 'speaker', icon: '🔊', upgrade: 'speaker', wear: [4, 8], repair: 70, weather: { rain: 2 } },
  bike: { id: 'bike', icon: '🚲', upgrade: 'bike', wear: [4, 9], repair: 20 },
  dispenser: { id: 'dispenser', icon: '🚰', upgrade: 'dispenser', wear: [4, 7], repair: 50 },
};

export const EQUIP_IDS = Object.keys(EQUIPMENT) as EquipId[];

/** Below this condition equipment may break. */
export const BREAK_RISK_BELOW = 40;
/** Chance per game hour of a breakdown while selling, per point below MIDDAY_RISK_BELOW. */
export const MIDDAY_RISK_BELOW = 45;
export const MIDDAY_RISK_PER_POINT = 0.004;
/** The pro mixer barely wears out. */
export const PRO_MIXER_WEAR = 0.2;
