import { CONFIG } from '../../core/config';
import { UNIT_COST } from '../../data/goods';
import { LOCATIONS } from '../../data/locations';
import { t } from '../../i18n';
import { costPerCup, lemonsConsumed, tasteKey } from '../../sim/economy';
import { coin, fmtHour, round1, toggle } from '../dom';
import type { Panel } from './types';

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
          <div class="kv"><span>🥛 ${t('prep.ready')}</span><b>${t('prep.readyN', { n: D.cupsReady })}</b></div>
          <small class="muted">🍋 ${r.lemons} · 🍬 ${r.sugar} — ${t(tasteKey(r))} · ${t('prep.mix')}: ${t(MIX_KEY[String(D.mixQuality)] ?? 'kitchen.mixPerfect')}</small>
          <div style="margin-top:6px"><button class="btn btn-sm btn-b" data-act="kitchen">🍳 ${t('prep.kitchen')}</button></div>
          <small class="muted">🕐 ${t('prep.spoils')}</small>
        </div>

        <h3>💰 ${t('prep.price')}</h3>
        <div class="card">
          <div class="kv"><span>${t('prep.cost')}</span><b>${coin(kid ? '≈' + Math.round(cost) : round1(cost))}</b></div>
          <small class="muted">${t('prep.costHelp')}</small>
          ${formula}
          <div class="kv" style="margin-top:8px"><span>${t('prep.price')}</span>${stepper('price', `<i class="coin"></i>${S.price}`, S.price > CONFIG.PRICE_MIN, S.price < CONFIG.PRICE_MAX)}</div>
          <small class="muted">💡 ${t('prep.fair', { n: loc.fairPrice })}</small>
          <div class="kv"><span>${t('prep.profitCup')}</span><b>${coin((profit >= 0 ? '+' : '') + round1(profit), profit >= 0 ? 'pos' : 'neg')}</b></div>
          ${kid ? '' : `<div class="formula">${S.price} − ${round1(cost)} = <b>${round1(profit)}</b></div>`}
          ${profit < 0 ? `<div class="warn-box">${t('prep.loss')}</div>` : ''}
        </div>

        ${toggle('flyers', D.flyers, `📄 ${t('prep.flyers', { n: CONFIG.FLYERS_COST })}`, t('prep.flyersDesc'))}
        ${S.day >= 2 ? toggle('helper', D.helper, `🍳 ${t('prep.helper', { n: CONFIG.HELPER_WAGE })}`, t('prep.helperDesc')) : ''}

        <div class="good-box">🕐 ${t('prep.open', { a: fmtHour(g.openingHour(false)), b: fmtHour(CONFIG.DAY_END) })}${loc.rent ? ` · ${t('prep.rent', { n: coin(loc.rent) })}` : ''}</div>
        ${!chk.ok && chk.reason ? `<div class="warn-box">${t(chk.reason, { rent: g.openingCosts() })}</div>` : ''}
      </div>
      <div class="panel-foot">
        <button class="btn btn-g btn-big" data-act="start" ${chk.ok ? '' : 'disabled'}>▶ ${t('prep.start')}</button>
        <button class="btn" data-act="market" ${g.canGoMarket() ? '' : 'disabled'}>🛒 ${t('prep.market', { h: g.tripHours() })}</button>
        ${!chk.ok ? `<button class="btn btn-sm" data-act="rest">😴 ${t('morning.rest')}</button>` : ''}
      </div>
    </div>`;
  },
  act(g, ui, act, arg) {
    const d = Number(arg) || 0;
    if (act === 'price') g.setPrice(g.S.price + d);
    if (act === 'flyers') g.setFlyers(!g.D.flyers);
    if (act === 'helper') g.setHelper(!g.D.helper);
    if (act === 'kitchen') g.goKitchen();
    if (act === 'start') g.startSelling();
    if (act === 'market') g.goMarket();
    if (act === 'rest') ui.confirm(t('morning.restConfirm'), () => g.restDay());
  },
};
