// "My stands": the player's other stands, their sellers, results and payback, their own upgrades, and hiring.
import type { LocationId, UpgradeId } from '../core/types';
import { LOCATIONS } from '../data/locations';
import { POINTS } from '../data/staff';
import { UPGRADES } from '../data/upgrades';
import { t } from '../i18n';
import type { Game } from '../sim/game';
import { freePlaces, isGirl, payback, pointCapacity, pointUps, POINT_UPGRADE_IDS, skillStars, type Point, type Seller } from '../sim/points';
import { coin, ico, signedCoin } from './dom';
import type { ModalSpec } from './overlays';

export interface PointsHooks {
  hire(pointId: number): void;
  points(): void;
  /** The upgrades of one stand. */
  shop(pointId: number): void;
  /** Show this stand in the scene (null: the own stand). */
  view(pointId: number | null): void;
  confirm(text: string, onYes: () => void): void;
}

const face = (s: Seller) => (isGirl(s.nameId) ? '👩' : '👨');
const skill = (s: Seller) => {
  const n = skillStars(s.skill);
  return `<span class="skill" title="${t('points.skill')}">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>`;
};

function bars(history: number[]): string {
  if (!history.length) return '';
  const max = Math.max(1, ...history.map((v) => Math.abs(v)));
  return `<div class="pt-bars">${history
    .map((v) => `<i class="${v < 0 ? 'neg' : ''}" style="height:${Math.max(6, Math.round((Math.abs(v) / max) * 100))}%" title="${v}"></i>`)
    .join('')}</div>`;
}

/** Payback of a stand: a bar of what has come back and how many days are left at the pace of the last week. */
export function paybackBox(p: Point): string {
  const pb = payback(p);
  const pct = Math.max(0, Math.min(100, Math.round(pb.share * 100)));
  const note =
    pb.days === 0
      ? `✅ ${t('points.paidBack')}`
      : pb.days !== null
        ? t('points.paybackLeft', { n: pb.days })
        : p.history.length
          ? t('points.paybackNever')
          : t('points.paybackWait');
  return `<div class="pt-payback" title="${t('gl.payback.text')}">
    <div class="kv"><span>💹 ${t('points.payback')}: <b>${pct}%</b></span><small>${coin(Math.max(0, pb.earned))} / ${coin(pb.invested)}</small></div>
    <div class="bar pb-bar"><i style="width:${pct}%"></i></div>
    <small class="muted">${note}</small>
  </div>`;
}

