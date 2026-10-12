// Little accidents and lucky finds during the selling day. Each one is rolled in the morning with a small
// chance and happens at a random hour. Texts: `card.acc.<id>.*` (accidents) and `bonus.<id>.*` (finds).

export type AccidentId = 'runner' | 'football' | 'helperSpill' | 'helperStole' | 'blackout' | 'dogs';
export type BonusId = 'cat' | 'wallet' | 'balloon' | 'coin';

export interface AccidentDef {
  id: AccidentId;
  icon: string;
  chance: number;
  minDay: number;
  /** Only when a helper works today. */
  needsHelper?: boolean;
  /** Does not happen under a roof (no football in the mall). */
  outdoorOnly?: boolean;
}

export const ACCIDENTS: AccidentDef[] = [
  { id: 'runner', icon: '🏃', chance: 0.07, minDay: 3 },
  { id: 'football', icon: '⚽', chance: 0.05, minDay: 4, outdoorOnly: true },
  { id: 'helperSpill', icon: '💦', chance: 0.1, minDay: 2, needsHelper: true },
  { id: 'helperStole', icon: '💸', chance: 0.05, minDay: 2, needsHelper: true },
  { id: 'blackout', icon: '⚡', chance: 0.05, minDay: 5 },
  { id: 'dogs', icon: '🐕', chance: 0.06, minDay: 4, outdoorOnly: true },
];

export interface BonusDef {
  id: BonusId;
  icon: string;
  chance: number;
  reward: number;
  rep: number;
  /** Real seconds it stays on screen. */
  life: number;
}

export const BONUSES: BonusDef[] = [
  { id: 'cat', icon: '🐱', chance: 0.12, reward: 20, rep: 0.03, life: 40 },
  { id: 'wallet', icon: '👛', chance: 0.08, reward: 15, rep: 0.05, life: 25 },
  { id: 'balloon', icon: '🎈', chance: 0.1, reward: 10, rep: 0.03, life: 11 },
  { id: 'coin', icon: '✨', chance: 0.15, reward: 5, rep: 0, life: 20 },
];

export const INCIDENT = {
  MAX_ACCIDENTS: 2,
  MAX_BONUSES: 2,
  /** Game hours. */
  BLACKOUT_H: 1.5,
  DOGS_H: 1,
  /** People stop this much less often while the dogs run around. */
  DOGS_STOP: 0.35,
  HELPER_SPILL_REP: 0.08,
  /** Overnight break-in into the storeroom (from day 5); the cash lock also locks the storeroom. */
  BREAK_IN_CHANCE: 0.04,
  BREAK_IN_MIN_DAY: 5,
  BREAK_IN_SHARE: 0.3,
} as const;

/** Upgrades that need electricity (they stop during a blackout). */
export const ELECTRIC = ['speaker', 'dispenser', 'tv'] as const;
