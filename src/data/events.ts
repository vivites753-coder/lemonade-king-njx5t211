import type { LocationId } from '../core/types';
import type { GameState } from '../sim/state';
import { locationUnlocked } from './locations';

/**
 * Random day events. Each one is rolled once per morning. Texts live in i18n under
 * `event.<id>.title`, `event.<id>.text`, `event.<id>.lemi`.
 * To add an event: add a definition here, add texts, and handle its flag where it matters.
 */
export type DayEventId = 'festival' | 'thief' | 'sugarHike' | 'cupsSoldOut' | 'badLemons' | LocEventId;
/** Events that change the crowd at one place only. */
export type LocEventId = 'trains' | 'trackRepair' | 'concert' | 'mallSale' | 'busRush' | 'busStrike';

export interface DayEventDef {
  id: DayEventId;
  icon: string;
  minDay: number;
  chance: number;
  /** Extra condition on the saved game state. */
  cond?: (s: GameState) => boolean;
}

export interface LocEventDef {
  id: LocEventId;
  loc: LocationId;
  icon: string;
  chance: number;
  /** Pedestrian multiplier at that place for a game hour. */
  ped: (hour: number) => number;
  /** Stop-chance multiplier (people are thirstier or in a good mood). */
  stop?: number;
}

/** At most one event per place per day: a later one in this list is skipped when an earlier one is on. */
export const LOC_EVENTS: LocEventDef[] = [
  { id: 'trains', loc: 'station', icon: '🚆', chance: 0.22, ped: () => 1.7 },
  { id: 'trackRepair', loc: 'station', icon: '🚧', chance: 0.1, ped: () => 0.45 },
  { id: 'concert', loc: 'mall', icon: '🎤', chance: 0.16, ped: (h) => (h >= 15 ? 2.2 : 1.1), stop: 1.2 },
  { id: 'mallSale', loc: 'mall', icon: '🛍️', chance: 0.12, ped: () => 1.45 },
  { id: 'busRush', loc: 'busstop', icon: '🚌', chance: 0.2, ped: () => 1.6 },
  { id: 'busStrike', loc: 'busstop', icon: '🚧', chance: 0.1, ped: () => 0.45 },
];

export const DAY_EVENTS: DayEventDef[] = [
  { id: 'festival', icon: '🎉', minDay: 4, chance: 0.1 },
  { id: 'thief', icon: '🦊', minDay: 3, chance: 0.2 },
  { id: 'sugarHike', icon: '📈', minDay: 4, chance: 0.15 },
  { id: 'cupsSoldOut', icon: '🚚', minDay: 3, chance: 0.12 },
  { id: 'badLemons', icon: '🤢', minDay: 3, chance: 0.08 },
  // place events are rolled only once the place is open for the player
  ...LOC_EVENTS.map((e) => ({ id: e.id, icon: e.icon, minDay: 1, chance: e.chance, cond: (s: GameState) => locationUnlocked(s.bestRep, e.loc) })),
];

/** The city festival happens outdoors: more people in the street, none extra indoors. */
export const FESTIVAL_PED = 1.6;
export const BAD_LEMONS_SHARE = 0.3;
export const NEWS_FLAVOURS = 4;
