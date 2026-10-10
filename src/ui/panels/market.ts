import type { GoodId } from '../../core/types';
import { GOODS, GOOD_IDS } from '../../data/goods';
import { t } from '../../i18n';
import { lemonsConsumed } from '../../sim/economy';
import { lemonsTotal } from '../../sim/state';
import { coin, fmtHour } from '../dom';
import type { Panel } from './types';

const UNIT: Record<GoodId, string> = {
  lemon: 'unit.pc',
  lemon_cheap: 'unit.pc',
  water: 'unit.bottle',
  sugar: 'unit.pack',
  cups: 'unit.pack',
  cups_super: 'unit.pack',
};

export const marketPanel: Panel = {
  id: 'market',
  dock: true,
  render(g) {
    const S = g.S;
    const st = S.stock;
    const have: Record<string, number> = { lemons: lemonsTotal(st), water: st.water, sugar: st.sugar, cups: st.cups };
    const rows = GOOD_IDS.filter((id) => !GOODS[id].onlyWhenCupsSoldOut || g.goodAvailable(id))
      .map((id) => {
        const gd = GOODS[id];
        const avail = g.goodAvailable(id);
        const qty = g.cart[id];
        const haveKey = id === 'lemon_cheap' ? null : gd.stock;
        return `<div class="good${avail ? '' : ' off'}">
          <div class="ico">${gd.icon}</div>
          <div class="info"><b>${t(`good.${id}`)}</b>
            <small>${t(`vendor.${gd.vendor}`)} · ${avail ? t(`good.${id}.note`) : t('market.soldOut')}</small>
            ${haveKey ? `<small>${t('market.have', { n: have[haveKey] })}</small>` : ''}
          </div>
          <div class="price">${coin(g.goodPrice(id))}<br><small>${t('market.per', { unit: t(UNIT[id]) })}</small></div>
          <div class="stepper">
            <button class="btn" data-act="dec:${id}" ${!avail || qty === 0 ? 'disabled' : ''} aria-label="−">−</button>
            <b>${qty}</b>
            <button class="btn btn-y" data-act="inc:${id}" ${avail ? '' : 'disabled'} aria-label="+">+</button>
          </div>
        </div>`;
      })
      .join('');
    const total = g.cartTotal();
    const tooMuch = total > S.coins;
    const lemonsPer = lemonsConsumed(S.recipe, S.upgrades);
    return `<div class="panel">
      <div class="panel-head"><h2>🛒 ${t('market.title', { time: fmtHour(g.D.hour) })}</h2><span class="chip coins">${coin(S.coins)}</span></div>
      <div class="panel-body">
        <div class="note">${t('market.need', { l: lemonsPer, s: S.recipe.sugar })}</div>
        <button class="btn btn-b" data-act="kit" style="width:100%">${t('market.kit')}</button>
        ${rows}
        <div class="good-box">🍋 ${t('market.enough', { n: g.pitchersWithCart() })}</div>
      </div>
      <div class="panel-foot">
        <div class="total-line">${t('market.total')}: ${coin(total, tooMuch ? 'neg' : '')} ${tooMuch ? `<small class="neg">${t('market.tooMuch')}</small>` : ''}</div>
        <button class="btn btn-g btn-big" data-act="pay" ${tooMuch ? 'disabled' : ''}>💳 ${t('market.pay')}</button>
        <button class="btn" data-act="leave">${t('market.leave')}</button>
      </div>
    </div>`;
  },
  act(g, _ui, act, arg) {
    const id = arg as GoodId;
    if (act === 'inc') g.setCart(id, g.cart[id] + 1);
    if (act === 'dec') g.setCart(id, g.cart[id] - 1);
    if (act === 'kit') g.addPitcherKit();
    if (act === 'pay') g.pay();
    if (act === 'leave') g.leaveMarket();
  },
};
