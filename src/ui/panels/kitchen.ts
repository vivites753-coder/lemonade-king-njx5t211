// Kitchen mini-game: drag ingredients into the jug, mix, pour one pitcher, and repeat for the next one.
// Built once and updated in place, because drag & drop and holding the mixer button must not be
// interrupted by re-renders. Opens before selling and, when the lemonade runs out, in the middle of the day.
import { CONFIG } from '../../core/config';
import { t } from '../../i18n';
import { quality, tasteBalance, tasteKey } from '../../sim/economy';
import { mixerBroken } from '../../sim/equipment';
import type { Game, KitchenItem } from '../../sim/game';
import { coin, fmtDur, fmtHour, ico } from '../dom';
import { coolerBag, cups, dropsArt, itemGhost, jugArt, juicer, kitchenDecor, lemonCrate, mixer, pourFx, readyJug, sceneBg, splashArt, sugarBag, toolkitBox, waterBottles, type JuicerKind } from '../kitchenArt';
import type { Panel, UIApi } from './types';

/** Scene pixels: the scene is 900x600 and is scaled to the panel. Planks of the wall shelf are at PLANKS. */
const SCENE_W = 900;
const PLANKS = [127, 226, 326];
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

let holdRaf = 0;
let cleanup: (() => void) | null = null;
/** Stops a drag or a mixer hold that is still going (the kitchen closes). */
let abortGesture: (() => void) | null = null;
const BUSY_KEYS = ['busylemon', 'busywater', 'busysugar'];
/**
 * Ingredients on their way to the jug belong to the jug of the moment they were taken: "like last time", "start again",
 * pouring or leaving the kitchen start a new jug, and what is still flying then is dropped (it must not land in the
 * new jug).
 */
let jugGen = 0;

function q<T extends HTMLElement = HTMLElement>(el: HTMLElement, sel: string): T {
  return el.querySelector(sel) as T;
}

function bump(el: Element | null, cls = 'bump'): void {
  if (!el) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}

function juicerKind(g: Game): JuicerKind {
  const up = g.active();
  return up.juicer_lever ? 'lever' : up.juicer_hand ? 'hand' : 'none';
}

/** What is still on the shelf: the stock minus what is already in the jug. */
function shelf(g: Game): Record<KitchenItem, number> {
  return g.kitchenLeft();
}

function art(item: KitchenItem, n: number): string {
  return item === 'lemon' ? lemonCrate(n) : item === 'water' ? waterBottles(n) : sugarBag(n);
}

/** Position of an element inside the scene (scene pixels), from the offset chain. */
function inScene(elm: HTMLElement, scene: HTMLElement): { x: number; y: number; w: number; h: number } {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = elm;
  while (n && n !== scene) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y, w: elm.offsetWidth, h: elm.offsetHeight };
}

function flash(el: HTMLElement, sel: string, cls: string, ms: number): void {
  const n = el.querySelector<HTMLElement>(sel);
  if (!n) return;
  n.classList.remove(cls);
  void n.offsetWidth;
  n.classList.add(cls);
  setTimeout(() => n.classList.remove(cls), ms);
}

/** Size of the single thing that is carried (scene pixels). */
const CARRY: Record<KitchenItem, { w: number; h: number }> = {
  lemon: { w: 54, h: 57 },
  water: { w: 44, h: 96 },
  sugar: { w: 74, h: 84 },
};

