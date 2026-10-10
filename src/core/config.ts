// All tunable game numbers live here. Balance changes should not need logic changes.

export const CONFIG = {
  /** Real seconds per game hour at speed x1. */
  HOUR_SEC: 12.5,
  DAY_START: 8,
  DAY_END: 20,

  /** Chance that a pedestrian inside the attention zone stops, before modifiers. */
  BASE_STOP_CHANCE: 0.18,
  MAX_STOP_CHANCE: 0.8,
  MAX_QUEUE: 6,

  /** Stand centre in tile coordinates (same in every location). */
  STAND: { x: 5.5, y: 3.6 },
  /** The queue starts at the front-right corner of the table, so the banner on the front stays visible. */
  QUEUE_X0: 6.5,
  QUEUE_DX: 0.62,
  QUEUE_Y: 4.25,

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

  /** Attention radius in tiles. */
  BASE_RADIUS: 2.6,

  START_COINS: 100,
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

  FORECAST_ACCURACY: 0.8,

  /** Grandma's help when the player cannot afford even one pitcher. */
  GRANDMA_GIFT: 40,
  GRANDMA_GIFT_KID: 60,
} as const;

export function queueSpot(i: number): { x: number; y: number } {
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
