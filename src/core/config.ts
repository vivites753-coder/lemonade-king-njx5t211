// All tunable game numbers live here. Balance changes should not need logic changes.

export const CONFIG = {
  /** Real seconds per game hour at speed x1. */
  HOUR_SEC: 12.5,
  DAY_START: 8,
  DAY_END: 20,

  /** Chance that a pedestrian inside the attention zone stops, before modifiers. */
  BASE_STOP_CHANCE: 0.18,
  /** Never more than this, whatever is bought (all the upgrades on a sunny day with 5 stars just reach it). */
  MAX_STOP_CHANCE: 0.4,
  /** Flyers of the day add this to the advertising. */
  FLYERS_ADS: 0.15,
  /** Online ads (from reputation 3): a daily price, and twice the flyers' effect for twice their price. */
  ONLINE_ADS_COST: 50,
  ONLINE_ADS_ADS: 0.3,
  ONLINE_ADS_MIN_REP: 3,
  MAX_QUEUE: 6,

  /** Stand centre in tile coordinates (same in every location). */
  STAND: { x: 5.5, y: 3.6 },
  /** The queue starts at the front-right corner of the table, so the banner on the front stays visible. */
  QUEUE_X0: 6.5,
  QUEUE_DX: 0.62,
  QUEUE_Y: 4.25,
  /** The second counter (big stand, truck): its queue runs to the left. */
  QUEUE2_X0: 4.45,
  QUEUE2_DX: 0.55,

  LANES: [
    { id: 'near', y: 5.5, weight: 0.65 },
    { id: 'far', y: 8.5, weight: 0.35 },
  ],
  LANE_JITTER: 0.25,
  MAP_SIZE: 12,
  /** People appear/disappear at the diorama edges (they fade in/out there). */
  SPAWN_LEFT: -0.2,
  SPAWN_RIGHT: 12.2,
  MAX_PEDS: 80,
  /** All places have 40 % fewer passers than the base densities say. */
  CROWD_SCALE: 0.6,
  /** A day's crowd at one place is this many times the usual: from half to a bit more than usual. */
  CROWD_DAY_MIN: 0.5,
  CROWD_DAY_MAX: 1.4,
  /** A new player: more people walk past the yard on the first days, then the bonus fades a little every day. */
  NEWBIE_YARD_BONUS: 0.2,
  NEWBIE_DAYS: 5,
  NEWBIE_FADE: 0.04,

  /** Attention radius in tiles. */
  BASE_RADIUS: 2.6,

  START_COINS: 200,
  START_REP: 1,
  GOAL_COINS: 600,
  GOAL_REP: 1.5,

  MARKET_TRIP_H: 2,
  BIKE_TRIP_H: 1,

  /** Simulation seconds. */
  SERVE_TIME: 1.6,
  /** The pouring mini-game (the player holds "Pour"): real seconds to fill the gauge from empty to the top. */
  POUR_TIME: 1.5,
  /** How much the speed of the stream changes from cup to cup (± share); the dispenser pours steadier. */
  POUR_VARY: 0.25,
  POUR_VARY_DISPENSER: 0.1,
  /** The green part of the gauge (shares of the top): let go below it and the cup is not full, above it the cup overflows. */
  POUR_ZONE: [0.72, 0.9] as [number, number],
  POUR_ZONE_DISPENSER: [0.66, 0.93] as [number, number],
  /** With the dispenser a cup fills fast (real seconds to the top) and the tap stops by itself at the dose: no spills. */
  POUR_TIME_DISPENSER: 0.55,
  POUR_DOSE_DISPENSER: 0.8,
  /** A press shorter than this (share of the gauge) pours nothing: it was not meant. */
  POUR_MIN: 0.12,
  /** Satisfaction taken off for a cup that is not full, and added for a cup poured just right. */
  UNDERFILL_PENALTY: 0.25,
  PERFECT_POUR_BONUS: 0.05,
  PITCHER_TIME: 6,

  CUPS_PER_PITCHER: 10,
  WATER_PER_PITCHER: 2,
  /** A lemon batch of this age (in nights) spoils. */
  LEMON_SPOIL_AGE: 4,
  FLYERS_COST: 25,

  PATIENCE_MIN: 18,
  PATIENCE_MAX: 30,
  WALLET_MIN: 0.85,
  WALLET_MAX: 1.35,

  PRICE_MIN: 1,
  PRICE_MAX: 30,
  RECIPE_LEMONS_MIN: 2,
  RECIPE_LEMONS_MAX: 6,
  RECIPE_SUGAR_MIN: 0,
  RECIPE_SUGAR_MAX: 5,
  IDEAL_LEMONS: 4,
  IDEAL_SUGAR: 2,

  REP_ANGRY: -0.05,
  REP_SAT_PIVOT: 0.55,
  REP_SAT_SCALE: 0.012,

  /** Real seconds the player has to tap the thief. */
  THIEF_WINDOW: 5,
  THIEF_MAX: 40,
  THIEF_REWARD: 10,
  /** Taps on the fox needed to catch him; every hit makes him faster and he runs off somewhere else. */
  THIEF_HITS: 3,
  THIEF_SPEED: 1.1,
  THIEF_SPEED_MULT: 2,
  THIEF_SPEED_MAX: 4.4,

  FORECAST_ACCURACY: 0.8,

  /** What grandma or the parents give when the player has run out of money (the same for both game levels). */
  GRANDMA_GIFT: 150,
  GRANDMA_GIFT_KID: 150,
  /** The family helps in the morning when the purse holds less than this (or cannot buy even one pitcher). */
  FAMILY_HELP_BELOW: 30,

  /** Helper: daily wage, pours faster and serves by himself. Can be hired from this reputation. */
  HELPER_WAGE: 30,
  HELPER_MIN_REP: 2,
  /** A second helper (for a stand with two counters) from this reputation. */
  HELPER2_MIN_REP: 3,
  HELPER_SERVE_MULT: 0.6,
  /** Real seconds the helper waits before taking the next customer. */
  HELPER_DELAY: 0.35,

  /** Kitchen: game hours to make lemonade = BASE + PER_PITCHER × pitchers (×2 when stirring by hand). */
  KITCHEN_BASE_H: 0.25,
  KITCHEN_PER_PITCHER_H: 0.15,
  KITCHEN_MAX_JUICE: 6,
  KITCHEN_MAX_SUGAR: 5,
  /** Taps needed to stir by hand when the mixer is broken. */
  STIR_TAPS: 14,
  MIX_QUALITY: { perfect: 1, over: 0.93, under: 0.85, none: 0.85 },

  /** The freezer fills up every night: this many trays at most (the ice that does not fit is thrown away); a jug takes
   * one tray. */
  FREEZER_ICE_PER_NIGHT: 14,
  FREEZER_ICE_MAX: 14,
  ICE_PER_PITCHER: 1,
  /** Satisfaction of an iced cup indoors, where the weather matters less. */
  ICE_INDOOR: 0.08,

  /** Maintenance in the shop costs this share of a repair at 0% condition. */
  MAINTENANCE_SHARE: 0.5,

  /** Level 4, the own store (LocationDef.store): the tax is this share of the day's profit (not of the takings). */
  STORE_TAX: 0.1,
  /** What the store brings by itself: its shop window and signboard (stop chance), a pleasant place (comfort) and the
   * awning (this share of the bad-weather penalty is gone). Its counter has two places, and its cold display keeps
   * unsold lemonade until tomorrow. */
  STORE_ADS: 0.25,
  STORE_COMFORT: 1.08,
  STORE_WEATHER_SHIELD: 0.6,
  /** In the store this share of the served customers sits down at a free table for a while (simulation seconds), and
   * leaving, some leave a tip (coins). */
  SIT_CHANCE: 0.4,
  SIT_TIME: [8, 16] as [number, number],
  TIP_CHANCE: 0.5,
  TIP: [1, 3] as [number, number],
} as const;

