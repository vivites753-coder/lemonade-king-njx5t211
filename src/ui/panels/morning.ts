import { CONFIG } from '../../core/config';
import type { EquipId, LocationId } from '../../core/types';
import { LOC_EVENTS } from '../../data/events';
import { LOCATIONS, LOCATION_IDS } from '../../data/locations';
import { WEATHER } from '../../data/weather';
import { t } from '../../i18n';
import { lemonsTotal } from '../../sim/state';
import type { Game } from '../../sim/game';
import { coin, dots, fmtDur, fmtHour } from '../dom';
import type { Panel } from './types';

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
      const busy = repLock ? 1 : (D.events.busy?.[id] ?? 1);
      return `<button class="loc${S.location === id ? ' sel' : ''}${repLock ? ' rep-lock' : ''}" data-act="loc:${id}" ${locked ? 'disabled' : ''}>
        <span class="loc-ico">${repLock ? '🔒' : l.icon}</span>
        <span class="grow">
          <b>${t(`loc.${id}.name`)}</b>${l.indoor ? ` <span class="tag">🏠 ${t('loc.indoor')}</span>` : ''}
          ${repLock ? `<span class="loc-lock">⭐ ${t('loc.locked', { n: l.minRep ?? 0 })}</span>` : ''}
          ${ev ? `<span class="loc-ev">${t(`loc.ev.${ev.id}`)}</span>` : ''}
          ${busy >= CONFIG.CROWD_HIGH ? `<span class="loc-ev">👥 ${t('loc.busy.high')}</span>` : busy <= CONFIG.CROWD_LOW ? `<span class="loc-ev">🍃 ${t('loc.busy.low')}</span>` : ''}
          ${own ? `<span class="loc-own">🏪 ${t('loc.ownPoint')}</span>` : ''}
          <small>${t(`loc.${id}.desc`)}</small>
          <span class="loc-meta">
            <span>👥 ${dots(l.trafficStars)}</span>
            <span>${l.rent ? t('loc.rent', { n: coin(l.rent) }) : '✅ ' + t('loc.free')}</span>
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
    const w = WEATHER[D.forecast];
    const st = S.stock;
    const hasStock = lemonsTotal(st) + st.water + st.sugar + st.cups > 0;
    const locCards = locationCards(g);

    return `<div class="panel">
      <div class="panel-head"><h2>☀️ ${t('morning.title', { n: S.day })}</h2></div>
      <div class="panel-body">
        <div class="card row">
          <span class="big-ico">${w.icon}</span>
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
        <button class="btn btn-y btn-big" data-act="market" ${g.canGoMarket() ? '' : 'disabled'}>🛒 ${t('morning.toMarket', { t: fmtDur(g.tripHours()) })}</button>
        ${g.S.upgrades.delivery ? `<button class="btn btn-b" data-act="delivery" ${g.canGoMarket(true) ? '' : 'disabled'}>🚚 ${t('morning.delivery')}</button>` : ''}
        <button class="btn" data-act="skip" ${g.maxPitchersNow() >= 1 || g.D.cupsReady > 0 ? '' : 'disabled'}>🍳 ${t('morning.skip')}</button>
        <button class="btn btn-sm" data-act="rest">😴 ${t('morning.rest')}</button>
      </div>
    </div>`;
  },
  act(g, ui, act, arg) {
    if (act === 'loc') g.chooseLocation(arg as LocationId);
    if (act === 'market') g.goMarket();
    if (act === 'delivery') g.goMarket(true);
    if (act === 'skip') g.skipMarket();
    if (act === 'rest') ui.confirm(t('morning.restConfirm'), () => g.restDay());
  },
};
