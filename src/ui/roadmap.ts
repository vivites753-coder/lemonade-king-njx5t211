// "Reputation road": every reputation level and what it opens (places, new features, upgrades), up to the top level.
// Opens from the reputation chip in the top bar and from the day report. Built from the game data, so it stays in sync.
import { CONFIG } from '../core/config';
import { GOODS } from '../data/goods';
import { LOCATIONS, LOCATION_IDS, storeSetupCost } from '../data/locations';
import { MENU } from '../data/menu';
import { POINTS } from '../data/staff';
import { UPGRADES, UPGRADE_ORDER } from '../data/upgrades';
import { t } from '../i18n';
import { repLevel } from '../sim/economy';
import type { Game } from '../sim/game';
import { coin, ico, locIco, stars } from './dom';
import type { ModalSpec } from './overlays';

/** Every level on the road. The top one opens nothing new: it is the goal. */
const ROAD = [1, 2, 3, 4, 5];
const TOP = 5;
/** From this level everything in the game is open. */
const ALL_OPEN = 4;

type Kind = 'place' | 'feature' | 'upgrade';
/** The groups of a level, in the order they are shown. */
const KINDS: Kind[] = ['place', 'feature', 'upgrade'];

interface Item {
  icon: string;
  name: string;
  kind: Kind;
  /** Short lines under the name: the rent, the price... */
  notes: string[];
  /** An upgrade bought, a store opened. */
  done?: boolean;
}

function perDay(n: number): string {
  return t('roadmap.perDay', { n: coin(n) });
}

function itemsFor(g: Game, level: number): Item[] {
  const out: Item[] = [];
  const feature = (minRep: number, icon: string, name: string, ...notes: string[]): void => {
    if (minRep === level) out.push({ icon, name, kind: 'feature', notes });
  };
  for (const id of LOCATION_IDS) {
    const loc = LOCATIONS[id];
    if ((loc.minRep ?? 1) !== level) continue;
    const rent = loc.rent ? t('loc.rent', { n: coin(loc.rent) }) : t('loc.free');
    // a store: its opening costs once, then the rent
    const notes = loc.store ? [t('roadmap.storeNote', { n: coin(storeSetupCost(id)) }), rent] : [rent];
    out.push({ icon: locIco(id), name: t(`loc.${id}.name`), kind: 'place', notes, done: !!g.S.stores[id] });
  }
  feature(CONFIG.HELPER_MIN_REP, ico('pt_hire', '🙋'), t('roadmap.helper'), perDay(CONFIG.HELPER_WAGE));
  feature(GOODS.cookies.minRep ?? 1, ico('gd_cookie', '🍪'), t('roadmap.cookies'), t('roadmap.cookiesNote', { n: coin(GOODS.cookies.price) }));
  feature(CONFIG.HELPER2_MIN_REP, ico('pt_team', '👥'), t('roadmap.helper2'), t('roadmap.helper2Note'));
  feature(CONFIG.ONLINE_ADS_MIN_REP, ico('btn_onlineads', '📱'), t('roadmap.onlineAds'), perDay(CONFIG.ONLINE_ADS_COST));
  feature(POINTS.MIN_REP, ico('pt_stand', '🏪'), t('roadmap.points'), t('roadmap.pointsNote', { n: coin(POINTS.COST) }));
  feature(POINTS.MIN_REP, ico('cleaner', '🧹'), t('roadmap.storeStaff'), t('roadmap.storeStaffNote'), t('roadmap.cleanerNote', { n: coin(CONFIG.CLEANER_WAGE) }));
  feature(MENU.MIN_REP, ico('gd_orange', '🍊'), t('roadmap.menu'), t('roadmap.menuNote'));
  for (const id of UPGRADE_ORDER) {
    const u = UPGRADES[id];
    if ((u.minRep ?? 1) !== level) continue;
    out.push({ icon: ico(`up_${id}`, u.icon), name: t(`up.${id}.name`), kind: 'upgrade', notes: [coin(u.price)], done: !!g.S.upgrades[id] });
  }
  return out;
}

/** One thing a level opens: its picture, its name and the short lines under it (or "bought" once it is bought). */
function tile(it: Item): string {
  const notes = it.done
    ? `<small class="ok">✓ ${t(it.kind === 'place' ? 'roadmap.open' : 'roadmap.owned')}</small>`
    : it.notes.map((n) => `<small>${n}</small>`).join('');
  return `<div class="rm-tile rm-${it.kind}${it.done ? ' done' : ''}">
    <span class="rm-ico">${it.icon}</span>
    <span class="rm-txt"><b>${it.name}</b>${notes}</span>
  </div>`;
}

