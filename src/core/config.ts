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

  /** Grandma's help when the player cannot afford even one pitcher. */
  GRANDMA_GIFT: 40,
  GRANDMA_GIFT_KID: 60,
  /** Family helps in the morning when the purse is this empty. */
  FAMILY_HELP_BELOW: 10,

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

  /** Maintenance in the shop costs this share of a repair at 0% condition. */
  MAINTENANCE_SHARE: 0.5,
} as const;

/** Place number i in the queue of a counter (0: to the right of the stand, 1: to the left). */
export function queueSpot(i: number, counter = 0): { x: number; y: number } {
  if (counter === 1) return { x: CONFIG.QUEUE2_X0 - CONFIG.QUEUE2_DX * i, y: CONFIG.QUEUE_Y };
  return { x: CONFIG.QUEUE_X0 + CONFIG.QUEUE_DX * i, y: CONFIG.QUEUE_Y };
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
