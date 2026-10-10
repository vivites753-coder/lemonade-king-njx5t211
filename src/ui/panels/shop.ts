import type { UpgradeId } from '../../core/types';
import { UPGRADES, UPGRADE_ORDER } from '../../data/upgrades';
import { t } from '../../i18n';
import { coin } from '../dom';
import { goalHtml } from './report';
import type { Panel } from './types';

export const shopPanel: Panel = {
  id: 'shop',
  dock: true,
  render(g) {
    const S = g.S;
    const cards = UPGRADE_ORDER.map((id) => {
      const u = UPGRADES[id];
      const can = g.canBuy(id);
      const owned = !!S.upgrades[id];
      let btn: string;
      if (owned) btn = `<b class="pos">${t('shop.owned')}</b>`;
      else if (can.reason === 'requires') btn = `<small>${t('shop.needs', { x: t(`up.${u.requires}.name`) })}</small>`;
      else btn = `<button class="btn ${can.ok ? 'btn-g' : ''} btn-sm" data-act="buy:${id}" ${can.ok ? '' : 'disabled'}>${coin(u.price)}</button>`;
      return `<div class="up${owned ? ' owned' : ''}">
        <div class="ico">${u.icon}</div>
        <div><b>${t(`up.${id}.name`)}</b><small>${t(`up.${id}.desc`)}</small><span class="idea">💡 ${t(`up.${id}.idea`)}</span></div>
        <div>${btn}</div>
      </div>`;
    }).join('');
    const hist = S.history.slice(-7);
    const maxAbs = Math.max(1, ...hist.map((h) => Math.abs(h.profit)));
    const chart = hist.length
      ? `<h3>📈 ${t('shop.week')}</h3>
        <div class="card"><div class="chart">${hist
          .map((h) => `<div class="col${h.profit < 0 ? ' neg' : ''}"><span>${h.profit}</span><i style="height:${Math.round((Math.abs(h.profit) / maxAbs) * 70)}%"></i></div>`)
          .join('')}</div>
        <div class="chart-days">${hist.map((h) => `<span>${h.day}</span>`).join('')}</div></div>`
      : '';
    return `<div class="panel">
      <div class="panel-head"><h2>🏪 ${t('shop.title')}</h2><span class="chip coins">${coin(S.coins)}</span></div>
      <div class="panel-body">
        <div class="note">💡 ${t('shop.invest')}</div>
        <div class="ups">${cards}</div>
        ${chart}
        ${goalHtml(S.coins, S.rep)}
      </div>
      <div class="panel-foot">
        <button class="btn btn-b btn-big" data-act="sleep">🌙 ${t('shop.sleep')}</button>
      </div>
    </div>`;
  },
  act(g, _ui, act, arg) {
    if (act === 'buy') g.buyUpgrade(arg as UpgradeId);
    if (act === 'sleep') g.sleep();
  },
};
