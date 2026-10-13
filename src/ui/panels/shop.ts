import type { EquipId, UpgradeId } from '../../core/types';
import { UPGRADES, UPGRADE_CATS, UPGRADE_ORDER } from '../../data/upgrades';
import { t } from '../../i18n';
import { coin, ico } from '../dom';
import { equipmentRows } from '../resources';
import type { Panel } from './types';

export const shopPanel: Panel = {
  id: 'shop',
  dock: true,
  render(g) {
    const S = g.S;
    const card = (id: UpgradeId) => {
      const u = UPGRADES[id];
      const can = g.canBuy(id);
      const owned = !!S.upgrades[id];
      let btn: string;
      if (owned) btn = `<b class="pos">${t('shop.owned')}</b>`;
      else if (can.reason === 'rep') btn = `<small class="neg">🔒 ⭐ ${u.minRep}</small>`;
      else if (can.reason === 'requires') btn = `<small>${t('shop.needs', { x: t(`up.${u.requires}.name`) })}</small>`;
      else btn = `<button class="btn ${can.ok ? 'btn-g' : ''} btn-sm" data-act="buy:${id}" ${can.ok ? '' : 'disabled'}>${coin(u.price)}</button>`;
      return `<div class="up${owned ? ' owned' : ''}${can.reason === 'rep' ? ' locked' : ''}">
        <div class="ico">${ico(`up_${id}`, u.icon)}</div>
        <div><b>${t(`up.${id}.name`)}</b><small>${t(`up.${id}.desc`)}</small>${u.outdoorOnly ? `<small class="pill-out">☀️ ${t('shop.outdoorOnly')}</small>` : ''}<span class="idea">💡 ${t(`up.${id}.idea`)}</span></div>
        <div>${btn}</div>
      </div>`;
    };
    const groups = UPGRADE_CATS.map((cat) => {
      const ids = UPGRADE_ORDER.filter((id) => UPGRADES[id].cat === cat);
      return `<h3>${t(`shop.cat.${cat}`)}</h3><div class="ups">${ids.map(card).join('')}</div>`;
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
        ${S.upgrades.truck ? `<button class="btn btn-b" data-act="truck" style="width:100%">🎨 ${t('truck.customize')}</button>` : ''}
        <h3>🔧 ${t('shop.equipment')}</h3>
        <div class="card">${equipmentRows(g, 'shop')}</div>
        <div class="note">💡 ${t('shop.invest')}</div>
        ${groups}
        ${chart}
      </div>
      <div class="panel-foot">
        <button class="btn btn-b btn-big" data-act="sleep">🌙 ${t('shop.sleep')}</button>
      </div>
    </div>`;
  },
  act(g, ui, act, arg) {
    if (act === 'buy') {
      g.buyUpgrade(arg as UpgradeId);
      if (arg === 'truck' && g.S.upgrades.truck) ui.openTruck();
    }
    if (act === 'truck') ui.openTruck();
    if (act === 'maintain') g.maintain(arg as EquipId);
    if (act === 'repair') g.repair(arg as EquipId);
    if (act === 'sleep') g.sleep();
  },
};
