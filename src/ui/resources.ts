// Always-visible stock panel (left edge) and the "Stock and equipment" dialog.
import { CONFIG } from '../core/config';
import type { EquipId, Phase } from '../core/types';
import { EQUIPMENT } from '../data/equipment';
import { t } from '../i18n';
import { inUseEquipment } from '../sim/equipment';
import type { Game } from '../sim/game';
import { lemonsTotal } from '../sim/state';
import { coin, ico } from './dom';
import type { ModalSpec } from './overlays';

const ROWS: { key: string; icon: string; img: string; label: string }[] = [
  { key: 'lemons', icon: '🍋', img: 'gd_lemon', label: 'res.lemons' },
  { key: 'water', icon: '💧', img: 'gd_water', label: 'res.water' },
  { key: 'sugar', icon: '🍬', img: 'gd_sugar', label: 'res.sugar' },
  { key: 'cups', icon: '🥤', img: 'gd_cups', label: 'res.cups' },
  { key: 'cookies', icon: '🍪', img: 'gd_cookie', label: 'res.cookies' },
  { key: 'ice', icon: '❄️', img: 'gd_ice', label: 'res.ice' },
  { key: 'ready', icon: '🥛', img: 'gd_ready', label: 'res.ready' },
  { key: 'cooler', icon: '🧊', img: 'gd_ice', label: 'res.cooler' },
  { key: 'make', icon: '🏺', img: 'gd_pitcher', label: 'res.canMake' },
];

export class ResourceBar {
  private cache = new Map<string, string>();
  private els: Record<string, HTMLElement> = {};

  constructor(
    private root: HTMLElement,
    private g: Game,
    onOpen: () => void,
  ) {
    root.addEventListener('click', () => onOpen());
    this.build();
  }

  build(): void {
    this.root.setAttribute('aria-label', t('res.open'));
    // hover tips (data-tip) explain every row; they are filled in update()
    this.root.innerHTML =
      `<div class="res-head">${t('res.title')}</div>` +
      ROWS.map((r) => `<div class="res-row" data-row="${r.key}"><span class="ri">${ico(r.img, r.icon)}</span><b data-r="${r.key}"></b></div>`).join('') +
      `<div class="res-row res-warn" data-row="broken"><span class="ri">🔧</span><b data-r="broken"></b></div>` +
      `<div class="res-row" data-row="helper"><span class="ri">🍳</span><b data-r="helper"></b></div>`;
    this.els = {};
    this.cache.clear();
    for (const el of Array.from(this.root.querySelectorAll<HTMLElement>('[data-r],[data-row]'))) {
      this.els[(el.dataset.r ? 'v-' + el.dataset.r : 'row-' + el.dataset.row) as string] = el;
    }
  }

  private set(key: string, html: string): void {
    const el = this.els['v-' + key];
    if (!el || this.cache.get(key) === html) return;
    this.cache.set(key, html);
    el.innerHTML = html;
  }

  private show(row: string, on: boolean): void {
    this.els['row-' + row]?.classList.toggle('hidden', !on);
  }

  private tip(row: string, text: string): void {
    const el = this.els['row-' + row];
    const full = `${text}\n${t('res.tapHint')}`;
    if (el && el.dataset.tip !== full) el.dataset.tip = full;
  }

  update(phase: Phase): void {
    this.root.classList.toggle('hidden', phase === 'title');
    if (phase === 'title') return;
    const g = this.g;
    const st = g.S.stock;
    const market = phase === 'market';
    // in the kitchen the column shows what is left on the shelves (what is already in the jug is not there any more)
    const kitchen = phase === 'kitchen' || g.midKitchen;
    const left = kitchen ? g.kitchenLeft() : null;
    const have = { lemons: left ? left.lemon : lemonsTotal(st), water: left ? left.water : st.water, sugar: left ? left.sugar : st.sugar };
    const w = market ? g.stockWithCart() : { ...have, cups: st.cups };
    const plus = (now: number, after: number) => (market && after > now ? ` <small class="pos">+${after - now}</small>` : '');
    const old = st.lemons.filter((b) => b.age + 1 >= CONFIG.LEMON_SPOIL_AGE).reduce((n, b) => n + b.n, 0);
    this.set('lemons', `${have.lemons}${plus(have.lemons, w.lemons)}${old ? ` <small class="neg">⚠${old}</small>` : ''}`);
    this.set('water', `${have.water}${plus(have.water, w.water)}`);
    this.set('sugar', `${have.sugar}${plus(have.sugar, w.sugar)}`);
    this.set('cups', `${st.cups}${plus(st.cups, w.cups)}`);
    const cookies = st.cookies ?? 0;
    const cookiesAfter = market ? cookies + g.cart.cookies * 10 : cookies;
    this.set('cookies', `${cookies}${plus(cookies, cookiesAfter)}`);
    this.show('cookies', cookiesAfter > 0 || g.cookiesOpen());
    // the trays of ice of the freezer (in the kitchen: what is left after the jug)
    const ice = kitchen ? g.kitchenIceLeft() : (st.ice ?? 0);
    this.set('ice', String(ice));
    this.show('ice', !!g.S.upgrades.freezer);
    const ready = g.D.cupsReady;
    this.set('ready', String(ready));
    this.show('ready', ready > 0 || phase === 'sell' || phase === 'prepare');
    // the cooler bag: yesterday's lemonade still left today, or what goes in tonight for tomorrow
    const night = phase === 'report' || phase === 'shop';
    const cooled = night ? g.S.carryCups : Math.min(ready, Math.max(0, g.D.carriedIn - g.D.funnel.sold));
    this.set('cooler', String(cooled));
    this.show('cooler', !!g.S.upgrades.cooler);
    const canMake = market ? g.pitchersWithCart() : g.maxPitchersNow();
    this.set('make', `×${canMake}`);
    const broken = Object.keys(g.S.broken) as EquipId[];
    this.set('broken', broken.map((id) => EQUIPMENT[id].icon).join(''));
    this.show('broken', broken.length > 0);
    this.show('helper', g.D.helpers > 0);
    this.set('helper', g.D.helpers > 1 ? `×${g.D.helpers}` : '✓');

    this.tip('lemons', `🍋 ${t('res.lemons')}: ${have.lemons}${old ? ` · ⚠ ${t('res.oldTip', { n: old })}` : ''}`);
    this.tip('water', `💧 ${t('res.water')}: ${have.water}`);
    this.tip('sugar', `🍬 ${t('res.sugar')}: ${have.sugar}`);
    this.tip('cups', `🥤 ${t('res.cups')}: ${st.cups}`);
    this.tip('cookies', `🍪 ${t('res.cookies')}: ${cookies} · ${t('res.cookiePrice', { n: g.S.cookiePrice })}`);
    this.tip('ice', `❄️ ${t('res.ice')}: ${ice}${g.S.broken.freezer ? ` · 🔧 ${t('res.iceBroken')}` : ''}`);
    this.tip('ready', `🥛 ${t('res.ready')}: ${ready}`);
    this.tip('cooler', `🧊 ${t(night ? 'res.coolerNight' : 'res.coolerTip', { n: cooled })}`);
    this.tip('make', `🏺 ${t('res.canMake')}: ${canMake}`);
    this.tip('broken', `🔧 ${t('res.broken')}: ${broken.map((id) => t(`equip.${id}`)).join(', ')}`);
    this.tip('helper', `🍳 ${t('res.helper')}`);
  }
}

