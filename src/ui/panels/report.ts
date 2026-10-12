import { CONFIG } from '../../core/config';
import { LOCATIONS } from '../../data/locations';
import { t } from '../../i18n';
import { coin, lemiFace, signedCoin, stars } from '../dom';
import type { Panel } from './types';

function fbar(label: string, n: number, max: number): string {
  const w = max > 0 ? Math.max(2, Math.round((n / max) * 100)) : 0;
  return `<div class="fbar"><span>${label}</span><b>${n}</b><div class="bar"><i style="width:${w}%"></i></div></div>`;
}

export function goalHtml(coins: number, rep: number): string {
  const k = Math.min(1, coins / CONFIG.GOAL_COINS);
  return `<div class="card"><b>🏁 ${t('report.goal')}</b>: ${coin(coins)} / ${coin(CONFIG.GOAL_COINS)} ${t('hud.goalStars', { stars: CONFIG.GOAL_REP })}
    <div class="goal-bar" style="height:12px;margin-top:6px"><i style="width:${Math.round(k * 100)}%;display:block;height:100%;background:linear-gradient(90deg,#ffd43b,#51cf66);border-radius:99px"></i></div>
    <small class="muted">${stars(rep)} ${rep.toFixed(1)}</small></div>`;
}

export const reportPanel: Panel = {
  id: 'report',
  dock: true,
  render(g, ui) {
    const r = g.D.report;
    if (!r) return '';
    const f = r.funnel;
    const pts = r.points ?? [];
    const kid = g.S.ageMode === 'kid';
    const notServed = Math.max(0, f.joined - f.sold - f.impatient);
    const lessonText = t(r.lesson.key, r.lesson.params);
    const reasons: [string, number][] = [
      [`💸 ${t('reason.expensive')}`, f.tooExpensive],
      [`⏳ ${t('reason.queue')}`, f.queueFull],
      [`😠 ${t('reason.impatient')}`, f.impatient],
      [`😢 ${t('reason.soldout')}`, f.soldOut + notServed],
      [`🙈 ${t('reason.far')}`, r.outOfRange],
    ];
    const expenseRows: [string, number][] = [
      [`🍋 ${t('report.ingredients')}`, r.ingredients],
      [`🏠 ${t('report.rent')}`, r.rent],
      [`📄 ${t('report.flyers')}`, r.flyers],
      [`🦊 ${t('report.stolen')}`, r.stolen],
      [`🍳 ${t('report.wages')}`, r.wages ?? 0],
      [`🔧 ${t('report.repairs')}`, r.repairs ?? 0],
      [`🎓 ${t('report.training')}`, r.training ?? 0],
      [`🏪 ${t('report.pointsCosts')}`, pts.reduce((n, p) => n + p.ingredients + p.rent + p.wage + p.stolen, 0)],
    ];
    const pointsIncome = pts.reduce((n, p) => n + p.revenue, 0);
    void ui;
    return `<div class="panel">
      <div class="panel-head"><h2>🌙 ${t('report.title', { n: g.S.day })}</h2><span class="chip coins">${coin(g.S.coins)}</span></div>
      <div class="panel-body">
        <div class="big3">
          <div><small>${t('report.income')}</small><b>${coin(r.income, 'pos')}</b></div>
          <div><small>${t('report.expenses')}</small><b>${coin(r.expenses, 'neg')}</b></div>
          <div class="profit ${r.profit < 0 ? 'neg' : ''}"><small>${t('report.profit')}</small><b>${signedCoin(r.profit)}</b></div>
        </div>
        ${kid ? '' : `<div class="card">
          <div class="kv"><span>🥤 ${t('report.sales')}</span><span>${coin(r.sales)}</span></div>
          ${r.bonus ? `<div class="kv"><span>🎁 ${t('report.bonus')}</span><span>${coin(r.bonus)}</span></div>` : ''}
          ${pointsIncome ? `<div class="kv"><span>🏪 ${t('report.pointsIncome')}</span><span>${coin(pointsIncome)}</span></div>` : ''}
          ${expenseRows.filter(([, v]) => v > 0).map(([k, v]) => `<div class="kv"><span>${k}</span><span class="neg">${coin('−' + v, 'neg')}</span></div>`).join('')}
        </div>`}
        <div class="lesson">${lemiFace(true)}<div><b>💡 ${t('report.lesson')}</b>${lessonText}</div></div>
        ${pts.length
          ? `<h3>🏪 ${t('points.title')} · ${signedCoin(r.pointsProfit)}</h3>
        <div class="card">${pts
          .map(
            (p) => `<div class="kv"><span>${LOCATIONS[p.loc].icon} ${t(`loc.${p.loc}.name`)} <small class="muted">${t(`points.status.${p.status}`)}${p.stolen ? ` · 💸 −${p.stolen}` : ''}</small></span><b>${signedCoin(p.profit)}</b></div>`,
          )
          .join('')}</div>`
          : ''}
        ${r.pointsUnlocked ? `<div class="good-box">🏪 ${t('report.pointsUnlocked')}</div>` : ''}
        ${f.passed > 0 ? `<h3>🚶 ${t('report.funnel')} · ${t('report.sold', { n: r.sold })}</h3>
        <div class="card">
          ${fbar(`🚶 ${t('hud.passed')}`, f.passed, f.passed)}
          ${fbar(`👀 ${t('hud.inRange')}`, f.inRange, f.passed)}
          ${fbar(`✋ ${t('hud.stopped')}`, f.stopped, f.passed)}
          ${fbar(`👍 ${t('hud.joined')}`, f.joined, f.passed)}
          ${fbar(`🥤 ${t('hud.sold')}`, f.sold, f.passed)}
        </div>
        <div class="reasons">${reasons.filter(([, n]) => n > 0).map(([k, n]) => `<span>${k}: ${n}</span>`).join('')}</div>` : ''}
        ${r.wastedCups ? `<div class="warn-box">🚰 ${t('report.waste', { n: r.wastedCups, c: r.wasteCost })}</div>` : ''}
        ${r.carriedCups ? `<div class="good-box">🧊 ${t('report.carried', { n: r.carriedCups })}</div>` : ''}
        ${r.freeCups ? `<div class="note">🎁 ${t('report.freeCups', { n: r.freeCups })}</div>` : ''}
        ${r.unlocked?.length ? `<div class="good-box">🔓 ${t('report.unlocked', { list: r.unlocked.map((id) => t(`loc.${id}.name`)).join(', ') })}</div>` : ''}
        ${r.broke?.length ? `<div class="warn-box">🔧 ${t('report.broke', { list: r.broke.map((id) => t(`equip.${id}`)).join(', ') })}</div>` : ''}
        ${r.spoilTomorrow ? `<div class="warn-box">⚠️ ${t('report.spoilTomorrow', { n: r.spoilTomorrow })}</div>` : ''}
        <div class="card row"><span class="grow"><b>⭐ ${t('report.rep')}</b><br>${stars(r.repEnd)} ${r.repEnd.toFixed(1)}</span>
          <b class="${r.repEnd >= r.repStart ? 'pos' : 'neg'}">${r.repEnd >= r.repStart ? '▲' : '▼'} ${Math.abs(r.repEnd - r.repStart).toFixed(2)}</b></div>
        ${r.stockValue ? `<div class="note">📦 ${t('report.stock', { n: r.stockValue })}</div>` : ''}
        ${goalHtml(g.S.coins, g.S.rep)}
      </div>
      <div class="panel-foot">
        <button class="btn btn-y btn-big" data-act="shop">🏪 ${t('report.toShop')}</button>
      </div>
    </div>`;
  },
  act(g, _ui, act) {
    if (act === 'shop') g.openShop();
  },
};
