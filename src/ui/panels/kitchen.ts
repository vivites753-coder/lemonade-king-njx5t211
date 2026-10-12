// Kitchen mini-game: drag ingredients into the jug, then mix. Built once and updated in place,
// because drag & drop and holding the mixer button must not be interrupted by re-renders.
import { CONFIG } from '../../core/config';
import { t } from '../../i18n';
import { lemonsConsumed, quality, tasteBalance, tasteKey } from '../../sim/economy';
import { mixerBroken } from '../../sim/equipment';
import type { Game, KitchenItem } from '../../sim/game';
import { coin, fmtHour, round1 } from '../dom';
import type { Panel, UIApi } from './types';

const ITEMS: { id: KitchenItem; icon: string; target: 'juicer' | 'jug' }[] = [
  { id: 'lemon', icon: '🍋', target: 'juicer' },
  { id: 'water', icon: '💧', target: 'jug' },
  { id: 'sugar', icon: '🍬', target: 'jug' },
];

/** Mixer meter: 0..1 fills while holding; release between these marks for a perfect mix. */
const PERFECT_FROM = 0.7;
const PERFECT_TO = 1.05;
const OVERFLOW = 1.3;
const FILL_PER_SEC = 0.65;

let pitchers = 2;
/** The player changed the number of pitchers by hand (otherwise we suggest 2). */
let pitchersTouched = false;
let holdRaf = 0;
let cleanup: (() => void) | null = null;

function q<T extends HTMLElement = HTMLElement>(el: HTMLElement, sel: string): T {
  return el.querySelector(sel) as T;
}

function bump(el: Element | null, cls = 'bump'): void {
  if (!el) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}

function addItem(g: Game, ui: UIApi, el: HTMLElement, item: KitchenItem): void {
  const r = g.kitchenAdd(item);
  if (r === 'ok') {
    bump(q(el, item === 'lemon' ? '.k-juicer' : '.k-jug'));
    if (item === 'lemon') bump(q(el, '.k-jug'), 'drip');
  } else if (r === 'full') ui.toast(t('kitchen.full'), 'warn');
  else if (r === 'noStock') ui.toast(t('kitchen.noStock'), 'warn');
}

function startDrag(e: PointerEvent, g: Game, ui: UIApi, el: HTMLElement, src: HTMLElement): void {
  const item = src.dataset.item as KitchenItem;
  const def = ITEMS.find((i) => i.id === item)!;
  const x0 = e.clientX;
  const y0 = e.clientY;
  let ghost: HTMLElement | null = null;
  let over: HTMLElement | null = null;
  const move = (ev: PointerEvent) => {
    if (!ghost && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) {
      ghost = document.createElement('div');
      ghost.className = 'k-ghost';
      ghost.textContent = def.icon;
      document.body.appendChild(ghost);
    }
    if (!ghost) return;
    ghost.style.left = `${ev.clientX}px`;
    ghost.style.top = `${ev.clientY}px`;
    const hit = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('[data-drop]') ?? null;
    if (hit !== over) {
      over?.classList.remove('over');
      over = hit;
      over?.classList.add('over');
    }
  };
  const up = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    over?.classList.remove('over');
    if (!ghost) {
      // a simple tap adds the ingredient where it belongs
      addItem(g, ui, el, item);
      return;
    }
    ghost.remove();
    const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('[data-drop]');
    if (!target) return;
    if (item === 'lemon' && target.dataset.drop !== 'juicer') {
      ui.toast(t('tip.kitchen'), 'info');
      bump(q(el, '.k-juicer'), 'hint');
      return;
    }
    if (item !== 'lemon' && target.dataset.drop !== 'jug') return;
    addItem(g, ui, el, item);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

function startHold(g: Game, el: HTMLElement): void {
  if (g.D.kitchen.mix !== 'none' || !g.kitchenCanMix()) return;
  if (g.S.upgrades.mixer_pro) {
    q(el, '.k-jug').classList.add('swirl');
    setTimeout(() => {
      q(el, '.k-jug').classList.remove('swirl');
      g.kitchenMix('perfect');
    }, 600);
    return;
  }
  const needle = q(el, '.k-needle');
  const jug = q(el, '.k-jug');
  let p = 0;
  let last = performance.now();
  let done = false;
  jug.classList.add('swirl');
  const finish = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(holdRaf);
    jug.classList.remove('swirl');
    window.removeEventListener('pointerup', finish);
    window.removeEventListener('pointercancel', finish);
    const result = p < PERFECT_FROM ? 'under' : p <= PERFECT_TO ? 'perfect' : 'over';
    if (result === 'over') bump(q(el, '.k-splash'), 'show');
    g.kitchenMix(result);
  };
  const tick = (now: number) => {
    p += ((now - last) / 1000) * FILL_PER_SEC;
    last = now;
    needle.style.left = `${Math.min(100, (p / OVERFLOW) * 100)}%`;
    if (p >= OVERFLOW) finish();
    else holdRaf = requestAnimationFrame(tick);
  };
  holdRaf = requestAnimationFrame(tick);
  window.addEventListener('pointerup', finish);
  window.addEventListener('pointercancel', finish);
}

