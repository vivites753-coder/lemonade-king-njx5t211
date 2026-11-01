// The path of the day, at the top of the window of every stage: the morning (the place, the market, the kitchen,
// getting ready), the day (selling) and the evening (the report, the upgrades). The part of the day also colours the
// windows and the clock of the top bar (styles.css: [data-tod]).
import type { Phase } from '../core/types';
import { t } from '../i18n';
import { gi, type GlyphName } from './dom';

export type DayPart = 'morning' | 'day' | 'evening';

const PARTS: { id: DayPart; icon: GlyphName; steps: Phase[] }[] = [
  { id: 'morning', icon: 'sunrise', steps: ['morning', 'market', 'kitchen', 'prepare'] },
  { id: 'day', icon: 'sun', steps: ['sell'] },
  { id: 'evening', icon: 'moon', steps: ['report', 'shop'] },
];

/** The part of the day of a stage (none on the title screen). The kitchen opened while selling belongs to the day:
 * the game is then in its 'sell' phase. */
export function dayPart(p: Phase): DayPart | null {
  return PARTS.find((x) => x.steps.includes(p))?.id ?? null;
}

/** The three parts of the day (the ones behind ticked) and, under them, the stages of the current part; '' on the
 * title screen. */
export function dayPathHtml(p: Phase): string {
  const at = PARTS.findIndex((x) => x.steps.includes(p));
  if (at < 0) return '';
  const cur = PARTS[at];
  const now = cur.steps.indexOf(p);
  const parts = PARTS.map((x, i) => `<span class="dp-part ${i < at ? 'done' : i === at ? 'on' : 'next'}" data-tod="${x.id}">${gi(i < at ? 'tick' : x.icon)} ${t(`day.${x.id}`)}</span>`).join('');
  const steps =
    cur.steps.length > 1
      ? `<div class="dp-steps" data-tod="${cur.id}">${cur.steps.map((s, j) => `<span class="dp-step${j < now ? ' done' : j === now ? ' now' : ''}">${t(`day.step.${s}`)}</span>`).join('<i>›</i>')}</div>`
      : '';
  return `<div class="day-path">${parts}${steps}</div>`;
}
