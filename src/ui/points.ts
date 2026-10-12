// "My stands": the player's other stands, their sellers and results, and the hiring dialog.
import type { LocationId } from '../core/types';
import { LOCATIONS } from '../data/locations';
import { POINTS } from '../data/staff';
import { t } from '../i18n';
import type { Game } from '../sim/game';
import { freePlaces, isGirl, skillStars, type Point, type Seller } from '../sim/points';
import { coin, signedCoin } from './dom';
import type { ModalSpec } from './overlays';

export interface PointsHooks {
  hire(pointId: number): void;
  points(): void;
  confirm(text: string, onYes: () => void): void;
}

const face = (s: Seller) => (isGirl(s.nameId) ? '👩' : '👨');
const skill = (s: Seller) => {
  const n = skillStars(s.skill);
  return `<span class="skill" title="${t('points.skill')}">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>`;
};
const refund = () => Math.round(POINTS.COST * POINTS.SELL_BACK);

function bars(history: number[]): string {
  if (!history.length) return '';
  const max = Math.max(1, ...history.map((v) => Math.abs(v)));
  return `<div class="pt-bars">${history
    .map((v) => `<i class="${v < 0 ? 'neg' : ''}" style="height:${Math.max(6, Math.round((Math.abs(v) / max) * 100))}%" title="${v}"></i>`)
    .join('')}</div>`;
}

function pointCard(g: Game, p: Point): string {
  const kid = g.S.ageMode === 'kid';
  const s = p.seller;
  const manage = g.canManageStaff();
  const today = p.issue && p.issue !== 'stole' ? `<span class="chip warn-chip">${t(`points.issue.${p.issue}`)}</span>` : '';
  const seller = s
    ? `<div class="pt-seller">
        <span class="pt-face">${face(s)}</span>
        <span class="grow"><b>${t(`staff.name${s.nameId}`)}</b> ${skill(s)}
          <small>${t('points.wage', { n: s.wage })} · ${s.refs ? `✅ ${t('points.refs')}` : `❓ ${t('points.noRefs')}`}${s.warnings ? ` · ⚠️ ${t('points.warnings', { n: s.warnings })}` : ''}</small></span>
        <button class="btn btn-sm btn-r" data-act="fire:${p.id}" ${manage ? '' : 'disabled'}>${t('staff.act.fire')}</button>
      </div>`
    : `<div class="warn-box">${t('points.noSeller')}</div>
      <button class="btn btn-g btn-sm" data-act="hire:${p.id}" ${manage ? '' : 'disabled'}>👤 ${t('points.hire')}</button>`;
  const d = p.last;
  const lastDay = d
    ? `<div class="pt-last">
        <div class="kv"><b>${t('points.lastDay', { n: d.day })}</b><span class="muted">${t(`points.status.${d.status}`)}${d.sold ? ` · 🥤 ${d.sold}` : ''}</span></div>
        ${
          kid
            ? ''
            : `<div class="kv"><span>${t('report.sales')}</span><span>${coin(d.revenue)}</span></div>
        <div class="kv"><span>${t('report.ingredients')}</span><span>${coin('−' + d.ingredients, 'neg')}</span></div>
        <div class="kv"><span>${t('report.rent')}</span><span>${coin('−' + d.rent, 'neg')}</span></div>
        <div class="kv"><span>${t('points.salary')}</span><span>${coin('−' + d.wage, 'neg')}</span></div>
        ${d.stolen ? `<div class="kv"><span>💸 ${t('points.stolen')}</span><span>${coin('−' + d.stolen, 'neg')}</span></div>` : ''}`
        }
        <div class="kv"><span><b>${t('report.profit')}</b></span><b>${signedCoin(d.profit)}</b></div>
      </div>`
    : `<small class="muted">${t('points.noDays')}</small>`;
  return `<div class="pt-card">
    <div class="pt-head"><span class="pt-ico">${LOCATIONS[p.loc].icon}</span><b class="grow">${t(`loc.${p.loc}.name`)}</b>${today}</div>
    ${seller}
    ${lastDay}
    ${bars(p.history)}
    <div class="pt-foot"><small class="muted">${t('points.total', { n: p.total })}</small>
      <button class="btn btn-sm" data-act="sell:${p.id}" ${g.phase === 'shop' ? '' : 'disabled'}>${t('points.sell', { n: refund() })}</button></div>
  </div>`;
}