/** The stream that runs from a tilted bottle or sack into the jug. */
function pourStream(el: HTMLElement, item: 'water' | 'sugar', ms: number): void {
  const scene = q(el, '.k-scene');
  const jug = q(el, '.k-jug');
  const j = inScene(jug, scene);
  const s = q(el, '.k-stream');
  s.className = `k-stream ${item}`;
  s.style.left = `${j.x + j.w / 2 - (item === 'water' ? 6 : 13)}px`;
  s.style.top = `${j.y - 16}px`;
  s.style.height = `${j.h * 0.7 + 16}px`;
  s.animate(
    [
      { transform: 'scaleY(0)', opacity: 1 },
      { transform: 'scaleY(1)', opacity: 1, offset: 0.18 },
      { transform: 'scaleY(1)', opacity: 1, offset: 0.82 },
      { transform: 'scaleY(1)', opacity: 0 },
    ],
    { duration: ms, easing: 'linear' },
  );
  // water splash or sugar puff where it lands
  const puff = q(el, '.k-puff');
  puff.innerHTML = pourFx(item);
  puff.style.left = `${j.x + j.w / 2 - 35}px`;
  puff.style.top = `${j.y + j.h * 0.25}px`;
  puff.animate(
    [
      { opacity: 0, transform: 'scale(0.4)' },
      { opacity: 0.95, transform: 'scale(1)', offset: 0.25 },
      { opacity: 0.95, transform: 'scale(1.12)', offset: 0.8 },
      { opacity: 0, transform: 'scale(1.3)' },
    ],
    { duration: ms, easing: 'ease-out' },
  );
}

/**
 * One lemon flies to the juicer; a bottle is lifted over the jug, tilted, and the water runs out;
 * a sack is lifted, tilted and the sugar pours out. `apply` puts the ingredient into the jug at the right moment.
 */
function addAnimated(el: HTMLElement, item: KitchenItem, apply: () => void): void {
  const scene = q(el, '.k-scene');
  const from = q(el, `.k-item[data-item="${item}"] .k-art`);
  const target = q(el, item === 'lemon' ? '.k-juicer' : '.k-jug');
  if (!from || !target || !from.animate || document.body.classList.contains('reduce-motion')) {
    apply();
    return;
  }
  const a = inScene(from, scene);
  const b = inScene(target, scene);
  const size = CARRY[item];
  const sx = a.x + a.w / 2 - 6;
  const sy = a.y + a.h / 2;
  const f = document.createElement('div');
  f.className = 'k-fly';
  f.style.cssText = `left:${sx - size.w / 2}px;top:${sy - size.h / 2}px;width:${size.w}px;height:${size.h}px`;
  f.innerHTML = itemGhost(item);
  scene.appendChild(f);
  const busyKey = `busy${item}`;
  el.dataset[busyKey] = '1';
  if (item === 'lemon') {
    const tx = b.x + b.w / 2 - sx;
    const ty = b.y + b.h * 0.3 - sy;
    const LEMON_MS = 480;
    f.animate(
      [
        { transform: 'translate(0,0) scale(1) rotate(0)' },
        { transform: `translate(${tx * 0.5}px,${Math.min(0, ty) - 70}px) scale(0.95) rotate(-90deg)`, offset: 0.5 },
        { transform: `translate(${tx}px,${ty}px) scale(0.6) rotate(-200deg)`, opacity: 0.9 },
      ],
      { duration: LEMON_MS, easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'forwards' },
    );
    setTimeout(() => {
      f.remove();
      delete el.dataset[busyKey];
      apply();
    }, LEMON_MS);
    return;
  }
  // bottle / sack: its centre goes above the jug mouth, a bit to the left, so that the neck points into the jug
  // the neck of the tilted bottle (or the mouth of the sack) is about 43 px right of its centre
  const tx = b.x + b.w / 2 - 43 - sx;
  const ty = b.y - 36 - sy;
  const mx = tx * 0.6;
  const my = ty - 50;
  const DUR = 1500;
  const tilt = item === 'water' ? 105 : 112;
  const anim = f.animate(
    [
      { transform: 'translate(0,0) rotate(0) scale(1)', easing: 'ease-out' },
      { transform: `translate(${mx}px,${my}px) rotate(0) scale(1.1)`, offset: 0.3, easing: 'ease-in-out' },
      { transform: `translate(${tx}px,${ty}px) rotate(${tilt}deg) scale(1.1)`, offset: 0.52 },
      { transform: `translate(${tx}px,${ty}px) rotate(${tilt + 6}deg) scale(1.1)`, offset: 0.86, easing: 'ease-in-out' },
      { transform: 'translate(0,0) rotate(0) scale(1)' },
    ],
    { duration: DUR },
  );
  setTimeout(() => pourStream(el, item as 'water' | 'sugar', DUR * 0.36), DUR * 0.5);
  setTimeout(apply, DUR * 0.62);
  // the bottle goes back to its shelf (on a timer too: the animation of a hidden tab may never finish)
  const done = () => {
    f.remove();
    delete el.dataset[busyKey];
  };
  anim.onfinish = done;
  anim.oncancel = done;
  setTimeout(done, DUR + 50);
}

