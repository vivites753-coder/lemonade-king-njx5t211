import { CONFIG } from '../core/config';
import { DAY_EVENTS, NEWS_FLAVOURS, type DayEventId } from '../data/events';
import type { Game } from './game';

/** Rolls the day's events in the morning. Deterministic with the game RNG. */
export function rollDayEvents(g: Game): void {
  const { S, D, rng } = g;
  for (const ev of DAY_EVENTS) {
    const on = S.day >= ev.minDay && (!ev.cond || ev.cond(S)) && rng.chance(ev.chance);
    applyEvent(g, ev.id, on);
  }
  D.newsKey = D.events.festival ? 'news.festival' : `news.calm${rng.int(0, NEWS_FLAVOURS - 1)}`;
}

export function applyEvent(g: Game, id: DayEventId, on: boolean): void {
  const e = g.D.events;
  switch (id) {
    case 'festival':
      e.festival = on;
      break;
    case 'thief':
      e.thiefAt = on ? g.rng.range(11, CONFIG.DAY_END - 3) : null;
      break;
    case 'sugarHike':
      e.sugarHike = on;
      break;
    case 'cupsSoldOut':
      e.cupsSoldOut = on;
      break;
    case 'badLemons':
      e.badLemons = on;
      break;
  }
}