/**
 * Where the selling buttons stand by default (the centres, as shares of the screen): "Pour" at the right edge, in reach
 * of the thumb, and the cups, "Make" and "End the day" in a row along the bottom. The price and the speaker stay at the
 * bottom left, the speed buttons at the top. The player can still drag them anywhere (Settings → Selling buttons).
 */
export const HUD_DEFAULT_LAYOUT: Record<string, [number, number]> = {
  speed: [0.7, 0.052],
  serve: [0.861, 0.697],
  cups: [0.505, 0.938],
  make: [0.634, 0.925],
  end: [0.813, 0.923],
};

/** Place number i in the queue of a counter (0: to the right of the stand, 1: to the left); dy: the stand stands that
 * much further back (the own store, see counterDy in src/data/storeRoom.ts). */
export function queueSpot(i: number, counter = 0, dy = 0): { x: number; y: number } {
  if (counter === 1) return { x: CONFIG.QUEUE2_X0 - CONFIG.QUEUE2_DX * i, y: CONFIG.QUEUE_Y + dy };
  return { x: CONFIG.QUEUE_X0 + CONFIG.QUEUE_DX * i, y: CONFIG.QUEUE_Y + dy };
}

export type Edition = 'demo' | 'full';

function readEdition(): Edition {
  try {
    return import.meta.env?.MODE === 'full' || import.meta.env?.VITE_EDITION === 'full' ? 'full' : 'demo';
  } catch {
    return 'demo';
  }
}

export const EDITION: Edition = readEdition();
