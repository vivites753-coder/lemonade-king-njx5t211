import { CONFIG } from '../core/config';
import { DAY_EVENTS, LOC_EVENTS, NEWS_FLAVOURS, type DayEventId } from '../data/events';
import type { Game } from './game';

/** Rolls the day's events in the morning. Deterministic with the game RNG. */
export function rollDayEvents(g: Game): void {
  const { S, D, rng } = g;
  for (const ev of DAY_EVENTS) {
    const loc = LOC_EVENTS.find((e) => e.id === ev.id)?.loc;
    // one event per place per day
    const placeBusy = !!loc && LOC_EVENTS.some((e) => e.loc === loc && D.events[e.id]);
    const on = S.day >= ev.minDay && (!ev.cond || ev.cond(S)) && !placeBusy && rng.chance(ev.chance);
    applyEvent(g, ev.id, on);
  }
  const placeNews = LOC_EVENTS.find((e) => D.events[e.id]);
  D.newsKey = D.events.festival ? 'news.festival' : placeNews ? `news.${placeNews.id}` : `news.calm${rng.int(0, NEWS_FLAVOURS - 1)}`;
}

export function applyEvent(g: Game, id: DayEventId, on: boolean): void {
  const e = g.D.events;
  switch (id) {
    case 'thief':
      e.thiefAt = on ? g.rng.range(11, CONFIG.DAY_END - 3) : null;
      break;
    default:
      e[id] = on;
  }
}
