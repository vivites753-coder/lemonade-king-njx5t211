// Always-visible stock panel (left edge) and the "Stock and equipment" dialog.
import { CONFIG } from '../core/config';
import type { EquipId, Phase } from '../core/types';
import { EQUIPMENT } from '../data/equipment';
import { t } from '../i18n';
import { ownedEquipment } from '../sim/equipment';
import type { Game } from '../sim/game';
import { lemonsTotal } from '../sim/state';
import { coin, esc } from './dom';
import type { ModalSpec } from './overlays';

const ROWS: { key: string; icon: string; label: string }[] = [
  { key: 'lemons', icon: '🍋', label: 'res.lemons' },
  { key: 'water', icon: '💧', label: 'res.water' },
  { key: 'sugar', icon: '🍬', label: 'res.sugar' },
  { key: 'cups', icon: '🥤', label: 'res.cups' },
  { key: 'ready', icon: '🥛', label: 'res.ready' },
  { key: 'make', icon: '🏺', label: 'res.canMake' },
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
    this.root.title = t('res.open');
    this.root.innerHTML =
      `<div class="res-head">${t('res.title')}</div>` +
      ROWS.map((r) => `<div class="res-row" data-row="${r.key}" title="${esc(t(r.label))}"><span class="ri">${r.icon}</span><b data-r="${r.key}"></b></div>`).join('') +
      `<div class="res-row res-warn" data-row="broken" title="${esc(t('res.broken'))}"><span class="ri">🔧</span><b data-r="broken"></b></div>` +
      `<div class="res-row" data-row="helper" title="${esc(t('res.helper'))}"><span class="ri">🍳</span><b>✓</b></div>`;
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

  update(phase: Phase): void {
    this.root.classList.toggle('hidden', phase === 'title');
    if (phase === 'title') return;
    const g = this.g;
    const st = g.S.stock;
    const market = phase === 'market';
    const w = market ? g.stockWithCart() : { lemons: lemonsTotal(st), water: st.water, sugar: st.sugar, cups: st.cups };
    const plus = (now: number, after: number) => (market && after > now ? ` <small class="pos">+${after - now}</small>` : '');
    const old = st.lemons.filter((b) => b.age + 1 >= CONFIG.LEMON_SPOIL_AGE).reduce((n, b) => n + b.n, 0);
    this.set('lemons', `${lemonsTotal(st)}${plus(lemonsTotal(st), w.lemons)}${old ? ` <small class="neg">⚠${old}</small>` : ''}`);
    this.set('water', `${st.water}${plus(st.water, w.water)}`);
    this.set('sugar', `${st.sugar}${plus(st.sugar, w.sugar)}`);
    this.set('cups', `${st.cups}${plus(st.cups, w.cups)}`);
    const ready = g.D.cupsReady;
    this.set('ready', String(ready));
    this.show('ready', ready > 0 || phase === 'sell' || phase === 'prepare');
    const canMake = market ? g.pitchersWithCart() : g.maxPitchersNow();
    this.set('make', `×${canMake}`);
    const broken = Object.keys(g.S.broken) as EquipId[];
    this.set('broken', broken.map((id) => EQUIPMENT[id].icon).join(''));
    this.show('broken', broken.length > 0);
    this.show('helper', g.D.helper);
  }
}

function condBar(c: number, broken: boolean): string {
  const col = broken ? '#fa5252' : c > 60 ? '#51cf66' : c > 35 ? '#fab005' : '#fa5252';
  return `<div class="cond"><i style="width:${broken ? 100 : Math.round(c)}%;background:${col}"></i></div>`;
}

export function equipmentRows(g: Game, mode: 'repair' | 'shop'): string {
  return ownedEquipment(g.S)
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
        <span class="ico">${EQUIPMENT[id].icon}</span>
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
          <div class="kv"><span>🍋 ${t('res.lemons')}</span><b>${lemonsTotal(st)}</b></div>
          ${old ? `<small class="neg">${t('stock.oldLemons', { n: old })}</small>` : ''}
          <div class="kv"><span>💧 ${t('res.water')}</span><b>${st.water}</b></div>
          <div class="kv"><span>🍬 ${t('res.sugar')}</span><b>${st.sugar}</b></div>
          <div class="kv"><span>🥤 ${t('res.cups')}</span><b>${st.cups}</b></div>
          <div class="note">🥛 ${t('stock.lemonade', { n: g.D.cupsReady })} · 🏺 ${t('stock.canMake', { n: g.maxPitchersNow() })}</div>
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
