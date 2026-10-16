import { CONFIG } from '../../core/config';
import type { LocationId } from '../../core/types';
import { UNIT_COST } from '../../data/goods';
import { LOCATIONS } from '../../data/locations';
import { t } from '../../i18n';
import { costPerCup, lemonsConsumed, tasteKey } from '../../sim/economy';
import { coin, fmtDur, fmtHour, ico, round1, toggle } from '../dom';
import { locationCards } from './morning';
import type { Panel } from './types';

/** The place list is opened from the "Change place" button. */
let pickPlace = false;

/** Scrolls the stage window so that the button and the place list under it are in view. */
function showPlaces(): void {
  const btn = document.querySelector<HTMLElement>('#panel [data-act="place"]');
  const body = btn?.closest<HTMLElement>('.panel-body');
  if (!btn || !body) return;
  const top = btn.getBoundingClientRect().top - body.getBoundingClientRect().top - 8;
  body.scrollBy({ top, behavior: 'smooth' });
}

function stepper(act: string, value: string, canDec: boolean, canInc: boolean): string {
  return `<span class="stepper">
    <button class="btn" data-act="${act}:-1" ${canDec ? '' : 'disabled'} aria-label="−">−</button>
    <b>${value}</b>
    <button class="btn btn-y" data-act="${act}:1" ${canInc ? '' : 'disabled'} aria-label="+">+</button>
  </span>`;
}

const MIX_KEY: Record<string, string> = { '1': 'kitchen.mixPerfect', '0.93': 'kitchen.mixOver', '0.85': 'kitchen.mixUnder' };