export function pointsModal(g: Game, hooks: PointsHooks): ModalSpec {
  return {
    wide: true,
    render: () => {
      const S = g.S;
      if (!g.pointsOpen() && !S.points.length) {
        return `<h2>🏪 ${t('points.title')}</h2>
          <div class="ev-ico">🔒</div>
          <p>${t('points.locked', { n: POINTS.MIN_REP })}</p>
          <div class="modal-actions"><button class="btn btn-y" data-act="close">${t('btn.close')}</button></div>`;
      }
      const evening = g.phase === 'shop';
      const yesterday = S.points.reduce((n, p) => n + (p.last?.profit ?? 0), 0);
      const total = S.points.reduce((n, p) => n + p.total, 0);
      const free = freePlaces(S);
      const newOnes =
        S.points.length >= POINTS.MAX
          ? `<p class="note">${t('points.max', { n: POINTS.MAX })}</p>`
          : free.length
            ? free
                .map((loc) => {
                  const l = LOCATIONS[loc];
                  const ok = g.canOpenPoint(loc).ok;
                  return `<div class="pt-new"><span class="pt-ico">${l.icon}</span>
                    <span class="grow"><b>${t(`loc.${loc}.name`)}</b>${l.indoor ? ` <span class="tag">🏠 ${t('loc.indoor')}</span>` : ''}
                    <small>${t('loc.rent', { n: coin(l.rent) })} · ${t('points.fair', { n: l.fairPrice })}</small></span>
                    <button class="btn btn-sm ${ok ? 'btn-g' : ''}" data-act="open:${loc}" ${ok ? '' : 'disabled'}>${coin(POINTS.COST)}</button></div>`;
                })
                .join('')
            : `<p class="note">${t('points.noPlaces')}</p>`;
      return `<h2>🏪 ${t('points.title')}</h2>
        <p class="note">${t('points.intro')}</p>
        ${
          S.points.length
            ? `<div class="card"><div class="kv"><span>${t('points.lastTotal')}</span><b>${signedCoin(yesterday)}</b></div>
          <div class="kv"><span>${t('points.allTime')}</span><b>${signedCoin(total)}</b></div></div>`
            : ''
        }
        ${S.points.map((p) => pointCard(g, p)).join('')}
        <h3>➕ ${t('points.new')}</h3>
        ${!evening && S.points.length < POINTS.MAX ? `<div class="note">🌙 ${t('points.eveningOnly')}</div>` : ''}
        ${newOnes}
        <div class="modal-actions"><button class="btn btn-y" data-act="close">${t('btn.close')}</button></div>`;
    },
    act: (act, arg) => {
      if (act === 'close') return true;
      const id = Number(arg);
      if (act === 'open') {
        const p = g.openPoint(arg as LocationId);
        if (p) {
          // a new stand needs a seller right away
          queueMicrotask(() => hooks.hire(p.id));
          return true;
        }
      }
      if (act === 'hire') {
        queueMicrotask(() => hooks.hire(id));
        return true;
      }
      if (act === 'fire') {
        const s = g.pointById(id)?.seller;
        if (s) hooks.confirm(t('points.fireConfirm', { name: t(`staff.name${s.nameId}`) }), () => g.fireSeller(id));
      }
      if (act === 'sell') hooks.confirm(t('points.sellConfirm', { n: refund() }), () => g.closePoint(id));
      return false;
    },
  };
}

export function hireModal(g: Game, pointId: number, hooks: PointsHooks): ModalSpec {
  return {
    wide: true,
    render: () => {
      const p = g.pointById(pointId);
      const list = g.candidates(pointId);
      return `<h2>👤 ${t('points.hireTitle', { place: p ? t(`loc.${p.loc}.name`) : '' })}</h2>
        <p class="note">💡 ${t('points.hireTip')}</p>
        ${list
          .map(
            (s, i) => `<div class="pt-seller pt-cand">
            <span class="pt-face">${face(s)}</span>
            <span class="grow"><b>${t(`staff.name${s.nameId}`)}</b> ${skill(s)}
              <small>${t('points.wage', { n: s.wage })} · ${s.refs ? `✅ ${t('points.refs')}` : `❓ ${t('points.noRefs')}`}</small></span>
            <button class="btn btn-g btn-sm" data-act="take:${i}">${t('points.take')}</button>
          </div>`,
          )
          .join('')}
        <div class="modal-actions"><button class="btn" data-act="back">${t('points.later')}</button></div>`;
    },
    act: (act, arg) => {
      if (act === 'take' && g.hireSeller(pointId, Number(arg))) {
        queueMicrotask(() => hooks.points());
        return true;
      }
      if (act === 'back') {
        queueMicrotask(() => hooks.points());
        return true;
      }
      return false;
    },
  };
}
