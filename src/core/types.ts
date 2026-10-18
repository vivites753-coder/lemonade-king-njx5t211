export type WeatherId = 'sunny' | 'hot' | 'cloudy' | 'rain' | 'wind' | 'cold';
export type LocationId = 'yard' | 'park' | 'school' | 'beach' | 'station' | 'mall' | 'busstop' | 'townhall' | 'parkside';
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
  | 'delivery'
  | 'scooter'
  | 'tv'
  | 'big_stand'
  | 'truck'
  | 'freezer';
/** Equipment that wears out and can break. The mixer is owned from the start. */
export type EquipId = 'mixer' | 'umbrella' | 'tent' | 'juicer_hand' | 'juicer_lever' | 'speaker' | 'bike' | 'scooter' | 'dispenser' | 'tv' | 'freezer';
export type GoodId = 'lemon' | 'lemon_cheap' | 'water' | 'sugar' | 'cups' | 'cups_super' | 'cookies' | 'lemon_bulk' | 'water_bulk' | 'sugar_bulk' | 'cups_bulk';
export type StockKind = 'lemons' | 'water' | 'sugar' | 'cups' | 'cookies';
export type Phase = 'title' | 'morning' | 'market' | 'kitchen' | 'prepare' | 'sell' | 'report' | 'shop';
export type MixResult = 'none' | 'under' | 'perfect' | 'over';
export type AgeMode = 'kid' | 'pro';
export type Lang = 'uk' | 'en' | 'ro';
export type Avatar = 'boy' | 'girl';

export interface Vec {
  x: number;
  y: number;
}

export type Params = Record<string, string | number>;
