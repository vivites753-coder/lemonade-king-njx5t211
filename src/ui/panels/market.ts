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
  cookies: 'unit.pack',
  lemon_bulk: 'unit.box',
  water_bulk: 'unit.box',
  sugar_bulk: 'unit.bag',
  cups_bulk: 'unit.box',
};

/** Price of one piece (a lemon, a bottle, a spoon, a cup) when bought in this pack. */
const perPiece = (price: number, pack: number) => (Math.round((price / pack) * 100) / 100).toString();

export const marketPanel: Panel = {
  id: 'market',
  dock: true,
  render(g) {
    const S = g.S;
    const st = S.stock;
    const have: Record<string, number> = { lemons: lemonsTotal(st), water: st.water, sugar: st.sugar, cups: st.cups, cookies: st.cookies ?? 0 };
    // goods for a higher reputation (cookies) appear once they are open; the wholesale packs have their own part
    const row = (id: GoodId) => {
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
          <div class="price">${coin(g.goodPrice(id))}<br><small>${t('market.per', { unit: t(UNIT[id]) })}</small>${
            gd.wholesale ? `<br><small class="pos">${t('market.perPiece', { n: perPiece(g.goodPrice(id), gd.pack) })}</small>` : ''
          }</div>
          <div class="stepper">
            <button class="btn" data-act="dec:${id}" ${!avail || qty === 0 ? 'disabled' : ''} aria-label="−">−</button>
            <b>${qty}</b>
            <button class="btn btn-y" data-act="inc:${id}" ${avail ? '' : 'disabled'} aria-label="+">+</button>
          </div>
        </div>`;
    };
    const rows = GOOD_IDS.filter((id) => !GOODS[id].wholesale && ((!GOODS[id].onlyWhenCupsSoldOut && !GOODS[id].minRep) || g.goodAvailable(id)))
      .map(row)
      .join('');
    const bulk = GOOD_IDS.filter((id) => GOODS[id].wholesale && g.goodAvailable(id));
    const wholesale = bulk.length
      ? `<h3 class="wholesale-h">📦 ${t('market.wholesale')}</h3><div class="note">${t('market.wholesaleNote')}</div>${bulk.map(row).join('')}`
      : '';
    const total = g.cartTotal();
    const tooMuch = total > S.coins;
    const lemonsPer = lemonsConsumed(S.recipe, S.upgrades);
    return `<div class="panel">
      <div class="panel-head"><h2>🛒 ${t('market.title', { time: fmtHour(g.D.hour) })}</h2><span class="chip coins">${coin(S.coins)}</span></div>
      <div class="panel-body">
        ${g.D.delivery ? `<div class="good-box">${t('market.delivery')}</div>` : ''}
        <div class="note">${t('market.need', { l: lemonsPer, s: S.recipe.sugar })}</div>
        <div class="row">
          <button class="btn btn-b grow" data-act="kit">${t('market.kit')}</button>
          <button class="btn" data-act="clear" ${total > 0 ? '' : 'disabled'} title="${t('market.clear')}">🗑️ <span class="lbl-m">${t('market.clear')}</span></button>
        </div>
        ${rows}
        ${wholesale}
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
    if (act === 'clear') g.clearCart();
    if (act === 'pay') g.pay();
    if (act === 'leave') g.leaveMarket();
  },
};