export const kitchenPanel: Panel = {
  id: 'kitchen',
  dock: false,
  wide: true,
  render: () => '',
  act: () => undefined,

  mount(el, g, ui) {
    pitchers = 2;
    pitchersTouched = false;
    const zoneL = (PERFECT_FROM / OVERFLOW) * 100;
    const zoneW = ((PERFECT_TO - PERFECT_FROM) / OVERFLOW) * 100;
    el.innerHTML = `<div class="panel kitchen">
      <div class="panel-head"><h2 data-k="title"></h2><span class="chip coins" data-k="coins"></span></div>
      <div class="panel-body">
        <div class="k-hint">👆 ${t('kitchen.hint')}</div>
        <div class="k-stage">
          <div class="k-shelf">
            <div class="k-label">${t('kitchen.shelf')}</div>
            ${ITEMS.map((i) => `<button class="k-item" data-item="${i.id}"><span class="k-ico">${i.icon}</span><b>${t(`kitchen.${i.id}`)}</b><small data-k="left-${i.id}"></small></button>`).join('')}
          </div>
          <div class="k-center">
            <div class="k-juicer" data-drop="juicer"><div class="k-cone"></div><div class="k-base"></div><small>${t('kitchen.juicer')}</small></div>
            <div class="k-jug" data-drop="jug">
              <div class="k-liquid" data-k="liquid"></div>
              <div class="k-grains" data-k="grains"></div>
              <div class="k-handle"></div>
              <div class="k-splash">💦💦💦</div>
            </div>
            <div class="k-counts" data-k="counts"></div>
          </div>
          <div class="k-mix">
            <div class="k-label">${t('kitchen.mixer')}</div>
            <div class="k-meter"><i class="k-zone" style="left:${zoneL}%;width:${zoneW}%"></i><i class="k-needle"></i></div>
            <button class="k-mixer-btn" data-k="mixbtn"></button>
            <div class="k-mix-status" data-k="mixstatus"></div>
            <div class="taste"><i data-k="taste"></i></div>
            <div class="taste-labels"><span>🍋</span><b data-k="tastelabel"></b><span>🍬</span></div>
          </div>
        </div>
        <div class="k-tools">
          <button class="btn btn-sm btn-b" data-kact="repeat">🔁 ${t('kitchen.repeat')}</button>
          <button class="btn btn-sm" data-kact="reset">↺ ${t('kitchen.reset')}</button>
          <button class="btn btn-sm" data-kact="market">🛒 ${t('prep.market', { h: g.tripHours() })}</button>
          <button class="btn btn-sm" data-kact="rest">😴 ${t('morning.rest')}</button>
        </div>
      </div>
      <div class="panel-foot k-foot">
        <div class="k-pour">
          <span>${t('kitchen.pitchers')}</span>
          <span class="stepper">
            <button class="btn" data-kact="minus" aria-label="−">−</button>
            <b data-k="pitchers"></b>
            <button class="btn btn-y" data-kact="plus" aria-label="+">+</button>
          </span>
          <small data-k="pourinfo"></small>
        </div>
        <button class="btn btn-g btn-big" data-kact="pour" data-k="pourbtn">🥛 ${t('kitchen.pour')}</button>
        <button class="btn" data-kact="stand" data-k="standbtn">▶ ${t('kitchen.toStand')}</button>
      </div>
    </div>`;

    const onDown = (e: PointerEvent) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('.k-item');
      if (item && !(item as HTMLButtonElement).disabled) {
        e.preventDefault();
        startDrag(e, g, ui, el, item);
        return;
      }
      const mix = (e.target as HTMLElement).closest<HTMLElement>('.k-mixer-btn');
      if (mix && !(mix as HTMLButtonElement).disabled) {
        e.preventDefault();
        if (mixerBroken(g.S)) {
          if (g.kitchenStir()) bump(q(el, '.k-jug'), 'swirl-once');
          else bump(q(el, '.k-jug'), 'swirl-once');
        } else startHold(g, el);
      }
    };
    const onClick = (e: MouseEvent) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-kact]');
      if (!b || (b as HTMLButtonElement).disabled) return;
      const act = b.dataset.kact;
      if (act === 'repeat') g.kitchenRepeat();
      if (act === 'reset') g.kitchenReset();
      if (act === 'minus' || act === 'plus') pitchersTouched = true;
      if (act === 'minus') pitchers = Math.max(1, pitchers - 1);
      if (act === 'plus') pitchers = Math.min(Math.max(1, g.kitchenMaxPitchers()), pitchers + 1);
      if (act === 'pour') g.kitchenPour(pitchers);
      if (act === 'stand') g.leaveKitchen();
      if (act === 'market') g.goMarket();
      if (act === 'rest') ui.confirm(t('morning.restConfirm'), () => g.restDay());
      if (act === 'minus' || act === 'plus') kitchenPanel.update!(el, g, ui);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('click', onClick);
    cleanup = () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('click', onClick);
      cancelAnimationFrame(holdRaf);
    };
    kitchenPanel.update!(el, g, ui);
  },

  unmount() {
    cleanup?.();
    cleanup = null;
  },

  update(el, g) {
    const k = g.D.kitchen;
    const set = (key: string, html: string) => {
      const n = q(el, `[data-k="${key}"]`);
      if (n && n.innerHTML !== html) n.innerHTML = html;
    };
    set('title', `🍳 ${t('kitchen.title', { time: fmtHour(g.D.hour) })}`);
    set('coins', coin(g.S.coins));
    const st = g.S.stock;
    const have: Record<KitchenItem, number> = {
      lemon: st.lemons.reduce((n, b) => n + b.n, 0),
      water: st.water,
      sugar: st.sugar,
    };
    for (const i of ITEMS) {
      set(`left-${i.id}`, t('kitchen.left', { n: have[i.id] }));
      const btn = q<HTMLButtonElement>(el, `.k-item[data-item="${i.id}"]`);
      const can = g.kitchenCanAdd(i.id);
      btn.disabled = can !== 'ok';
      btn.title = can === 'full' ? t('kitchen.full') : can === 'noStock' ? t('kitchen.noStock') : '';
    }
    // jug contents
    const fill = Math.min(95, k.water * 32 + k.juice * 5);
    const juiceShare = k.water + k.juice > 0 ? k.juice / (k.juice + k.water * 2) : 0;
    const liquid = q(el, '[data-k="liquid"]');
    liquid.style.height = `${fill}%`;
    liquid.style.background = `linear-gradient(180deg, rgba(255,${Math.round(236 - 40 * juiceShare)},${Math.round(200 - 170 * juiceShare)},0.9), rgba(255,${Math.round(220 - 40 * juiceShare)},${Math.round(160 - 140 * juiceShare)},0.95))`;
    set('grains', k.mix === 'none' ? '•'.repeat(k.sugar * 3) : '');
    const lemonsUse = k.juice ? lemonsConsumed({ lemons: k.juice, sugar: k.sugar }, g.active()) : 0;
    set(
      'counts',
      `<span>🍋 ${t('kitchen.juice')}: <b>${k.juice}</b></span><span>💧 ${t('kitchen.waterN')}: <b>${k.water}/${CONFIG.WATER_PER_PITCHER}</b></span><span>🍬 ${t('kitchen.sugarN')}: <b>${k.sugar}</b></span>` +
        (k.juice && lemonsUse !== k.juice ? `<small>⚙️ ${t('kitchen.lemonsUse', { n: lemonsUse })}</small>` : ''),
    );
    // taste
    const r = { lemons: k.juice, sugar: k.sugar };
    const pos = k.juice ? Math.max(5, Math.min(95, 50 - tasteBalance(r) * 12)) : 50;
    q(el, '[data-k="taste"]').style.left = `${pos}%`;
    set('tastelabel', k.juice ? t(tasteKey(r)) + (quality(r) >= 0.99 ? ' ⭐' : '') : '—');
    // mixer
    const broken = mixerBroken(g.S);
    const canMix = g.kitchenCanMix();
    const mixBtn = q<HTMLButtonElement>(el, '[data-k="mixbtn"]');
    mixBtn.disabled = !canMix || k.mix !== 'none';
    mixBtn.classList.toggle('stir', broken);
    set('mixbtn', broken ? `🥄 ${t('kitchen.stir')}<small>${k.stir}/${CONFIG.STIR_TAPS}</small>` : `🌀 ${t('kitchen.mixer')}<small>${g.S.upgrades.mixer_pro ? '✨' : t('kitchen.hold')}</small>`);
    q(el, '.k-meter').classList.toggle('hidden', broken || !!g.S.upgrades.mixer_pro);
    if (k.mix === 'none') q(el, '.k-needle').style.left = '0%';
    const status = !canMix
      ? k.water < CONFIG.WATER_PER_PITCHER
        ? `💧 ${t('kitchen.needWater')}`
        : `🍋 ${t('kitchen.needLemon')}`
      : k.mix === 'none'
        ? broken
          ? `⚠️ ${t('kitchen.mixerBroken')}`
          : t('kitchen.mixNone')
        : t(`kitchen.mix${k.mix[0].toUpperCase()}${k.mix.slice(1)}`);
    set('mixstatus', status);
    q(el, '[data-k="mixstatus"]').className = `k-mix-status ${k.mix === 'perfect' ? 'pos' : k.mix === 'none' ? '' : 'neg'}`;
    // pouring
    const max = g.kitchenMaxPitchers();
    if (!pitchersTouched) pitchers = Math.min(2, Math.max(1, max));
    pitchers = Math.max(1, Math.min(pitchers, Math.max(1, max)));
    set('pitchers', String(pitchers));
    const hours = g.kitchenHours(pitchers, k.hand || broken);
    set(
      'pourinfo',
      max < 1 && k.juice > 0 && st.cups < CONFIG.CUPS_PER_PITCHER
        ? `<span class="neg">${t('kitchen.noCups')}</span>`
        : `= ${pitchers * CONFIG.CUPS_PER_PITCHER} 🥤 · ⏱ ${t('kitchen.time', { t: round1(hours) })} · ${t('prep.max', { n: max })}`,
    );
    const pourBtn = q<HTMLButtonElement>(el, '[data-k="pourbtn"]');
    pourBtn.disabled = k.mix === 'none' || max < 1;
    pourBtn.classList.toggle('ready', !pourBtn.disabled);
    q<HTMLButtonElement>(el, '[data-k="standbtn"]').classList.toggle('hidden', g.D.cupsReady < 1);
    q<HTMLButtonElement>(el, '[data-kact="market"]').disabled = !g.canGoMarket();
  },
};
