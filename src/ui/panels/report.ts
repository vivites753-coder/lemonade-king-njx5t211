import { LOCATIONS } from '../../data/locations';
import { payback } from '../../sim/points';
import { t } from '../../i18n';
import { coin, ico, lemiFace, signedCoin, stars, type LemiMood } from '../dom';

/** How Lemi looks telling the lesson of the day (thinking when not listed). */
const LESSON_MOOD: Record<string, LemiMood> = {
  'lesson.thief': 'sad',
  'lesson.loss': 'sad',
  'lesson.breakdown': 'sad',
  'lesson.spoiled': 'sad',
  'lesson.waste': 'sad',
  'lesson.soldout': 'surprised',
  'lesson.rest': 'neutral',
};
import type { Panel } from './types';

function fbar(label: string, n: number, max: number): string {
  const w = max > 0 ? Math.max(2, Math.round((n / max) * 100)) : 0;
  return `<div class="fbar"><span>${label}</span><b>${n}</b><div class="bar"><i style="width:${w}%"></i></div></div>`;
}

/** Payback of every stand: how much of what it cost has come back. */
function paybackRows(g: Parameters<Panel['render']>[0]): string {
  if (!g.S.points.length) return '';
  return `<div class="pt-payback-list"><b>${ico('pt_payback', '💹')} ${t('points.payback')}</b>${g.S.points
    .map((p) => {
      const pb = payback(p);
      const pct = Math.max(0, Math.min(100, Math.round(pb.share * 100)));
      return `<div class="kv"><span>${LOCATIONS[p.loc].icon} ${t(`loc.${p.loc}.name`)}</span><span>${pct}%${
        pb.days === 0 ? ' ✅' : pb.days ? ` · ${t('points.paybackDays', { n: pb.days })}` : ''
      }</span></div><div class="bar pb-bar"><i style="width:${pct}%"></i></div>`;
    })
    .join('')}</div>`;
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
      [`${ico('btn_onlineads', '📱')} ${t('report.onlineAds')}`, r.onlineAds ?? 0],
      [`🦊 ${t('report.stolen')}`, r.stolen],
      [`🍳 ${t('report.wages')}`, r.wages ?? 0],
      [`🔧 ${t('report.repairs')}`, r.repairs ?? 0],
      [`🎓 ${t('report.training')}`, r.training ?? 0],
      [`${ico('pt_stand', '🏪')} ${t('report.pointsCosts')}`, pts.reduce((n, p) => n + p.ingredients + p.rent + p.wage + p.stolen, 0)],
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
          <div class="kv"><span>🥤 ${t('report.sales')}</span><span>${coin(r.sales - (r.cookieSales ?? 0))}</span></div>
          ${r.cookieSales ? `<div class="kv"><span>🍪 ${t('report.cookies', { n: r.cookiesSold })}</span><span>${coin(r.cookieSales)}</span></div>` : ''}
          ${r.bonus ? `<div class="kv"><span>🎁 ${t('report.bonus')}</span><span>${coin(r.bonus)}</span></div>` : ''}
          ${pointsIncome ? `<div class="kv"><span>${ico('pt_stand', '🏪')} ${t('report.pointsIncome')}</span><span>${coin(pointsIncome)}</span></div>` : ''}
          ${expenseRows.filter(([, v]) => v > 0).map(([k, v]) => `<div class="kv"><span>${k}</span><span class="neg">${coin('−' + v, 'neg')}</span></div>`).join('')}
        </div>`}
        <div class="lesson">${lemiFace(true, r.lesson.key === 'lesson.profit' ? (r.profit >= 0 ? 'happy' : 'sad') : (LESSON_MOOD[r.lesson.key] ?? 'think'))}<div><b>💡 ${t('report.lesson')}</b>${lessonText}</div></div>
        ${pts.length
          ? `<h3>${ico('pt_stand', '🏪')} ${t('points.title')} · ${signedCoin(r.pointsProfit)}</h3>
        <div class="card">${pts
          .map(
            (p) => `<div class="kv"><span>${LOCATIONS[p.loc].icon} ${t(`loc.${p.loc}.name`)} <small class="muted">${t(`points.status.${p.status}`)}${p.stolen ? ` · 💸 −${p.stolen}` : ''}</small></span><b>${signedCoin(p.profit)}</b></div>`,
          )
          .join('')}${paybackRows(g)}</div>`
          : ''}
        ${r.pointsUnlocked ? `<div class="good-box">${ico('pt_stand', '🏪')} ${t('report.pointsUnlocked')}</div>` : ''}
        ${f.passed > 0 ? `<h3>🚶 ${t('report.funnel')} · ${t('report.sold', { n: r.sold })}</h3>
        <div class="card">
          ${fbar(`🚶 ${t('hud.passed')}`, f.passed, f.passed)}
          ${fbar(`👀 ${t('hud.inRange')}`, f.inRange, f.passed)}
          ${fbar(`✋ ${t('hud.stopped')}`, f.stopped, f.passed)}
          ${fbar(`👍 ${t('hud.joined')}`, f.joined, f.passed)}
          ${fbar(`🥤 ${t('hud.sold')}`, f.sold, f.passed)}
        </div>
        <div class="reasons">${reasons.filter(([, n]) => n > 0).map(([k, n]) => `<span>${k}: ${n}</span>`).join('')}</div>` : ''}
        ${r.spilled ? `<div class="warn-box">💦 ${t('report.spilled', { n: r.spilled })}</div>` : ''}
        ${r.wastedCups ? `<div class="warn-box">🚰 ${t('report.waste', { n: r.wastedCups, c: r.wasteCost })}</div>` : ''}
        ${r.carriedCups ? `<div class="good-box">🧊 ${t('report.carried', { n: r.carriedCups })}</div>` : ''}
        ${r.freeCups ? `<div class="note">🎁 ${t('report.freeCups', { n: r.freeCups })}</div>` : ''}
        ${r.unlocked?.length ? `<div class="good-box">🔓 ${t('report.unlocked', { list: r.unlocked.map((id) => t(`loc.${id}.name`)).join(', ') })}</div>` : ''}
        ${r.broke?.length ? `<div class="warn-box">🔧 ${t('report.broke', { list: r.broke.map((id) => t(`equip.${id}`)).join(', ') })}</div>` : ''}
        ${r.spoilTomorrow ? `<div class="warn-box">⚠️ ${t('report.spoilTomorrow', { n: r.spoilTomorrow })}</div>` : ''}
        <div class="card row"><span class="grow"><b>⭐ ${t('report.rep')}</b><br>${stars(r.repEnd)} ${r.repEnd.toFixed(1)}
          <button class="link-btn" data-act="roadmap">🗺️ ${t('roadmap.title')}</button></span>
          <b class="${r.repEnd >= r.repStart ? 'pos' : 'neg'}">${r.repEnd >= r.repStart ? ico('profit_up', '▲') : ico('profit_down', '▼')} ${Math.abs(r.repEnd - r.repStart).toFixed(2)}</b></div>
        ${r.stockValue ? `<div class="note">📦 ${t('report.stock', { n: r.stockValue })}</div>` : ''}
      </div>
      <div class="panel-foot">
        <button class="btn btn-y btn-big" data-act="shop">🏪 ${t('report.toShop')}</button>
      </div>
    </div>`;
  },
  act(g, ui, act) {
    if (act === 'shop') g.openShop();
    if (act === 'roadmap') ui.openRoadmap();
  },
};
