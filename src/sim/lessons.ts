// "Lesson of the day": the single most useful thing to learn from what just happened, with real numbers.
import { CONFIG } from '../core/config';
import type { Params } from '../core/types';
import { LOCATIONS } from '../data/locations';
import type { DayReport, DayState, GameState } from './state';

export function fmtHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Params starting with "@" are i18n keys the UI translates. */
export function pickLesson(S: GameState, D: DayState, r: DayReport): { key: string; params: Params } {
  const f = r.funnel;
  const loc = LOCATIONS[S.location];
  if (D.thief.stolen > 0) return { key: 'lesson.thief', params: { n: D.thief.stolen } };
  if (f.passed === 0 && r.sold === 0) return { key: 'lesson.rest', params: {} };
  // the very first evening teaches the main formula
  if (S.day === 1) return { key: 'lesson.profit', params: { income: r.income, expenses: r.expenses, profit: r.profit } };
  if ((D.weather === 'rain' || D.weather === 'cold') && f.sold < 15)
    return { key: 'lesson.weather', params: { w: `@weather.${D.weather}`, n: f.passed } };
  if (D.soldOutAt !== null && D.soldOutAt < CONFIG.DAY_END - 1.5)
    return { key: 'lesson.soldout', params: { time: fmtHour(D.soldOutAt) } };
  if (f.stopped >= 5 && f.tooExpensive / f.stopped >= 0.35)
    return { key: 'lesson.price', params: { n: f.tooExpensive, price: S.price, fair: loc.fairPrice } };
  if (r.wastedCups >= 5) return { key: 'lesson.waste', params: { n: r.wastedCups, cost: r.wasteCost } };
  if (D.spoiledOvernight > 0) return { key: 'lesson.spoiled', params: { n: D.spoiledOvernight } };
  if (r.profit < 0) return { key: 'lesson.loss', params: { income: r.income, expenses: r.expenses } };
  if (f.impatient >= 3) return { key: 'lesson.patience', params: { n: f.impatient } };
  if (f.queueFull >= 3) return { key: 'lesson.queuefull', params: { n: f.queueFull } };
  if (S.day >= 4 && !S.upgrades.speaker && r.outOfRange >= 15) return { key: 'lesson.reach', params: { n: r.outOfRange } };
  if (S.day >= 3 && S.location === 'yard' && f.passed < 150) return { key: 'lesson.location', params: { n: f.passed } };
  return { key: 'lesson.profit', params: { income: r.income, expenses: r.expenses, profit: r.profit } };
}