export const preparePanel: Panel = {
  id: 'prepare',
  dock: true,
  render(g) {
    const S = g.S;
    const D = g.D;
    const r = D.recipeUsed;
    const kid = S.ageMode === 'kid';
    const up = g.active();
    const cost = costPerCup(r, up);
    const profit = S.price - cost;
    const loc = LOCATIONS[S.location];
    const chk = g.canStartSelling();
    const used = lemonsConsumed(r, up);
    const formula = kid
      ? ''
      : `<div class="formula">(${used}🍋×${UNIT_COST.lemons} + ${CONFIG.WATER_PER_PITCHER}💧×${UNIT_COST.water} + ${r.sugar}🍬×${UNIT_COST.sugar} + 10🥤×${UNIT_COST.cups}) ÷ 10 = <b>${round1(cost)}</b></div>`;
    return `<div class="panel">
      <div class="panel-head"><h2>📋 ${t('prep.title')}</h2><span class="chip coins">${coin(S.coins)}</span></div>
      <div class="panel-body">
        <div class="card">
          <div class="kv"><span>${ico('gd_ready', '🥛')} ${t('prep.ready')}</span><b>${t('prep.readyN', { n: D.cupsReady })}</b></div>
          <small class="muted">🍋 ${r.lemons} · 🍬 ${r.sugar} — ${t(tasteKey(r))} · ${t('prep.mix')}: ${t(MIX_KEY[String(D.mixQuality)] ?? 'kitchen.mixPerfect')}${D.coldCups > 0 ? ` · ❄️ ${t('prep.cold', { n: Math.min(D.coldCups, D.cupsReady) })}` : ''}</small>
          <div style="margin-top:6px"><button class="btn btn-sm btn-b" data-act="kitchen">🍳 ${t('prep.kitchen')}</button></div>
          <small class="muted">🕐 ${t('prep.spoils')}</small>
        </div>

        <h3>💰 ${t('prep.price')}</h3>
        <div class="card">
          <div class="kv cost-line"><span>${t('prep.cost')}</span><b>${coin(kid ? '≈' + Math.round(cost) : round1(cost))}</b></div>
          <small class="muted">${t('prep.costHelp')}</small>
          ${formula}
          <div class="kv" style="margin-top:8px"><span>${t('prep.price')}</span>${stepper('price', `<i class="coin"></i>${S.price}`, S.price > CONFIG.PRICE_MIN, S.price < CONFIG.PRICE_MAX)}</div>
          <small class="muted">💡 ${t('prep.fair', { n: loc.fairPrice })}</small>
          <div class="kv"><span>${t('prep.profitCup')}</span><b>${coin((profit >= 0 ? '+' : '') + round1(profit), profit >= 0 ? 'pos' : 'neg')}</b></div>
          ${kid ? '' : `<div class="formula">${S.price} − ${round1(cost)} = <b>${round1(profit)}</b></div>`}
          ${profit < 0 ? `<div class="warn-box">${t('prep.loss')}</div>` : ''}
        </div>

        ${
          (S.stock.cookies ?? 0) > 0
            ? `<h3>🍪 ${t('prep.cookies')}</h3>
        <div class="card">
          <div class="kv"><span>${t('prep.cookiesHave', { n: S.stock.cookies })}</span>${stepper('cprice', `<i class="coin"></i>${S.cookiePrice}`, S.cookiePrice > 1, S.cookiePrice < 20)}</div>
          <small class="muted">${t('prep.cookiesNote', { cost: 2, fair: Math.round(5 * (loc.fairPrice / 10)) })}</small>
        </div>`
            : ''
        }
        ${toggle('flyers', D.flyers, `📄 ${t('prep.flyers', { n: CONFIG.FLYERS_COST })}`, t('prep.flyersDesc'))}
        ${
          g.onlineAdsOpen()
            ? toggle('onlineAds', D.onlineAds, `${ico('btn_onlineads', '📱')} ${t('prep.onlineAds', { n: CONFIG.ONLINE_ADS_COST })}`, t('prep.onlineAdsDesc'))
            : S.bestRep >= CONFIG.ONLINE_ADS_MIN_REP - 1
              ? `<div class="note">🔒 ${ico('btn_onlineads', '📱')} ${t('prep.onlineAdsLocked', { n: CONFIG.ONLINE_ADS_MIN_REP })}</div>`
              : ''
        }
        ${
          g.helperCap() >= 2
            ? `<div class="card"><div class="kv"><span>🍳 ${t('prep.helpers', { n: CONFIG.HELPER_WAGE })}</span>${stepper('helpers', String(D.helpers), D.helpers > 0, D.helpers < 2)}</div>
          <small class="muted">${t('prep.helpersDesc')}</small></div>`
            : g.helperOpen()
              ? toggle('helper', D.helper, `🍳 ${t('prep.helper', { n: CONFIG.HELPER_WAGE })}`, t(g.counters() >= 2 ? 'prep.helperDesc2' : 'prep.helperDesc'))
              : `<div class="note">🔒 🍳 ${t('prep.helperLocked', { n: CONFIG.HELPER_MIN_REP })}</div>`
        }
        ${g.counters() >= 2 && g.helperCap() < 2 && g.helperOpen() ? `<div class="note">🔒 ${t('prep.helper2Locked', { n: CONFIG.HELPER2_MIN_REP })}</div>` : ''}

        <h3>📍 ${t(`loc.${S.location}.name`)}</h3>
        <div class="good-box">🕐 ${t('prep.open', { a: fmtHour(g.openingHour(false)), b: fmtHour(CONFIG.DAY_END) })}${loc.rent ? ` · ${t('prep.rent', { n: coin(loc.rent) })}` : ''}</div>
        <button class="btn btn-sm${chk.reason === 'toast.noRent' ? ' btn-y' : ''}" data-act="place">📍 ${t(pickPlace ? 'prep.placeHide' : 'prep.place')}</button>
        ${pickPlace ? `<div class="locs" style="margin-top:8px">${locationCards(g)}</div>` : ''}
        ${!chk.ok && chk.reason ? `<div class="warn-box">${t(chk.reason, { rent: g.openingCosts() })}</div>` : ''}
      </div>
      <div class="panel-foot">
        <button class="btn btn-g btn-big" data-act="start" ${chk.ok ? '' : 'disabled'}>▶ ${t('prep.start')}</button>
        <button class="btn" data-act="market" ${g.canGoMarket() ? '' : 'disabled'}>${ico('gd_market', '🛒')} ${t('prep.market', { t: fmtDur(g.tripHours()) })}</button>
        ${!chk.ok ? `<button class="btn btn-sm" data-act="rest">😴 ${t('morning.rest')}</button>` : ''}
      </div>
    </div>`;
  },
  act(g, ui, act, arg) {
    const d = Number(arg) || 0;
    if (act === 'price') g.setPrice(g.S.price + d);
    if (act === 'cprice') g.setCookiePrice(g.S.cookiePrice + d);
    if (act === 'flyers') g.setFlyers(!g.D.flyers);
    if (act === 'onlineAds') g.setOnlineAds(!g.D.onlineAds);
    if (act === 'helper') g.setHelper(!g.D.helper);
    if (act === 'helpers') g.setHelpers(g.D.helpers + d);
    if (act === 'kitchen') g.goKitchen();
    if (act === 'place') {
      pickPlace = !pickPlace;
      g.changed();
      // the list opens under the button, on small screens below the edge of the window: scroll it into view
      if (pickPlace) setTimeout(showPlaces, 30);
    }
    if (act === 'loc' && g.chooseLocation(arg as LocationId)) {
      pickPlace = false;
      g.changed();
    }
    if (act === 'start') g.startSelling();
    if (act === 'market') g.goMarket();
    if (act === 'rest') ui.confirm(t('morning.restConfirm'), () => g.restDay());
  },
};