function addItem(g: Game, ui: UIApi, el: HTMLElement, item: KitchenItem): void {
  const can = g.kitchenCanAdd(item);
  if (can === 'full') {
    ui.toast(t('kitchen.full'), 'warn');
    return;
  }
  if (can === 'noStock') {
    ui.toast(t('kitchen.noStock'), 'warn');
    return;
  }
  // a bottle or a sack is already on its way
  if (el.dataset[`busy${item}`]) return;
  const gen = jugGen;
  addAnimated(el, item, () => {
    // the jug was started again meanwhile: this one does not go in
    if (gen !== jugGen) return;
    const r = g.kitchenAdd(item);
    if (r === 'full') ui.toast(t('kitchen.full'), 'warn');
    else if (r === 'noStock') ui.toast(t('kitchen.noStock'), 'warn');
    else if (r === 'ok') {
      if (item === 'lemon') {
        bump(q(el, '.k-juicer'), 'k-squeeze');
        flash(el, '.k-drops', 'show', 700);
        bump(q(el, '.k-jug'), 'drip');
      } else {
        bump(q(el, '.k-jug'), 'k-bump');
      }
    }
  });
}

function startDrag(e: PointerEvent, g: Game, ui: UIApi, el: HTMLElement, src: HTMLElement): void {
  const item = src.dataset.item as KitchenItem;
  const x0 = e.clientX;
  const y0 = e.clientY;
  let ghost: HTMLElement | null = null;
  let over: HTMLElement | null = null;
  const move = (ev: PointerEvent) => {
    if (!ghost && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) {
      ghost = document.createElement('div');
      ghost.className = 'k-ghost';
      ghost.innerHTML = itemGhost(item);
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
  const stop = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    over?.classList.remove('over');
    if (abortGesture === stopAll) abortGesture = null;
  };
  const stopAll = () => {
    stop();
    ghost?.remove();
    ghost = null;
  };
  const up = (ev: PointerEvent) => {
    stop();
    if (ev.type === 'pointercancel') {
      ghost?.remove();
      return;
    }
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
      bump(q(el, '.k-juicer'), 'k-hintpulse');
      return;
    }
    if (item !== 'lemon' && target.dataset.drop !== 'jug') return;
    addItem(g, ui, el, item);
  };
  abortGesture?.();
  abortGesture = stopAll;
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

/** The mixer rises from its shelf, goes into the jug (on = true) or comes back to the shelf. */
function mixerFly(el: HTMLElement, on: boolean): void {
  const mx = q(el, '.k-mixer');
  if (!on) {
    mx.style.transform = '';
    mx.classList.remove('in');
    return;
  }
  const scene = q(el, '.k-scene');
  const jug = q(el, '.k-jug');
  const a = inScene(mx, scene);
  const b = inScene(jug, scene);
  // the beaters (lower left of the picture) go into the liquid
  const tx = b.x + b.w * 0.5 - (a.x + a.w * 0.5) + 10;
  const ty = b.y + b.h * 0.1 - (a.y + a.h * 0.5);
  mx.style.transform = `translate(${tx}px,${ty}px) rotate(-8deg) scale(0.92)`;
  mx.classList.add('in');
}

function startHold(g: Game, el: HTMLElement): void {
  if (g.D.kitchen.mix !== 'none' || !g.kitchenCanMix()) return;
  const jug = q(el, '.k-jug');
  if (g.S.upgrades.mixer_pro) {
    mixerFly(el, true);
    q(el, '.k-mixer-art').classList.add('buzz');
    setTimeout(() => jug.classList.add('swirl'), 450);
    setTimeout(() => {
      jug.classList.remove('swirl');
      q(el, '.k-mixer-art').classList.remove('buzz');
      mixerFly(el, false);
      g.kitchenMix('perfect');
    }, 1250);
    return;
  }
  const needle = q(el, '.k-needle');
  needle.classList.add('on');
  let p = 0;
  let last = performance.now();
  let done = false;
  mixerFly(el, true);
  setTimeout(() => {
    if (!done) {
      jug.classList.add('swirl');
      q(el, '.k-mixer-art').classList.add('buzz');
    }
  }, 380);
  const finish = (ev?: Event | 'abort') => {
    if (done) return;
    done = true;
    if (abortGesture === abort) abortGesture = null;
    cancelAnimationFrame(holdRaf);
    needle.classList.remove('on');
    jug.classList.remove('swirl');
    q(el, '.k-mixer-art').classList.remove('buzz');
    mixerFly(el, false);
    window.removeEventListener('pointerup', finish);
    window.removeEventListener('pointercancel', finish);
    if (ev === 'abort') return;
    const result = p < PERFECT_FROM ? 'under' : p <= PERFECT_TO ? 'perfect' : 'over';
    if (result === 'over') flash(el, '.k-splash', 'show', 1200);
    g.kitchenMix(result);
  };
  const tick = (now: number) => {
    p += ((now - last) / 1000) * FILL_PER_SEC;
    last = now;
    needle.style.left = `${Math.min(100, (p / OVERFLOW) * 100)}%`;
    if (p >= OVERFLOW) finish();
    else holdRaf = requestAnimationFrame(tick);
  };
  const abort = () => finish('abort');
  abortGesture?.();
  abortGesture = abort;
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
    for (const k of BUSY_KEYS) delete el.dataset[k];
    const zoneL = (PERFECT_FROM / OVERFLOW) * 100;
    const zoneW = ((PERFECT_TO - PERFECT_FROM) / OVERFLOW) * 100;
    const mid = g.midKitchen;
    const up = g.S.upgrades;
    const jk = juicerKind(g);
    const juicerLabel = jk === 'lever' ? t('kitchen.juicerLever') : jk === 'hand' ? t('kitchen.juicer') : t('kitchen.juicerHands');
    const hasBg = !!sceneBg();
    const mixKind = mixerBroken(g.S) ? 'broken' : up.mixer_pro ? 'pro' : 'basic';
    const jugPic = jugArt();
    el.innerHTML = `<div class="panel kitchen${mid ? ' mid' : ''}">
      <div class="panel-head"><h2 data-k="title"></h2><span class="chip coins" data-k="coins"></span></div>
      <div class="panel-body">
        <div class="k-hint">👆 ${t('kitchen.hint')}</div>
        <div class="k-main">
          <div class="k-wrap" data-k="wrap">
            <div class="k-scene${hasBg ? ' has-bg' : ''}">
              ${hasBg ? sceneBg() : '<div class="k-bg"></div><div class="k-counter"></div>'}
              <div class="k-decor" style="inset:0" aria-hidden="true">${kitchenDecor()}</div>
              ${PLANKS.map((y) => `<div class="k-plank" style="top:${y}px"></div>`).join('')}<div class="k-plank m" style="top:306px"></div>
              ${ITEMS.map(
                (i, n) => `<button class="k-item" data-item="${i.id}" style="left:68px;top:${PLANKS[n] + 3 - 96}px"><span class="k-art" data-k="art-${i.id}"></span>
                  <span class="k-meta"><b>${t(`kitchen.${i.id}`)}</b><small data-k="left-${i.id}"></small></span></button>`,
              ).join('')}
              <div class="k-mixer${mixKind === 'pro' ? ' pro' : ''}${mixKind === 'broken' ? ' off' : ''}" data-k="mixer"><div class="k-mixer-art">${mixer(mixKind)}</div></div>
              <div class="k-juicer" data-drop="juicer"><span class="k-tool-art">${juicer(jk)}</span></div>
              <div class="k-cap">${juicerLabel}</div>
              <div class="k-meter"><i class="k-zone" style="left:${zoneL}%;width:${zoneW}%"></i><i class="k-needle"></i></div>
              <div class="k-jug${jugPic ? ' has-art' : ''}" data-drop="jug">
                ${jugPic}
                <div class="k-liq-clip"><div class="k-liquid" data-k="liquid"></div><div class="k-grains" data-k="grains"></div></div>
              </div>
              <div class="k-glass${jugPic ? ' has-art' : ''}">${jugPic}</div>
              <div class="k-drops">${dropsArt()}</div>
              <div class="k-splash">${splashArt()}</div>
              <div class="k-stream" data-k="stream"></div>
              <div class="k-puff" data-k="puff"></div>
              <div class="k-spoon" data-k="spoon">🥄</div>
              <div class="k-cups-art" data-k="cupsart"></div>
              <div class="k-ready" data-k="ready"></div>
              ${up.cooler ? `<span class="k-cooler" title="${t('up.cooler.name')}">${coolerBag()}<b data-k="cooler"></b></span>` : ''}
              ${up.toolkit ? `<span class="k-toolkit" title="${t('up.toolkit.name')}">${toolkitBox()}</span>` : ''}
            </div>
          </div>
          <div class="k-side">
            <div class="k-counts" data-k="counts"></div>
            <div class="k-mixrow">
              <button class="k-mixer-btn" data-k="mixbtn"></button>
              <div class="k-mix-status" data-k="mixstatus"></div>
              <div>
                <div class="taste"><i data-k="taste"></i></div>
                <div class="taste-labels"><span>🍋</span><b data-k="tastelabel"></b><span>🍬</span></div>
              </div>
            </div>
            <div class="k-tools">
              <button class="btn btn-sm btn-b" data-kact="repeat">🔁 ${t('kitchen.repeat')}</button>
              <button class="btn btn-sm" data-kact="reset">↺ ${t('kitchen.reset')}</button>
              ${
                mid
                  ? ''
                  : `<button class="btn btn-sm" data-kact="market">${ico('gd_market', '🛒')} ${t('prep.market', { t: fmtDur(g.tripHours()) })}</button>
              <button class="btn btn-sm" data-kact="rest">😴 ${t('morning.rest')}</button>`
              }
            </div>
          </div>
        </div>
      </div>
      <div class="panel-foot k-foot">
        <div class="k-pour"><b data-k="jugs"></b><small data-k="pourinfo"></small></div>
        <button class="btn btn-g btn-big" data-kact="pour" data-k="pourbtn">🥛 ${t('kitchen.pourOne')}</button>
        <button class="btn" data-kact="stand" data-k="standbtn">${mid ? `↩ ${t('kitchen.toStandMid')}` : `▶ ${t('kitchen.toStand')}`}</button>
      </div>
    </div>`;

    // the scene has a fixed size and is scaled to the space it gets
    const wrap = q(el, '.k-wrap');
    const fit = () => {
      const w = wrap.clientWidth;
      if (w > 0) wrap.style.setProperty('--ks', String(w / SCENE_W));
    };
    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);

    const onDown = (e: PointerEvent) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('.k-item');
      if (item && !(item as HTMLButtonElement).disabled) {
        e.preventDefault();
        startDrag(e, g, ui, el, item);
        return;
      }
      const mix = (e.target as HTMLElement).closest<HTMLElement>('.k-mixer-btn, .k-mixer');
      if (mix && !(mix as HTMLButtonElement).disabled) {
        e.preventDefault();
        if (mixerBroken(g.S)) {
          if (g.D.kitchen.mix === 'none' && g.kitchenCanMix()) {
            g.kitchenStir();
            bump(q(el, '.k-jug'), 'swirl-once');
            flash(el, '.k-spoon', 'go', 520);
          }
        } else startHold(g, el);
      }
    };
    const onClick = (e: MouseEvent) => {
      const d = (e.target as HTMLElement).closest<HTMLElement>('.k-decor img');
      if (d) {
        d.classList.remove('wiggle');
        void d.offsetWidth;
        d.classList.add('wiggle');
        return;
      }
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-kact]');
      if (!b || (b as HTMLButtonElement).disabled) return;
      const act = b.dataset.kact;
      if (act === 'repeat' || act === 'reset' || act === 'pour' || act === 'stand' || act === 'market' || act === 'rest') jugGen++;
      if (act === 'repeat') g.kitchenRepeat();
      if (act === 'reset') g.kitchenReset();
      if (act === 'pour' && g.kitchenPour()) {
        bump(q(el, '[data-k="jugs"]'));
        flash(el, '.k-jug', 'pour', 950);
      }
      if (act === 'stand') g.leaveKitchen();
      if (act === 'market') g.goMarket();
      if (act === 'rest') ui.confirm(t('morning.restConfirm'), () => g.restDay());
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('click', onClick);
    cleanup = () => {
      jugGen++;
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('click', onClick);
      cancelAnimationFrame(holdRaf);
      abortGesture?.();
      ro?.disconnect();
      for (const k of BUSY_KEYS) delete el.dataset[k];
    };
    kitchenPanel.update!(el, g, ui);
  },

  unmount() {
    cleanup?.();
    cleanup = null;
  },

  update(el, g) {
    const k = g.D.kitchen;
    const mid = g.midKitchen;
    const set = (key: string, html: string) => {
      const n = q(el, `[data-k="${key}"]`);
      if (n && n.innerHTML !== html) n.innerHTML = html;
    };
    set('title', mid ? `🍳 ${t('kitchen.titleMid', { time: fmtHour(g.D.hour) })}` : `🍳 ${t('kitchen.title', { time: fmtHour(g.D.hour) })}`);
    set('coins', coin(g.S.coins));
    const st = g.S.stock;
    const left = shelf(g);
    for (const i of ITEMS) {
      set(`left-${i.id}`, t('kitchen.left', { n: Math.max(0, left[i.id]) }));
      set(`art-${i.id}`, art(i.id, Math.max(0, left[i.id])));
      const btn = q<HTMLButtonElement>(el, `.k-item[data-item="${i.id}"]`);
      const can = g.kitchenCanAdd(i.id);
      btn.disabled = can !== 'ok';
      btn.title = can === 'full' ? t('kitchen.full') : can === 'noStock' ? t('kitchen.noStock') : '';
    }
    set('cupsart', cups(!!g.S.upgrades.branded_cups, st.cups) + `<small>🥤 ${st.cups}</small>`);
    // as many jugs as are prepared: four to a row on the right half of the counter (they overlap a little), the next
    // row stands behind and a little higher, shifted by half a step
    const readyN = Math.min(16, g.D.kitchenJugs);
    const prev = Number(el.dataset.ready ?? 0);
    el.dataset.ready = String(readyN);
    let jugsHtml = '';
    for (let i = readyN - 1; i >= 0; i--) {
      const row = Math.floor(i / 4);
      const cx = 812 - (i % 4) * 63 - (row % 2) * 31;
      const top = 468 - row * 22 - 150;
      jugsHtml += `<span class="k-pj${readyN > prev && i === readyN - 1 ? ' new' : ''}" style="left:${cx - 64}px;top:${top}px">${readyJug()}</span>`;
    }
    set('ready', jugsHtml);
    set('cooler', g.D.cupsReady && g.S.upgrades.cooler ? `🥛 ${g.D.cupsReady}` : '');
    // jug contents
    const fill = Math.min(95, k.water * 32 + k.juice * 5);
    const juiceShare = k.water + k.juice > 0 ? k.juice / (k.juice + k.water * 2) : 0;
    const liquid = q(el, '[data-k="liquid"]');
    liquid.style.height = `${fill}%`;
    liquid.style.background = `linear-gradient(180deg, rgba(255,${Math.round(236 - 40 * juiceShare)},${Math.round(200 - 170 * juiceShare)},0.9), rgba(255,${Math.round(220 - 40 * juiceShare)},${Math.round(160 - 140 * juiceShare)},0.95))`;
    set('grains', k.mix === 'none' ? '•'.repeat(k.sugar * 3) : '');
    const lemonsUse = g.kitchenLemons();
    set(
      'counts',
      `<span>${ico('gd_lemon_half', '🍋')} ${t('kitchen.juice')}: <b>${k.juice}</b></span><span>${ico('gd_water', '💧')} ${t('kitchen.waterN')}: <b>${k.water}/${CONFIG.WATER_PER_PITCHER}</b></span><span>${ico('gd_sugar', '🍬')} ${t('kitchen.sugarN')}: <b>${k.sugar}</b></span>` +
        (k.juice && lemonsUse !== k.juice ? `<small>⚙️ ${t('kitchen.lemonsUse', { n: lemonsUse })}</small>` : ''),
    );
    // taste
    const r = { lemons: k.juice, sugar: k.sugar };
    const pos = k.juice ? Math.max(5, Math.min(95, 50 - tasteBalance(r) * 12)) : 50;
    q(el, '[data-k="taste"]').style.left = `${pos}%`;
    set('tastelabel', k.juice ? t(tasteKey(r)) + (quality(r) >= 0.99 ? ' ⭐' : '') : '—');
    // mixer: it bounces when mixing is the next step
    const broken = mixerBroken(g.S);
    const canMix = g.kitchenCanMix();
    const mixBtn = q<HTMLButtonElement>(el, '[data-k="mixbtn"]');
    mixBtn.disabled = !canMix || k.mix !== 'none';
    mixBtn.classList.toggle('stir', broken);
    q(el, '.k-mixer').classList.toggle('nudge', canMix && k.mix === 'none' && !broken);
    set('mixbtn', broken ? `<span>🥄</span><span>${t('kitchen.stir')}<small>${k.stir}/${CONFIG.STIR_TAPS}</small></span>` : `<span>🌀</span><span>${t('kitchen.mixer')}<small>${g.S.upgrades.mixer_pro ? '✨' : t('kitchen.hold')}</small></span>`);
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
    // pouring: one jug at a time
    const jugs = g.D.kitchenJugs;
    set('jugs', jugs ? t('kitchen.jugs', { n: jugs, c: jugs * CONFIG.CUPS_PER_PITCHER }) : t('kitchen.jugsNone'));
    const max = g.kitchenMaxPitchers();
    const hours = mid ? (CONFIG.PITCHER_TIME * (k.hand || broken ? 2 : 1)) / CONFIG.HOUR_SEC : g.nextJugHours(k.hand || broken);
    set(
      'pourinfo',
      k.juice > 0 && st.cups < CONFIG.CUPS_PER_PITCHER
        ? `<span class="neg">${t('kitchen.noCups')}</span>`
        : `${t('kitchen.nextJug', { t: fmtDur(hours) })}${mid ? ` · ${t('kitchen.midNote')}` : ''}`,
    );
    const pourBtn = q<HTMLButtonElement>(el, '[data-k="pourbtn"]');
    pourBtn.disabled = k.mix === 'none' || max < 1;
    pourBtn.classList.toggle('ready', !pourBtn.disabled);
    q<HTMLButtonElement>(el, '[data-k="standbtn"]').classList.toggle('hidden', !mid && g.D.cupsReady < 1);
    const market = el.querySelector<HTMLButtonElement>('[data-kact="market"]');
    if (market) market.disabled = !g.canGoMarket();
  },
};
