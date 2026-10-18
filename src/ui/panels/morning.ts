import type { EquipId, LocationId } from '../../core/types';
import { LOC_EVENTS } from '../../data/events';
import { LOCATIONS, LOCATION_IDS, storeSetupCost } from '../../data/locations';
import { CONFIG } from '../../core/config';
import { t } from '../../i18n';
import { lemonsTotal } from '../../sim/state';
import type { Game } from '../../sim/game';
import { coin, dots, fmtDur, fmtHour, ico, locIco, weatherIco } from '../dom';
import type { Panel, UIApi } from './types';

/** A tap on a place: a store that is not open yet asks first whether to open it (it costs a lot, once). */
export function pickPlace(g: Game, ui: UIApi, id: LocationId): void {
  const l = LOCATIONS[id];
  if (l.store && !g.storeReady(id)) {
    if (!g.canOpenStore(id).ok) {
      // says why not (the money)
      g.openStore(id);
      return;
    }
    const text = t('store.openAsk', {
      place: t(`loc.${id}.name`),
      r: l.store.renovation,
      e: l.store.equipment,
      n: storeSetupCost(id),
      rent: l.rent,
      util: l.store.utilities,
      tax: Math.round(CONFIG.STORE_TAX * 100),
    });
    ui.confirm(text, () => g.openStore(id));
    return;
  }
  g.chooseLocation(id);
}

/** Cards of all places; a tap sends `loc:<id>`. */
export function locationCards(g: Game): string {
  const S = g.S;
  const D = g.D;
  return LOCATION_IDS.map((id) => {
      const l = LOCATIONS[id];
      const repLock = !g.unlocked(id);
      const own = S.points.find((p) => p.loc === id);
      const locked = repLock || !!own || (S.day === 1 && id !== 'yard');
      const travel = g.travelHours(id);
      const ev = repLock ? undefined : LOC_EVENTS.find((e) => e.loc === id && D.events[e.id]);
      // an own store (level 4): what opening it costs, or how much of it has come back
      const st = S.stores[id];
      const storeLine = !l.store || repLock
        ? ''
        : st
          ? `<span class="loc-own">✅ ${t('loc.storeReady', { pct: Math.max(0, Math.min(100, Math.round((st.earned / st.invested) * 100))) })}</span>`
          : `<span class="loc-store">🔨 ${t('loc.storeSetup', { n: coin(storeSetupCost(id)) })}</span>`;
      return `<button class="loc${S.location === id ? ' sel' : ''}${repLock ? ' rep-lock' : ''}" data-act="loc:${id}" ${locked ? 'disabled' : ''}>
        <span class="loc-ico">${repLock ? ico('lock', '🔒') : locIco(id)}</span>
        <span class="grow">
          <b>${t(`loc.${id}.name`)}</b>${l.indoor ? ` <span class="tag">🏠 ${t('loc.indoor')}</span>` : ''}${l.store ? ` <span class="tag tag-store">${ico('store', '🏪')} ${t('loc.store')}</span>` : ''}
          ${repLock ? `<span class="loc-lock">⭐ ${t('loc.locked', { n: l.minRep ?? 0 })}</span>` : ''}
          ${ev ? `<span class="loc-ev">${t(`loc.ev.${ev.id}`)}</span>` : ''}
          ${own ? `<span class="loc-own">${ico('pt_stand', '🏪')} ${t('loc.ownPoint')}</span>` : ''}
          ${storeLine}
          <small>${t(`loc.${id}.desc`)}</small>
          <span class="loc-meta">
            <span>👥 ${dots(l.trafficStars)}</span>
            <span>${l.rent ? t('loc.rent', { n: coin(l.rent) }) : '✅ ' + t('loc.free')}</span>
            ${l.store ? `<span>${ico('utilities', '🔌')} ${t('loc.utilities', { n: coin(l.store.utilities) })}</span>` : ''}
            <span>🕐 ${travel ? t('loc.travel', { t: fmtDur(travel) }) : t('loc.travel0')}</span>
          </span>
          <small>⏰ ${t(`loc.${id}.peak`)}</small>
        </span>
      </button>`;
  }).join('');
}

export const morningPanel: Panel = {
  id: 'morning',
  dock: true,
  render(g) {
    const S = g.S;
    const D = g.D;
    const st = S.stock;
    const hasStock = lemonsTotal(st) + st.water + st.sugar + st.cups > 0;
    const locCards = locationCards(g);

    return `<div class="panel">
      <div class="panel-head"><h2>☀️ ${t('morning.title', { n: S.day })}</h2></div>
      <div class="panel-body">
        <div class="card row">
          <span class="big-ico">${weatherIco(D.forecast)}</span>
          <span class="grow"><b>${t('morning.forecast', { w: t(`weather.${D.forecast}`) })}</b><br><small class="muted">${t('morning.forecastNote')}</small></span>
        </div>
        <div class="card row"><span class="big-ico">📰</span><span class="grow"><b>${t('news.title')}</b><br>${t(D.newsKey)}</span></div>
        ${Object.keys(g.S.broken).length ? `<div class="warn-box">🔧 ${t('morning.broken', { list: (Object.keys(g.S.broken) as EquipId[]).map((id) => t(`equip.${id}`)).join(', ') })}</div>` : ''}
        ${D.spoiledOvernight > 0 ? `<div class="warn-box">🍋💀 ${t('morning.spoiled', { n: D.spoiledOvernight })}</div>` : ''}
        <div class="note">${hasStock ? `<b>${t('morning.stock')}:</b> 🍋 ${lemonsTotal(st)} · 💧 ${st.water} · 🍬 ${st.sugar} · 🥤 ${st.cups}` : t('morning.noStock')}</div>
        <h3>${t('morning.where')}</h3>
        ${S.day === 1 ? `<div class="note">🔒 ${t('morning.day1lock')}</div>` : ''}
        <div class="locs">${locCards}</div>
        <div class="good-box">🕐 ${t('morning.openAt', { a: fmtHour(g.openingHour(true)), b: fmtHour(g.openingHour(false)) })}</div>
      </div>
      <div class="panel-foot">
        <button class="btn btn-y btn-big" data-act="market" ${g.canGoMarket() ? '' : 'disabled'}>${ico('gd_market', '🛒')} ${t('morning.toMarket', { t: fmtDur(g.tripHours()) })}</button>
        ${g.S.upgrades.delivery ? `<button class="btn btn-b" data-act="delivery" ${g.canGoMarket(true) ? '' : 'disabled'}>🚚 ${t('morning.delivery')}</button>` : ''}
        <button class="btn" data-act="skip" ${g.maxPitchersNow() >= 1 || g.D.cupsReady > 0 ? '' : 'disabled'}>🍳 ${t('morning.skip')}</button>
        <button class="btn btn-sm" data-act="rest">😴 ${t('morning.rest')}</button>
      </div>
    </div>`;
  },
  act(g, ui, act, arg) {
    if (act === 'loc') pickPlace(g, ui, arg as LocationId);
    if (act === 'market') g.goMarket();
    if (act === 'delivery') g.goMarket(true);
    if (act === 'skip') g.skipMarket();
    if (act === 'rest') ui.confirm(t('morning.restConfirm'), () => g.restDay());
  },
};
