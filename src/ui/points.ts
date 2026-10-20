// "My stands": the player's other stands and own stores, their staff, results and payback, the upgrades of the stands,
// the cleaners of the stores, and hiring.
import { CONFIG } from '../core/config';
import type { LocationId, UpgradeId } from '../core/types';
import { LOCATIONS } from '../data/locations';
import { POINTS } from '../data/staff';
import { UPGRADES } from '../data/upgrades';
import { t } from '../i18n';
import { cleanPct } from '../sim/cleaning';
import type { Game } from '../sim/game';
import {
  freePlaces,
  isGirl,
  payback,
  pointCapacity,
  pointGear,
  pointHasRoomFor2,
  pointUps,
  POINT_UPGRADE_IDS,
  skillStars,
  standCount,
  type Point,
  type PointStatus,
  type Seller,
} from '../sim/points';
import { coin, ico, locIco, signedCoin } from './dom';
import type { ModalSpec } from './overlays';

export interface PointsHooks {
  /** The list of people who want the job: as the seller, or as the second worker. */
  hire(pointId: number, role?: 'seller' | 'helper'): void;
  points(): void;
  /** The upgrades of one stand. */
  shop(pointId: number): void;
  /** Show this stand in the scene (null: the own stand). */
  view(pointId: number | null): void;
  confirm(text: string, onYes: () => void): void;
}

const face = (s: Seller) => (isGirl(s.nameId) ? '👩' : '👨');

