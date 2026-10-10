import { CONFIG } from '../../core/config';
import { UNIT_COST } from '../../data/goods';
import { LOCATIONS } from '../../data/locations';
import { t } from '../../i18n';
import { costPerCup, lemonReduction, lemonsConsumed, tasteBalance, tasteKey } from '../../sim/economy';
import { lemonsTotal } from '../../sim/state';
import { coin, fmtHour, round1, toggle } from '../dom';
import type { Panel } from './types';

function stepper(act: string, value: string, canDec: boolean, canInc: boolean): string {
  return `<span class="stepper">
    <button class="btn" data-act="${act}:-1" ${canDec ? '' : 'disabled'} aria-label="−">−</button>
    <b>${value}</b>
    <button class="btn btn-y" data-act="${act}:1" ${canInc ? '' : 'disabled'} aria-label="+">+</button>
  </span>`;
}

export const preparePanel: Panel = {
  id: 'prepare',
  dock: true,
  render(g) {
    const S = g.S;
    const D = g.D;
    const r = S.recipe;
    const kid = S.ageMode === 'kid';
    const st = S.stock;
    const old = st.lemons.filter((b) => b.age + 1 >= CONFIG.LEMON_SPOIL_AGE).reduce((n, b) => n + b.n, 0);
    const cost = costPerCup(r, S.upgrades);
    const profit = S.price - cost;
    const max = g.maxPitchersNow();
    const loc = LOCATIONS[S.location];
    const bal = tasteBalance(r);
    const pos = Math.max(5, Math.min(95, 50 - bal * 12));
    const chk = g.canStartSelling();
    const reduce = lemonReduction(S.upgrades);
    const used = lemonsConsumed(r, S.upgrades);
    const formula = kid
      ? ''
      : `<div class="formula">(${used}🍋×${UNIT_COST.lemons} + ${CONFIG.WATER_PER_PITCHER}💧×${UNIT_COST.water} + ${r.sugar}🍬×${UNIT_COST.sugar} + 10🥤×${UNIT_COST.cups}) ÷ 10 = <b>${round1(cost)}</b></div>`;
    return `<div class="panel">
      <div class="panel-head"><h2>📋 ${t('prep.title')}</h2><span class="chip coins">${coin(S.coins)}</span></div>
      <div class="panel-body">
        <div class="note"><b>${t('prep.stock')}:</b> 🍋 ${lemonsTotal(st)}${old ? ` <span class="neg">(${t('prep.old', { n: old })})</span>` : ''} · 💧 ${st.water} · 🍬 ${st.sugar} · 🥤 ${st.cups}</div>
        ${max < 1 ? `<div class="warn-box">${t('prep.noStock')}</div>` : ''}

        <h3>🍋 ${t('prep.recipe')}</h3>
        <div class="card">
          <div class="kv"><span>${t('prep.lemons')}</span>${stepper('lemons', String(r.lemons), r.lemons > CONFIG.RECIPE_LEMONS_MIN, r.lemons < CONFIG.RECIPE_LEMONS_MAX)}</div>
          <div class="kv"><span>${t('prep.sugar')}</span>${stepper('sugar', String(r.sugar), r.sugar > CONFIG.RECIPE_SUGAR_MIN, r.sugar < CONFIG.RECIPE_SUGAR_MAX)}</div>
          <small class="muted">${t('prep.water')}</small>
          ${reduce ? `<div class="good-box">⚙️ ${t('prep.juicer', { n: reduce })}</div>` : ''}
          <div class="taste"><i style="left:${pos}%"></i></div>
          <div class="taste-labels"><span>🍋 ${t('prep.sour')}</span><b>${t(tasteKey(r))}</b><span>${t('prep.sweet')} 🍬</span></div>
        </div>

        <h3>💰 ${t('prep.price')}</h3>
        <div class="card">
          <div class="kv"><span>${t('prep.cost')}</span><b>${coin(kid ? '≈' + Math.round(cost) : round1(cost))}</b></div>
          <small class="muted">${t('prep.costHelp')}</small>
          ${formula}
          <div class="kv" style="margin-top:8px"><span>${t('prep.price')}</span>${stepper('price', `<i class="coin"></i>${S.price}`, S.price > CONFIG.PRICE_MIN, S.price < CONFIG.PRICE_MAX)}</div>
          <small class="muted">💡 ${t('prep.fair', { n: loc.fairPrice })}</small>
          <div class="kv"><span>${t('prep.profitCup')}</span><b class="${profit >= 0 ? 'pos' : 'neg'}">${coin((profit >= 0 ? '+' : '') + round1(profit), profit >= 0 ? 'pos' : 'neg')}</b></div>
          ${kid ? '' : `<div class="formula">${S.price} − ${round1(cost)} = <b>${round1(profit)}</b></div>`}
          ${profit < 0 ? `<div class="warn-box">${t('prep.loss')}</div>` : ''}
        </div>

        <h3>🥤 ${t('prep.pitchers')}</h3>
        <div class="card">
          <div class="kv"><span>${t('prep.cups', { n: D.pitchersPlanned * CONFIG.CUPS_PER_PITCHER })} <small class="muted">(${t('prep.max', { n: max })})</small></span>${stepper('pitchers', String(D.pitchersPlanned), D.pitchersPlanned > 0, D.pitchersPlanned < max)}</div>
          <small class="muted">🕐 ${t('prep.spoils')}</small>
        </div>

        ${toggle('flyers', D.flyers, `📄 ${t('prep.flyers', { n: CONFIG.FLYERS_COST })}`, t('prep.flyersDesc'))}

        <div class="good-box">🕐 ${t('prep.open', { a: fmtHour(g.openingHour(false)), b: fmtHour(CONFIG.DAY_END) })}${loc.rent ? ` · ${t('prep.rent', { n: coin(loc.rent) })}` : ''}</div>
        ${!chk.ok && chk.reason ? `<div class="warn-box">${t(chk.reason, { rent: loc.rent })}</div>` : ''}
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
    const r = g.S.recipe;
    if (act === 'lemons') g.setRecipe(r.lemons + d, r.sugar);
    if (act === 'sugar') g.setRecipe(r.lemons, r.sugar + d);
    if (act === 'price') g.setPrice(g.S.price + d);
    if (act === 'pitchers') g.setPitchers(g.D.pitchersPlanned + d);
    if (act === 'flyers') g.setFlyers(!g.D.flyers);
    if (act === 'start') g.startSelling();
    if (act === 'market') g.goMarket();
    if (act === 'rest') ui.confirm(t('morning.restConfirm'), () => g.restDay());
  },
};