function condBar(c: number, broken: boolean): string {
  const col = broken ? '#fa5252' : c > 60 ? '#51cf66' : c > 35 ? '#fab005' : '#fa5252';
  return `<div class="cond"><i style="width:${broken ? 100 : Math.round(c)}%;background:${col}"></i></div>`;
}

export function equipmentRows(g: Game, mode: 'repair' | 'shop'): string {
  return inUseEquipment(g.S)
    .map((id) => {
      const broken = !!g.S.broken[id];
      const c = g.S.condition[id] ?? 100;
      let btn = '';
      if (broken) {
        const cost = g.repairCost(id);
        btn = `<button class="btn btn-sm btn-g" data-act="repair:${id}" ${g.S.coins < cost ? 'disabled' : ''}>🔧 ${t('shop.repair')} ${coin(cost)}</button>`;
      } else if (mode === 'shop') {
        const cost = g.maintenanceCost(id);
        btn = cost > 0 ? `<button class="btn btn-sm" data-act="maintain:${id}" ${g.S.coins < cost ? 'disabled' : ''}>🧽 ${t('shop.maintain')} ${coin(cost)}</button>` : `<small class="pos">${t('shop.okTag')}</small>`;
      }
      return `<div class="eq-row">
        <span class="ico">${ico(`up_${id}`, EQUIPMENT[id].icon)}</span>
        <span class="grow"><b>${t(`equip.${id}`)}</b> <small class="${broken ? 'neg' : 'muted'}">${broken ? t('shop.brokenTag') : t('stock.cond', { n: Math.round(c) })}</small>${condBar(c, broken)}</span>
        ${btn}
      </div>`;
    })
    .join('');
}

export function stockModal(g: Game): ModalSpec {
  return {
    wide: true,
    render: () => {
      const st = g.S.stock;
      const old = st.lemons.filter((b) => b.age + 1 >= CONFIG.LEMON_SPOIL_AGE).reduce((n, b) => n + b.n, 0);
      return `<h2>📦 ${t('stock.title')}</h2>
        <h3>${t('stock.goods')}</h3>
        <div class="card">
          <div class="kv"><span>${ico('gd_lemon', '🍋')} ${t('res.lemons')}</span><b>${lemonsTotal(st)}</b></div>
          ${old ? `<small class="neg">${t('stock.oldLemons', { n: old })}</small>` : ''}
          <div class="kv"><span>${ico('gd_water', '💧')} ${t('res.water')}</span><b>${st.water}</b></div>
          <div class="kv"><span>${ico('gd_sugar', '🍬')} ${t('res.sugar')}</span><b>${st.sugar}</b></div>
          <div class="kv"><span>${ico('gd_cups', '🥤')} ${t('res.cups')}</span><b>${st.cups}</b></div>
          ${g.S.upgrades.freezer ? `<div class="kv"><span>${ico('gd_ice', '❄️')} ${t('res.ice')}</span><b>${st.ice ?? 0}</b></div>` : ''}
          <div class="note">${ico('gd_ready', '🥛')} ${t('stock.lemonade', { n: g.D.cupsReady })} · ${ico('gd_pitcher', '🏺')} ${t('stock.canMake', { n: g.maxPitchersNow() })}</div>
        </div>
        <h3>${t('stock.equipment')}</h3>
        ${equipmentRows(g, 'repair')}
        <p class="note">${t('stock.note')}</p>
        <div class="modal-actions"><button class="btn btn-y" data-act="close">${t('btn.close')}</button></div>`;
    },
    act: (act, arg) => {
      if (act === 'repair') g.repair(arg as EquipId);
      return act === 'close';
    },
  };
}