/** The star of a level on the road, with its number (a grey star until it is reached; the crown for the top). */
function node(level: number, reached: boolean): string {
  if (level === TOP) return `<div class="rm-node top">${ico('emblem', '👑')}</div>`;
  return `<div class="rm-node">${ico(reached ? 'star_full' : 'star_empty', '⭐')}<b>${level}</b></div>`;
}

export function roadmapModal(g: Game): ModalSpec {
  return {
    cls: 'rm-modal',
    render: () => {
      const best = g.S.bestRep;
      // the reputation is shown as a whole level and the green bar to the next one
      const now = repLevel(g.S.rep);
      const pct = Math.round(now.bar * 100);
      const next = ROAD.find((l) => best < l - 1e-9);
      const sub =
        now.level >= TOP
          ? t('roadmap.max')
          : best >= ALL_OPEN - 1e-9
            ? `${t('roadmap.max')} · ${t('roadmap.next', { n: now.level + 1, p: pct })}`
            : t('roadmap.next', { n: now.level + 1, p: pct });
      const levels = ROAD.map((level, i) => {
        const reached = best >= level - 1e-9;
        const isNext = level === next;
        // the line down to the next star is green once that star is reached too
        const lineDone = i + 1 < ROAD.length && best >= ROAD[i + 1] - 1e-9;
        const state = reached
          ? `<span class="rm-state ok">✓ ${t(level === TOP ? 'roadmap.reached' : 'roadmap.open')}</span>`
          : isNext && level === now.level + 1
            ? `<span class="rm-state next"><i class="rm-mini"><i style="width:${pct}%"></i></i>${t('roadmap.left', { p: pct })}</span>`
            : `<span class="rm-state">${ico('lock', '🔒')} ${t('roadmap.locked')}</span>`;
        let body: string;
        if (level === TOP) {
          body = `<div class="rm-goal">${t('roadmap.topNote')}</div>`;
        } else {
          const items = itemsFor(g, level);
          body = KINDS.map((kind) => {
            const list = items.filter((it) => it.kind === kind);
            return list.length
              ? `<div class="rm-label">${t(`roadmap.kind.${kind}`)}</div><div class="rm-grid">${list.map(tile).join('')}</div>`
              : '';
          }).join('');
        }
        const name = level === TOP ? `${t('roadmap.level', { n: level })} · ${t('roadmap.top')}` : t('roadmap.level', { n: level });
        return `<li class="rm-level${reached ? ' reached' : ' locked'}${isNext ? ' next' : ''}${lineDone ? ' line-done' : ''}${level === TOP ? ' rm-top' : ''}">
          ${node(level, reached)}
          <section class="rm-card">
            <div class="rm-head"><h3>${name}</h3>${state}</div>
            ${body}
          </section>
        </li>`;
      });
      return `<h2>🗺️ ${t('roadmap.title')}</h2>
        <div class="rm-hero">
          <div class="rm-medal">${ico('star_full', '⭐')}<b>${now.level}</b></div>
          <div class="rm-hero-txt">
            <div class="rm-hero-top"><span>${t('roadmap.now')}</span>${stars(now.level)}</div>
            <div class="rm-hero-level">${t('roadmap.level', { n: now.level })}</div>
            <div class="rm-bar"><i style="width:${pct}%"></i></div>
            <small>${sub}</small>
          </div>
        </div>
        <div class="rm-how">💡 ${t('roadmap.how')}</div>
        <ol class="rm-road">${levels.join('')}</ol>
        <div class="modal-actions"><button class="btn btn-y" data-act="close">${t('btn.close')}</button></div>`;
    },
    // the next level to reach is the one to look at: bring it into view (under the hero when the dialog is short)
    shown: (card) => {
      const el = card.querySelector<HTMLElement>('.rm-level.next');
      if (!el) return;
      const foot = card.querySelector<HTMLElement>('.modal-actions')?.offsetHeight ?? 0;
      const need = el.offsetTop + el.offsetHeight + foot + 8 - card.clientHeight;
      if (need > 0) card.scrollTop = Math.min(need, el.offsetTop - 8);
    },
    act: (act) => act === 'close',
  };
}
