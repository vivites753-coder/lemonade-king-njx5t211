// The picture on a day card (an event, an accident, news from the stands): made of the game's own art, with a small
// badge in the corner that tells what happened (more people, closed, a price up...).
import type { LocationId } from '../core/types';
import type { CardInfo } from '../sim/game';
import { art, ico, locIco } from './dom';

interface CardPic {
  main: string;
  /** A small picture in the corner (assets/ui/ui_<badge>). */
  badge?: string;
}

/** More of it (people, a price). */
const UP = 'profit_up';
/** It does not work today (a sign with a cross). */
const CLOSED = 'pt_closed';

const seller = (badge: string): CardPic => ({ main: ico('pt_seller', ''), badge });

/** Every card the game shows (game.ts `card(...)`), by its id. */
export const CARD_ART: Record<string, (c: CardInfo) => CardPic> = {
  grandmaHelp: () => ({ main: art('char_granny_a_front') }),
  parentsHelp: () => ({ main: art('char_adult_a_front') + art('char_adult_b_front') }),
  broke: (c) => ({ main: ico(`up_${c.repair}`, ''), badge: 'pt_upgrades' }),
  festival: () => ({ main: art('prop_balloons') }),
  'ev.trains': () => ({ main: locIco('station'), badge: UP }),
  'ev.trackRepair': () => ({ main: locIco('station'), badge: CLOSED }),
  'ev.concert': () => ({ main: locIco('mall'), badge: 'up_speaker' }),
  'ev.mallSale': () => ({ main: locIco('mall'), badge: 'tax' }),
  'ev.busRush': () => ({ main: art('prop_bus_front'), badge: UP }),
  'ev.busStrike': () => ({ main: art('prop_bus_front'), badge: CLOSED }),
  storeOpened: () => ({ main: ico('store', '') }),
  sugarHike: () => ({ main: ico('gd_sugar', ''), badge: UP }),
  cupsSoldOut: () => ({ main: ico('gd_cups', ''), badge: CLOSED }),
  badLemons: () => ({ main: ico('gd_lemon', ''), badge: 'em_sick' }),
  outOfLemonade: () => ({ main: ico('gd_pitcher', ''), badge: CLOSED }),
  thiefCaught: () => ({ main: art('char_fox_dizzy') }),
  thiefLocked: () => ({ main: ico('up_cash_lock', '') }),
  thiefStole: () => ({ main: art('char_fox_front'), badge: 'em_money' }),
  thiefEmpty: () => ({ main: art('char_fox_front') }),
  // the places that opened (their names come as "@loc.<id>.name")
  locUnlocked: (c) => ({
    main: [...String(c.params?.list ?? '').matchAll(/@loc\.(\w+)\.name/g)].slice(0, 3).map((m) => locIco(m[1] as LocationId)).join(''),
    badge: 'trophy',
  }),
  pointsUnlocked: () => ({ main: ico('pt_stand', '') }),
  'acc.breakIn': () => ({ main: ico('btn_stock', ''), badge: 'em_alert' }),
  'acc.breakInLocked': () => ({ main: ico('up_cash_lock', '') }),
  'acc.runner': () => ({ main: art('char_sport_a_front'), badge: 'em_dizzy' }),
  'acc.football': () => ({ main: art('item_ball') }),
  'acc.helperSpill': () => ({ main: art('char_helper_boy_front'), badge: 'dirty' }),
  'acc.helperStole': () => ({ main: art('char_helper_boy_front'), badge: 'em_money' }),
  'acc.blackout': () => ({ main: ico('utilities', ''), badge: CLOSED }),
  'acc.dogs': () => ({ main: art('char_dog_brown') }),
  'staff.back': () => seller('em_happy'),
  'staff.ill': () => seller('em_sick'),
  'staff.sick': () => seller('em_sick'),
  'staff.late': () => seller('em_clock'),
  'staff.rude': () => seller('em_angry'),
  'staff.raise': () => seller('em_chat'),
  'staff.stole': () => seller('em_money'),
  'staff.quit': () => seller(CLOSED),
};

/** The picture of a card (Lemi's lemon for one without its own). */
export function cardArt(c: CardInfo): string {
  const p = CARD_ART[c.id]?.(c);
  const main = p?.main || ico('btn_tip', '');
  const badge = p?.badge ? ico(p.badge, '') : '';
  return `<div class="ev-art">${main}${badge ? `<span class="ev-badge">${badge}</span>` : ''}</div>`;
}
