// "Reputation road": every reputation level and what it opens (places, upgrades, features).
// Opens from the reputation chip in the top bar. Built from the game data, so it stays in sync.
import { CONFIG } from '../core/config';
import { GOODS } from '../data/goods';
import { LOCATIONS, LOCATION_IDS } from '../data/locations';
import { POINTS } from '../data/staff';
import { UPGRADES, UPGRADE_ORDER } from '../data/upgrades';
import { t } from '../i18n';
import type { Game } from '../sim/game';
import { coin, stars } from './dom';
import type { ModalSpec } from './overlays';

const LEVELS = [1, 2, 3, 4];

interface Item {
  icon: string;
  name: string;
  kind: 'place' | 'feature' | 'upgrade';
  note?: string;
  done?: boolean;
}

function itemsFor(g: Game, level: number): Item[] {
  const out: Item[] = [];
  for (const id of LOCATION_IDS) {
    if ((LOCATIONS[id].minRep ?? 1) !== level) continue;
    out.push({ icon: LOCATIONS[id].icon, name: t(`loc.${id}.name`), kind: 'place', note: LOCATIONS[id].rent ? t('loc.rent', { n: coin(LOCATIONS[id].rent) }) : t('loc.free') });
  }
  if (level === CONFIG.HELPER_MIN_REP) out.push({ icon: '🍳', name: t('roadmap.helper'), kind: 'feature', note: t('points.wage', { n: CONFIG.HELPER_WAGE }) });
  if (level === (GOODS.cookies.minRep ?? 1)) out.push({ icon: '🍪', name: t('roadmap.cookies'), kind: 'feature', note: t('roadmap.cookiesNote', { n: GOODS.cookies.price }) });
  if (level === POINTS.MIN_REP) out.push({ icon: '🏪', name: t('roadmap.points'), kind: 'feature', note: t('roadmap.pointsNote', { n: POINTS.COST }) });
  for (const id of UPGRADE_ORDER) {
    const u = UPGRADES[id];
    if ((u.minRep ?? 1) !== level) continue;
    out.push({ icon: u.icon, name: t(`up.${id}.name`), kind: 'upgrade', note: coin(u.price), done: !!g.S.upgrades[id] });
  }
  return out;
}

export function roadmapModal(g: Game): ModalSpec {
  return {
    wide: true,
    render: () => {
      const rep = g.S.rep;
      const best = g.S.bestRep;
      const next = LEVELS.find((l) => best < l - 1e-9);
      const prev = next ? next - 1 : 4;
      const k = next ? Math.max(0, Math.min(1, (rep - prev) / (next - prev))) : 1;
      const levels = LEVELS.map((level) => {
        const reached = best >= level - 1e-9;
        const isNext = level === next;
        const items = itemsFor(g, level)
          .map(
            (it) => `<span class="rm-item rm-${it.kind}${it.done ? ' done' : ''}">
              <span class="rm-ico">${it.icon}</span>
              <span class="rm-txt"><b>${it.name}</b>${it.note ? `<small>${it.done ? `✅ ${t('shop.owned')}` : it.note}</small>` : ''}</span>
            </span>`,
          )
          .join('');
        const state = reached
          ? `<span class="chip rm-chip ok">✅ ${t('roadmap.open')}</span>`
          : `<span class="chip rm-chip">🔒 ${t('roadmap.left', { d: (level - rep).toFixed(1) })}</span>`;
        return `<div class="rm-level${reached ? ' reached' : ''}${isNext ? ' next' : ''}">
          <div class="rm-node">${'⭐'.repeat(level)}</div>
          <div class="rm-card">
            <div class="rm-head"><b>${t('roadmap.level', { n: level })}</b>${state}</div>
            <div class="rm-items">${items}</div>
          </div>
        </div>`;
      });
      return `<h2>🗺️ ${t('roadmap.title')}</h2>
        <div class="card rm-now">
          <div class="kv"><span>${t('roadmap.now')}</span><b>${stars(rep)} ${rep.toFixed(2)}</b></div>
          <div class="rm-bar"><i style="width:${Math.round(k * 100)}%"></i></div>
          <small class="muted">${next ? t('roadmap.next', { n: next, d: Math.max(0, next - rep).toFixed(2) }) : t('roadmap.max')}</small>
        </div>
        <p class="note">💡 ${t('roadmap.how')}</p>
        <div class="rm-road">${levels.join('')}</div>
        <div class="modal-actions"><button class="btn btn-y" data-act="close">${t('btn.close')}</button></div>`;
    },
    act: (act) => act === 'close',
  };
}