function pointCard(g: Game, p: Point): string {
  const kid = g.S.ageMode === 'kid';
  const s = p.seller;
  const manage = g.canManageStaff();
  const today = p.issue && p.issue !== 'stole' ? `<span class="chip warn-chip">${t(`points.issue.${p.issue}`)}</span>` : '';
  const away = p.away
    ? `<div class="warn-box">🤒 ${t('points.away', { name: t(`staff.name${p.away.seller.nameId}`), n: p.away.days })}${s ? ` ${t('points.standin')}` : ''}</div>`
    : '';
  const seller = s
    ? `<div class="pt-seller">
        <span class="pt-face">${face(s)}</span>
        <span class="grow"><b>${t(`staff.name${s.nameId}`)}</b> ${skill(s)}
          <small>${t('points.wage', { n: s.wage })} · ${s.refs ? `✅ ${t('points.refs')}` : `❓ ${t('points.noRefs')}`}${s.warnings ? ` · ⚠️ ${t('points.warnings', { n: s.warnings })}` : ''}</small></span>
        <button class="btn btn-sm btn-r" data-act="fire:${p.id}" ${manage ? '' : 'disabled'}>${t('staff.act.fire')}</button>
      </div>`
    : `<div class="warn-box">${t(p.away ? 'points.closedIll' : 'points.noSeller')}</div>
      <button class="btn btn-g btn-sm" data-act="hire:${p.id}" ${manage ? '' : 'disabled'}>👤 ${t(p.away ? 'staff.act.standin' : 'points.hire')}</button>`;
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
  const ups = POINT_UPGRADE_IDS.filter((id) => pointUps(p)[id]);
  return `<div class="pt-card">
    <div class="pt-head"><span class="pt-ico">${LOCATIONS[p.loc].icon}</span><b class="grow">${t(`loc.${p.loc}.name`)}</b>${today}</div>
    ${away}
    ${seller}
    <div class="pt-ups" title="${t('points.equipment')}">${ups.map((id) => `<span class="pt-up">${ico(`up_${id}`, UPGRADES[id].icon)}</span>`).join('')}</div>
    <div class="row pt-btns">
      <button class="btn btn-sm btn-b" data-act="view:${p.id}">👀 ${t('points.look')}</button>
      <button class="btn btn-sm btn-y" data-act="shop:${p.id}">🛠️ ${t('points.upgrades')}</button>
    </div>
    ${lastDay}
    ${bars(p.history)}
    ${paybackBox(p)}
    <div class="pt-foot"><small class="muted">${t('points.total', { n: p.total })}</small>
      <button class="btn btn-sm" data-act="sell:${p.id}" ${g.phase === 'shop' ? '' : 'disabled'}>${t('points.sell', { n: g.pointRefund(p) })}</button></div>
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
        <p class="note">📦 ${t('points.kit')}</p>
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
      if (act === 'view') {
        hooks.view(id);
        return true;
      }
      if (act === 'shop') {
        queueMicrotask(() => hooks.shop(id));
        return true;
      }
      if (act === 'fire') {
        const s = g.pointById(id)?.seller;
        if (s) hooks.confirm(t('points.fireConfirm', { name: t(`staff.name${s.nameId}`) }), () => g.fireSeller(id));
      }
      if (act === 'sell') {
        const p = g.pointById(id);
        if (p) hooks.confirm(t('points.sellConfirm', { n: g.pointRefund(p) }), () => g.closePoint(id));
      }
      return false;
    },
  };
}

/** The upgrades of one stand: the same things as for the own stand (what makes sense where a seller works). */
export function pointShopModal(g: Game, pointId: number, hooks: PointsHooks): ModalSpec {
  return {
    wide: true,
    render: () => {
      const p = g.pointById(pointId);
      if (!p) return `<div class="modal-actions"><button class="btn btn-y" data-act="back">${t('btn.close')}</button></div>`;
      const up = pointUps(p);
      const evening = g.phase === 'shop';
      const card = (id: UpgradeId) => {
        const u = UPGRADES[id];
        const can = g.canBuyPointUpgrade(p.id, id);
        const owned = !!up[id];
        let btn: string;
        if (owned) btn = `<b class="pos">${t('shop.owned')}</b>`;
        else if (can.reason === 'rep') btn = `<small class="neg">🔒 ⭐ ${u.minRep}</small>`;
        else if (can.reason === 'requires') btn = `<small>${t('shop.needs', { x: t(`up.${u.requires}.name`) })}</small>`;
        else btn = `<button class="btn ${can.ok ? 'btn-g' : ''} btn-sm" data-act="buy:${id}" ${can.ok ? '' : 'disabled'}>${coin(u.price)}</button>`;
        const outdoorOnly = u.outdoorOnly && LOCATIONS[p.loc].indoor;
        return `<div class="up${owned ? ' owned' : ''}${can.reason === 'rep' ? ' locked' : ''}">
          <div class="ico">${ico(`up_${id}`, u.icon)}</div>
          <div><b>${t(`up.${id}.name`)}</b><small>${t(`ptup.${id}`)}</small>${outdoorOnly ? `<small class="pill-out">☀️ ${t('shop.outdoorOnly')}</small>` : ''}</div>
          <div>${btn}</div>
        </div>`;
      };
      return `<h2>🛠️ ${t('points.shopTitle', { place: t(`loc.${p.loc}.name`) })}</h2>
        <div class="row pt-shop-head"><span class="chip coins">${coin(g.S.coins)}</span>
          <small class="muted">🥤 ${t('points.capacity', { n: pointCapacity(p) })}</small></div>
        ${paybackBox(p)}
        <p class="note">💡 ${t('points.shopNote')}</p>
        ${evening ? '' : `<div class="note">🌙 ${t('points.shopEvening')}</div>`}
        <div class="ups">${POINT_UPGRADE_IDS.map(card).join('')}</div>
        <p class="note">${t('points.shopMissing')}</p>
        <div class="modal-actions">
          <button class="btn btn-b" data-act="view">👀 ${t('points.look')}</button>
          <button class="btn btn-y" data-act="back">${t('points.back')}</button>
        </div>`;
    },
    act: (act, arg) => {
      if (act === 'buy') {
        g.buyPointUpgrade(pointId, arg as UpgradeId);
        return false;
      }
      if (act === 'view') {
        hooks.view(pointId);
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

export function hireModal(g: Game, pointId: number, hooks: PointsHooks): ModalSpec {
  return {
    wide: true,
    render: () => {
      const p = g.pointById(pointId);
      const list = g.candidates(pointId);
      const standin = !!p?.away;
      return `<h2>👤 ${t(standin ? 'points.standinTitle' : 'points.hireTitle', { place: p ? t(`loc.${p.loc}.name`) : '' })}</h2>
        <p class="note">💡 ${t(standin ? 'points.standinTip' : 'points.hireTip', { name: p?.away ? t(`staff.name${p.away.seller.nameId}`) : '' })}</p>
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
