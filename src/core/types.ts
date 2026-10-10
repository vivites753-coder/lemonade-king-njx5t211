export type WeatherId = 'sunny' | 'hot' | 'cloudy' | 'rain' | 'wind' | 'cold';
export type LocationId = 'yard' | 'park' | 'school' | 'beach';
export type PedTypeId = 'kid' | 'adult' | 'granny' | 'sport' | 'tourist';
export type UpgradeId =
  | 'umbrella'
  | 'sign'
  | 'banner'
  | 'speaker'
  | 'bike'
  | 'juicer_hand'
  | 'juicer_lever';
export type GoodId = 'lemon' | 'lemon_cheap' | 'water' | 'sugar' | 'cups' | 'cups_super';
export type StockKind = 'lemons' | 'water' | 'sugar' | 'cups';
export type Phase = 'title' | 'morning' | 'market' | 'prepare' | 'sell' | 'report' | 'shop';
export type AgeMode = 'kid' | 'pro';
export type Lang = 'uk' | 'en';
export type Avatar = 'boy' | 'girl';

export interface Vec {
  x: number;
  y: number;
}

export type Params = Record<string, string | number>;