/** How a day of a point went, in words (a store has words of its own where they differ). */
export function statusText(loc: LocationId, status: PointStatus): string {
  return t(LOCATIONS[loc].store && (status === 'ok' || status === 'empty') ? `points.status.store_${status}` : `points.status.${status}`);
}
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
    <div class="kv"><span>${ico('pt_payback', '💹')} ${t('points.payback')}: <b>${pct}%</b></span><small>${coin(Math.max(0, pb.earned))} / ${coin(pb.invested)}</small></div>
    <div class="bar pb-bar"><i style="width:${pct}%"></i></div>
    <small class="muted">${note}</small>
  </div>`;
}

/** A store: its cleaner (hired or not) and how clean its floor is. */
function cleanerRow(g: Game, p: Point): string {
  const st = g.S.stores[p.loc];
  if (!p.store || !st) return '';
  const pct = cleanPct(st);
  return `<div class="pt-seller pt-cleaner">
    <span class="pt-face">🧹</span>
    <span class="grow"><b>${t(st.cleaner ? 'points.cleanerOn' : 'points.cleanerOff')}</b>
      <small>${t('points.wage', { n: CONFIG.CLEANER_WAGE })} · <span class="${pct < 60 ? 'neg' : ''}">${t('points.clean', { n: pct })}</span></small></span>
    <button class="btn btn-sm ${st.cleaner ? 'btn-r' : 'btn-g'}" data-act="cleaner:${p.id}" ${g.canManageStaff() ? '' : 'disabled'}>${t(st.cleaner ? 'staff.act.fire' : 'points.take')}</button>
  </div>`;
}

function pointCard(g: Game, p: Point): string {
  const kid = g.S.ageMode === 'kid';
  const s = p.seller;
  const manage = g.canManageStaff();
  const store = !!p.store;
  // the store where the player is today is the own scene: nothing to look at
  const here = p.loc === g.S.location;
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
    : `<div class="${store ? 'note' : 'warn-box'}">${t(p.away ? 'points.closedIll' : store ? 'points.storeNoStaff' : 'points.noSeller')}</div>
      <button class="btn btn-g btn-sm" data-act="hire:${p.id}" ${manage ? '' : 'disabled'}>${ico('pt_hire', '👤')} ${t(p.away ? 'staff.act.standin' : store ? 'points.hireStaff' : 'points.hire')}</button>`;
  const d = p.last;
  const minus = (key: string, n: number | undefined) => (n ? `<div class="kv"><span>${t(key)}</span><span>${coin('−' + n, 'neg')}</span></div>` : '');
  // (a day the player worked at the store: its whole numbers are in the report of that day)
  const lastDay = d
    ? `<div class="pt-last">
        <div class="kv"><b>${t('points.lastDay', { n: d.day })}</b><span class="muted">${statusText(p.loc, d.status)}${d.sold ? ` · 🥤 ${d.sold}` : ''}${d.clean !== undefined ? ` · 🧹 ${d.clean}%` : ''}</span></div>
        ${
          kid || d.status === 'owner'
            ? ''
            : `<div class="kv"><span>${t('report.sales')}</span><span>${coin(d.revenue)}</span></div>
        <div class="kv"><span>${t('report.ingredients')}</span><span>${coin('−' + d.ingredients, 'neg')}</span></div>
        <div class="kv"><span>${t('report.rent')}</span><span>${coin('−' + d.rent, 'neg')}</span></div>
        ${minus('report.utilities', d.utilities)}
        <div class="kv"><span>${t('points.salary')}</span><span>${coin('−' + d.wage, 'neg')}</span></div>
        ${minus('report.cleaning', d.cleaning)}
        ${d.tax ? `<div class="kv"><span>${t('report.tax', { n: Math.round(CONFIG.STORE_TAX * 100) })}</span><span>${coin('−' + d.tax, 'neg')}</span></div>` : ''}
        ${d.stolen ? `<div class="kv"><span>💸 ${t('points.stolen')}</span><span>${coin('−' + d.stolen, 'neg')}</span></div>` : ''}`
        }
        <div class="kv"><span><b>${t('report.profit')}</b></span><b>${signedCoin(d.profit)}</b></div>
      </div>`
    : `<small class="muted">${t(store ? 'points.storeNoDays' : 'points.noDays')}</small>`;
  // the second worker: their row, or the offer to hire one (when the stand has a seller)
  const h = p.helper;
  const helper = h
    ? `<div class="pt-seller pt-helper">
        <span class="pt-face">${face(h)}</span>
        <span class="grow"><b>${t(`staff.name${h.nameId}`)}</b> ${skill(h)}
          <small>${ico('pt_team', '👥')} ${t('points.helper2')} · ${t('points.wage', { n: h.wage })} · ${h.refs ? `✅ ${t('points.refs')}` : `❓ ${t('points.noRefs')}`}</small></span>
        <button class="btn btn-sm btn-r" data-act="fire2:${p.id}" ${manage ? '' : 'disabled'}>${t('staff.act.fire')}</button>
      </div>`
    : !(s || p.away)
      ? ''
      : pointHasRoomFor2(p)
        ? `<div class="pt-hire2"><button class="btn btn-sm" data-act="hire2:${p.id}" ${manage ? '' : 'disabled'}>${ico('pt_hire', '👥')} ${t('points.hire2')}</button>
        <small class="muted">${t(store ? 'points.hire2StoreNote' : 'points.hire2Note')}</small></div>`
        : `<div class="pt-hire2"><small class="muted">${ico('pt_team', '👥')} ${t('points.hire2Wide')}</small></div>`;
  const gear = pointGear(g.S, p);
  const ups = store ? (Object.keys(gear) as UpgradeId[]) : POINT_UPGRADE_IDS.filter((id) => gear[id]);
  return `<div class="pt-card${store ? ' pt-store' : ''}">
    <div class="pt-head"><span class="pt-ico">${locIco(p.loc)}</span><b class="grow">${t(`loc.${p.loc}.name`)}</b>${store ? `<span class="tag tag-store">${ico('store', '🏪')} ${t('loc.store')}</span>` : ''}${today}</div>
    ${store ? `<small class="muted">${t(here ? 'points.storeHere' : 'points.storeAway')}</small>` : ''}
    ${away}
    ${seller}
    ${helper}
    ${cleanerRow(g, p)}
    <div class="pt-ups" title="${t('points.equipment')}">${ups.map((id) => `<span class="pt-up">${ico(`up_${id}`, UPGRADES[id].icon)}</span>`).join('')}</div>
    ${
      store
        ? `${here ? '' : `<div class="row pt-btns"><button class="btn btn-sm btn-b" data-act="view:${p.id}">${ico('pt_look', '👀')} ${t('points.look')}</button></div>`}
    <div><small class="muted">${t('points.storeUps')}</small></div>`
        : `<div class="row pt-btns">
      <button class="btn btn-sm btn-b" data-act="view:${p.id}">${ico('pt_look', '👀')} ${t('points.look')}</button>
      <button class="btn btn-sm btn-y" data-act="shop:${p.id}">${ico('pt_upgrades', '🛠️')} ${t('points.upgrades')}</button>
    </div>`
    }
    ${lastDay}
    ${bars(p.history)}
    ${paybackBox(p)}
    <div class="pt-foot"><small class="muted">${t('points.total', { n: p.total })}</small>
      ${store ? '' : `<button class="btn btn-sm" data-act="sell:${p.id}" ${g.phase === 'shop' ? '' : 'disabled'}>${t('points.sell', { n: g.pointRefund(p) })}</button>`}</div>
  </div>`;
}

export function pointsModal(g: Game, hooks: PointsHooks): ModalSpec {
  return {
    wide: true,
    render: () => {
      const S = g.S;
      if (!g.pointsOpen() && !S.points.length) {
        return `<h2>${ico('pt_stand', '🏪')} ${t('points.title')}</h2>
          <div class="ev-ico">🔒</div>
          <p>${t('points.locked', { n: POINTS.MIN_REP })}</p>
          <div class="modal-actions"><button class="btn btn-y" data-act="close">${t('btn.close')}</button></div>`;
      }
      const evening = g.phase === 'shop';
      const yesterday = S.points.reduce((n, p) => n + (p.last?.profit ?? 0), 0);
      const total = S.points.reduce((n, p) => n + p.total, 0);
      const free = freePlaces(S);
      const stands = standCount(S);
      const stores = S.points.filter((p) => p.store);
      const newOnes =
        stands >= POINTS.MAX
          ? `<p class="note">${t('points.max', { n: POINTS.MAX })}</p>`
          : free.length
            ? free
                .map((loc) => {
                  const l = LOCATIONS[loc];
                  const ok = g.canOpenPoint(loc).ok;
                  return `<div class="pt-new"><span class="pt-ico">${locIco(loc)}</span>
                    <span class="grow"><b>${t(`loc.${loc}.name`)}</b>${l.indoor ? ` <span class="tag">🏠 ${t('loc.indoor')}</span>` : ''}
                    <small>${t('loc.rent', { n: coin(l.rent) })} · ${t('points.fair', { n: l.fairPrice })}</small></span>
                    <button class="btn btn-sm ${ok ? 'btn-g' : ''}" data-act="open:${loc}" ${ok ? '' : 'disabled'}>${coin(POINTS.COST)}</button></div>`;
                })
                .join('')
            : `<p class="note">${t('points.noPlaces')}</p>`;
      return `<h2>${ico('pt_stand', '🏪')} ${t('points.title')}</h2>
        <p class="note">${t('points.intro')}</p>
        ${
          S.points.length
            ? `<div class="card"><div class="kv"><span>${t('points.lastTotal')}</span><b>${signedCoin(yesterday)}</b></div>
          <div class="kv"><span>${t('points.allTime')}</span><b>${signedCoin(total)}</b></div></div>`
            : ''
        }
        ${stores.length ? `<h3>${ico('store', '🏪')} ${t('points.stores')}</h3><p class="note">${t('points.storesIntro')}</p>` : ''}
        ${stores.map((p) => pointCard(g, p)).join('')}
        ${stores.length && stands ? `<h3>${ico('pt_stand', '🏪')} ${t('points.stands')}</h3>` : ''}
        ${S.points.filter((p) => !p.store).map((p) => pointCard(g, p)).join('')}
        <h3>➕ ${t('points.new')}</h3>
        <p class="note">${ico('pt_wholesale', '📦')} ${t('points.kit')}</p>
        ${!evening && stands < POINTS.MAX ? `<div class="note">🌙 ${t('points.eveningOnly')}</div>` : ''}
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
      if (act === 'hire2') {
        queueMicrotask(() => hooks.hire(id, 'helper'));
        return true;
      }
      if (act === 'fire2') {
        const h = g.pointById(id)?.helper;
        if (h) hooks.confirm(t('points.fireConfirm', { name: t(`staff.name${h.nameId}`) }), () => g.fireHelper(id));
      }
      if (act === 'cleaner') {
        const p = g.pointById(id);
        if (p) g.setCleaner(p.loc, !g.S.stores[p.loc]?.cleaner);
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
      return `<h2>${ico('pt_upgrades', '🛠️')} ${t('points.shopTitle', { place: t(`loc.${p.loc}.name`) })}</h2>
        <div class="row pt-shop-head"><span class="chip coins">${coin(g.S.coins)}</span>
          <small class="muted">🥤 ${t('points.capacity', { n: pointCapacity(p) })}</small></div>
        ${paybackBox(p)}
        <p class="note">💡 ${t('points.shopNote')}</p>
        ${evening ? '' : `<div class="note">🌙 ${t('points.shopEvening')}</div>`}
        <div class="ups">${POINT_UPGRADE_IDS.map(card).join('')}</div>
        <p class="note">${t('points.shopMissing')}</p>
        <div class="modal-actions">
          <button class="btn btn-b" data-act="view">${ico('pt_look', '👀')} ${t('points.look')}</button>
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

export function hireModal(g: Game, pointId: number, hooks: PointsHooks, role: 'seller' | 'helper' = 'seller'): ModalSpec {
  return {
    wide: true,
    render: () => {
      const p = g.pointById(pointId);
      const list = g.candidates(pointId);
      const second = role === 'helper';
      const standin = !second && !!p?.away;
      const store = !!p?.store;
      const place = p ? t(`loc.${p.loc}.name`) : '';
      const title = second ? t('points.hire2Title', { place }) : t(standin ? 'points.standinTitle' : store ? 'points.hireStaffTitle' : 'points.hireTitle', { place });
      const tip = second
        ? t(store ? 'points.hire2StoreTip' : 'points.hire2Tip')
        : t(standin ? 'points.standinTip' : store ? 'points.hireStaffTip' : 'points.hireTip', { name: p?.away ? t(`staff.name${p.away.seller.nameId}`) : '' });
      return `<h2>${second ? ico('pt_team', '👥') : ico('pt_hire', '👤')} ${title}</h2>
        <p class="note">💡 ${tip}</p>
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
      if (act === 'take' && g.hireSeller(pointId, Number(arg), role)) {
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
