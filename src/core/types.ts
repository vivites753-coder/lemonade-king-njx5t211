export type WeatherId = 'sunny' | 'hot' | 'cloudy' | 'rain' | 'wind' | 'cold';
export type LocationId = 'yard' | 'park' | 'school' | 'beach' | 'station' | 'mall';
export type PedTypeId = 'kid' | 'adult' | 'granny' | 'sport' | 'tourist';
export type UpgradeId =
  | 'umbrella'
  | 'sign'
  | 'banner'
  | 'speaker'
  | 'bike'
  | 'juicer_hand'
  | 'juicer_lever'
  | 'dispenser'
  | 'branded_cups'
  | 'loyalty'
  | 'mascot'
  | 'cash_lock'
  | 'tent'
  | 'toolkit'
  | 'cooler'
  | 'mixer_pro'
  | 'delivery';
/** Equipment that wears out and can break. The mixer is owned from the start. */
export type EquipId = 'mixer' | 'umbrella' | 'tent' | 'juicer_hand' | 'juicer_lever' | 'speaker' | 'bike' | 'dispenser';
export type GoodId = 'lemon' | 'lemon_cheap' | 'water' | 'sugar' | 'cups' | 'cups_super';
export type StockKind = 'lemons' | 'water' | 'sugar' | 'cups';
export type Phase = 'title' | 'morning' | 'market' | 'kitchen' | 'prepare' | 'sell' | 'report' | 'shop';
export type MixResult = 'none' | 'under' | 'perfect' | 'over';
export type AgeMode = 'kid' | 'pro';
export type Lang = 'uk' | 'en';
export type Avatar = 'boy' | 'girl';

export interface Vec {
  x: number;
  y: number;
}

export type Params = Record<string, string | number>;
