import type { GameState } from '../sim/state';

/**
 * Random day events. Each one is rolled once per morning. Texts live in i18n under
 * `event.<id>.title`, `event.<id>.text`, `event.<id>.lemi`.
 * To add an event: add a definition here, add texts, and handle its flag where it matters.
 */
export type DayEventId = 'festival' | 'thief' | 'sugarHike' | 'cupsSoldOut' | 'badLemons';

export interface DayEventDef {
  id: DayEventId;
  icon: string;
  minDay: number;
  chance: number;
  /** Extra condition on the saved game state. */
  cond?: (s: GameState) => boolean;
}

export const DAY_EVENTS: DayEventDef[] = [
  { id: 'festival', icon: '🎉', minDay: 4, chance: 0.1 },
  { id: 'thief', icon: '🦊', minDay: 3, chance: 0.2 },
  { id: 'sugarHike', icon: '📈', minDay: 4, chance: 0.15 },
  { id: 'cupsSoldOut', icon: '🚚', minDay: 3, chance: 0.12 },
  { id: 'badLemons', icon: '🤢', minDay: 3, chance: 0.08 },
];

export const FESTIVAL_PED = 1.6;
export const FESTIVAL_STOP = 1.3;
export const BAD_LEMONS_SHARE = 0.3;
export const NEWS_FLAVOURS = 4;
