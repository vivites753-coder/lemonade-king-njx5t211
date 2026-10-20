// Heads-up display: top bar (always), funnel card and selling controls (only while selling).
import type { Phase } from '../core/types';
import { t } from '../i18n';
import type { Game } from '../sim/game';
import { payback, pointOpensAt, pointProgress, pointWorkers, skillStars, type Point } from '../sim/points';
import { fmtHour, ico, locIco, round1, signedCoin, stars, weatherIco } from './dom';

/** Phases in which the scene is in view and the player may look at their other stands. */
const VIEW_PHASES: Phase[] = ['morning', 'prepare', 'sell', 'report', 'shop'];

export class Hud {
  private els: Record<string, HTMLElement> = {};
  private cache = new Map<HTMLElement, string>();
  private lastCoins: number | null = null;
  private lastRep: number | null = null;

  private hop(el: Element | null | undefined, cls: string): void {
    if (!el) return;
    el.classList.remove(cls);
    void (el as HTMLElement).offsetWidth;
    el.classList.add(cls);
  }
  private whyOpen = false;
  private whyKey = '';
  private phase: Phase = 'title';

  constructor(
    private root: HTMLElement,
    private g: Game,
    private onAct: (act: string, arg: string) => void,
  ) {
    root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-hud]');
      if (!el || (el as HTMLButtonElement).disabled) return;
      // arranging the buttons: a press moves them, it does not press them
      if (document.documentElement.classList.contains('hud-editing')) return;
      const [act, arg = ''] = el.dataset.hud!.split(':');
      // "Pour" is held, not clicked (see UI.startPour)
      if (act === 'serve') return;
      if (act === 'why') {
        this.whyOpen = !this.whyOpen;
        this.whyKey = '';
        return;
      }
      this.onAct(act, arg);
    });
    this.build();
  }

  build(): void {
    this.root.innerHTML = `
      <div class="hud-top" data-el="top">
        <span class="chip coins" title="coins"><i class="coin"></i><b data-el="coins"></b></span>
        <span class="chip">${ico('day', '📅')} <b data-el="day"></b></span>
        <span class="chip">${ico('clock', '🕐')} <b data-el="clock"></b></span>
        <span class="chip" data-el="weather"></span>
        <span class="chip" data-el="loc"></span>
        <button class="chip chip-btn" data-hud="roadmap" data-el="rep" aria-label="${t('roadmap.title')}" title="${t('roadmap.title')}"></button>
        <span class="spacer"></span>
        <div class="seg" data-el="speed" data-move="speed">
          <button data-hud="speed:0" aria-label="${t('hud.pause')}">${ico('btn_pause', '⏸')}</button>
          <button data-hud="speed:1" aria-label="x1">${ico('btn_play', '▶')}</button>
          <button data-hud="speed:2" aria-label="x2">${ico('btn_fast', '⏩')}</button>
          <button data-hud="speed:3" aria-label="x3">${ico('btn_faster', '⏭')}</button>
        </div>
        <button class="hud-btn hidden" data-hud="stock" data-el="stock" aria-label="${t('res.open')}" title="${t('res.title')}">${ico('btn_stock', '📦')}</button>
        <button class="hud-btn hidden" data-hud="points" data-el="points" aria-label="${t('points.title')}">${ico('pt_stand', '🏪')}</button>
        <button class="hud-btn" data-hud="tip" aria-label="${t('hud.tip')}">${ico('btn_tip', '🍋')}</button>
        <button class="hud-btn" data-hud="glossary" aria-label="${t('hud.glossary')}">${ico('btn_glossary', '📖')}</button>
        <button class="hud-btn" data-hud="sound" data-el="sound" aria-label="${t('hud.sound')}">🔊</button>
        <button class="hud-btn" data-hud="settings" aria-label="${t('btn.settings')}">${ico('btn_settings', '⚙️')}</button>
      </div>
      <div class="hud-views hidden" data-el="views"></div>
      <div class="hud-point hidden" data-el="pointinfo"></div>
      <div class="hud-funnel" data-el="funnel">
        <div class="chance"><small>${t('hud.chance')}</small><b data-el="chance"></b></div>
        <div class="frows">
          <div class="frow">🚶 <span>${t('hud.passed')}</span><b data-el="fpassed"></b></div>
          <div class="frow">✋ <span>${t('hud.stopped')}</span><b data-el="fstopped"></b></div>
          <div class="frow">🥤 <span>${t('hud.sold')}</span><b data-el="fsold"></b></div>
        </div>
        <button class="link-btn" data-hud="why" data-el="whybtn">${t('hud.why')}</button>
        <div class="why hidden" data-el="why"></div>
      </div>
      <div class="hud-bottom" data-el="bottom">
        <div class="hb-left">
          <div class="price-box" data-move="price">
            <button class="btn btn-icon" data-hud="price:-1" aria-label="−">−</button>
            <div class="val"><small>${t('hud.price')}</small><b><i class="coin"></i><span data-el="price"></span></b></div>
            <button class="btn btn-icon btn-y" data-hud="price:1" aria-label="+">+</button>
          </div>
          <button class="btn" data-hud="speaker" data-el="speaker" data-move="speaker"></button>
        </div>
        <button class="serve-btn" data-hud="serve" data-el="serve" data-move="serve">${ico('gd_ready', '🥛')}<small>${t('hud.serve')}</small>
          <span class="pour-gauge" data-el="gauge" aria-hidden="true"><i class="pg-zone"></i><i class="pg-fill"></i><i class="pg-needle"></i></span></button>
        <div class="hb-right">
          <button class="btn btn-sm clean-btn hidden" data-hud="clean" data-el="clean" data-move="clean" aria-label="${t('hud.clean')}" title="${t('hud.cleanTip')}"></button>
          <span class="chip cups-chip" data-el="cups" data-move="cups"></span>
          <button class="btn btn-y" data-hud="make" data-el="make" data-move="make"></button>
          <button class="btn btn-sm" data-hud="end" data-move="end">${ico('btn_sleep', '🌙')}<span class="lbl"> ${t('hud.end')}</span></button>
        </div>
      </div>`;
    this.els = {};
    this.cache.clear();
    for (const el of Array.from(this.root.querySelectorAll<HTMLElement>('[data-el]'))) this.els[el.dataset.el!] = el;
    this.setPhase(this.phase);
    this.setLayout(this.layout);
  }

  private layout: Record<string, [number, number]> = {};

  /** Puts the selling buttons where the player put them (centre as shares of the screen); the others stay in place. */
  setLayout(layout: Record<string, [number, number]>): void {
    this.layout = layout;
    for (const el of Array.from(this.root.querySelectorAll<HTMLElement>('[data-move]'))) {
      const at = layout[el.dataset.move!];
      el.classList.toggle('moved', !!at);
      if (at) {
        el.style.setProperty('--mx', String(Math.min(0.98, Math.max(0.02, at[0]))));
        el.style.setProperty('--my', String(Math.min(0.98, Math.max(0.02, at[1]))));
      } else {
        el.style.removeProperty('--mx');
        el.style.removeProperty('--my');
      }
    }
  }

  /**
   * The gauge of the pouring mini-game by the "Pour" button: the level rises while the button is held; `null` hides
   * it, showing for a moment how the pour ended.
   */
  pourGauge(s: { level: number; lo: number; hi: number } | null, result = ''): void {
    const btn = this.els.serve;
    const gauge = this.els.gauge;
    if (!btn || !gauge) return;
    if (!s) {
      btn.classList.remove('pouring');
      gauge.dataset.res = result;
      return;
    }
    if (!btn.classList.contains('pouring')) {
      // the gauge stands on the side of the button where there is room
      const r = btn.getBoundingClientRect();
      gauge.classList.toggle('right', r.left + r.width / 2 < window.innerWidth / 2);
      gauge.dataset.res = '';
      btn.classList.add('pouring');
    }
    gauge.style.setProperty('--lo', String(s.lo));
    gauge.style.setProperty('--hi', String(s.hi));
    gauge.style.setProperty('--lv', String(Math.min(1, s.level)));
  }

  setPhase(p: Phase): void {
    this.phase = p;
    const selling = p === 'sell';
    this.els.top.classList.toggle('hidden', p === 'title');
    this.els.funnel.classList.toggle('hidden', !selling);
    this.els.bottom.classList.toggle('hidden', !selling);
    this.els.speed.classList.toggle('hidden', !selling);
  }

  private set(key: string, html: string): void {
    const el = this.els[key];
    if (!el || this.cache.get(el) === html) return;
    this.cache.set(el, html);
    el.innerHTML = html;
  }

  /** The Stock button: only while a window covers the stock column on the left. */
  showStock(on: boolean): void {
    this.show('stock', on);
  }

  private show(key: string, on: boolean): void {
    this.els[key]?.classList.toggle('hidden', !on);
  }

  update(userPaused: boolean): void {
    if (this.phase === 'title') return;
    const g = this.g;
    const S = g.S;
    const D = g.D;
    this.set('coins', String(S.coins));
    // the coin hops when money comes in, the star pops when the reputation grows
    if (this.lastCoins !== null && S.coins > this.lastCoins) this.hop(this.els.coins?.parentElement, 'gain');
    if (this.lastRep !== null && S.rep > this.lastRep + 1e-6) this.hop(this.els.rep, 'gain');
    this.lastCoins = S.coins;
    this.lastRep = S.rep;
    // on small screens only the number (the word is hidden like the other labels)
    this.set('day', `<span class="lbl">${t('hud.day', { n: '' }).trim()} </span>${S.day}`);
    this.set('clock', fmtHour(D.hour));
    // .lbl parts are hidden on small screens, .sm parts are shown only there
    this.set('weather', `${weatherIco(D.weather)}<span class="lbl"> ${t(`weather.${D.weather}`)}</span>`);
    this.set('loc', `${locIco(S.location)}<span class="lbl"> ${t(`loc.${S.location}.name`)}</span>`);
    this.set('rep', `<span class="lbl">${stars(S.rep)}</span><span class="sm">${ico('star_full', '⭐')}</span> ${S.rep.toFixed(1)}`);
    this.set('sound', S.settings.sound ? ico('btn_sound_on', '🔊') : ico('btn_sound_off', '🔇'));
    this.show('points', g.pointsOpen() || S.points.length > 0);
    // the other stands: a switch, and a card about the one shown (the controls of the own stand step aside); the store
    // where the player works is the own scene
    const views = S.points.some((p) => p.loc !== S.location) && VIEW_PHASES.includes(this.phase);
    this.show('views', views);
    if (views) this.set('views', this.viewButtons());
    const vp = g.viewPoint !== null ? g.pointById(g.viewPoint) : undefined;
    this.show('pointinfo', !!vp);
    if (vp) this.set('pointinfo', this.pointInfo(vp));
    this.els.funnel.classList.toggle('hidden', this.phase !== 'sell' || !!vp);
    this.els.bottom.classList.toggle('hidden', this.phase !== 'sell' || !!vp);
    if (this.phase !== 'sell') return;

    // speed
    const speedOn = userPaused ? 0 : g.speed;
    for (const b of Array.from(this.els.speed.querySelectorAll('button'))) {
      const v = Number(b.dataset.hud!.split(':')[1]);
      b.classList.toggle('on', v === speedOn);
    }

    // funnel
    const f = D.funnel;
    this.set('chance', `${Math.round(g.interest.chance * 100)}%`);
    this.set('fpassed', String(f.passed));
    this.set('fstopped', String(f.stopped));
    this.set('fsold', String(f.sold));
    this.set('whybtn', `${t('hud.why')} ${this.whyOpen ? '▴' : '▾'}`);
    this.show('why', this.whyOpen);
    if (this.whyOpen) this.renderWhy();

    // controls
    this.set('price', String(S.price));
    this.show('speaker', !!S.upgrades.speaker);
    this.set('speaker', `${S.speakerOn ? ico('btn_sound_on', '🔊') : ico('btn_sound_off', '🔇')}<span class="lbl"> ${t('hud.speaker')}: ${S.speakerOn ? t('hud.on') : t('hud.off')}</span>`);
    // the player can pour at any counter with a customer in front and nobody pouring there
    const counters = [...Array(g.counters()).keys()];
    const front = counters.some((c) => !!g.street.frontReady(c));
    const free = counters.some((c) => !!g.street.frontReady(c) && !g.servings[c]);
    const serveBtn = this.els.serve as HTMLButtonElement;
    const canServe = free && !g.making && g.anyDrinkLeft();
    serveBtn.disabled = !front || !!g.making;
    serveBtn.classList.toggle('ready', canServe);
    // the ring shows the player's own pour (helpers' pours have their own rings over the stand)
    const mine = g.servings.find((x) => x && !x.helper) ?? null;
    serveBtn.style.setProperty('--p', mine ? String(Math.min(1, mine.t / mine.dur)) : '0');
    this.set('cups', g.isSoldOut() ? `🚫 ${t('hud.soldOut')}` : `${ico('gd_ready', '🥛')}<span class="lbl"> ${t('hud.cups')}:</span> <b>${D.cupsReady}</b> · 👥 ${g.street.queued}`);
    const canMake = g.canMakePitcher();
    this.show('make', canMake || !!g.making);
    const makeBtn = this.els.make as HTMLButtonElement;
    makeBtn.disabled = !!g.making;
    this.set('make', g.making ? `🍋 ${Math.round(Math.min(1, g.making.t / g.making.dur) * 100)}%<span class="lbl"> ${t('hud.making')}</span>` : `🍳<span class="lbl"> ${t('hud.make')}</span><span class="sm">+</span>`);
    makeBtn.classList.toggle('btn-y', D.cupsReady === 0);
    // the own store: how clean the floor is; a tap wipes a stain off (so does a tap on the stain itself)
    const store = !!g.storeHere();
    this.show('clean', store);
    if (store) {
      const pct = g.cleanliness();
      const cleanBtn = this.els.clean as HTMLButtonElement;
      cleanBtn.disabled = pct >= 100;
      cleanBtn.classList.toggle('btn-y', pct < 70);
      this.set('clean', `🧹 <b>${pct}%</b>`);
    }
  }

  private viewButtons(): string {
    const g = this.g;
    const btn = (id: string, icon: string, label: string, on: boolean) =>
      `<button class="hv-btn${on ? ' on' : ''}" data-hud="view:${id}" title="${label}" aria-label="${label}">${icon}<span class="lbl"> ${label}</span></button>`;
    return `<span class="hv-eye">${ico('pt_look', '👀')}</span>${btn('own', '🍋', t('points.home'), g.viewPoint === null)}${g.S.points
      .filter((p) => p.loc !== g.S.location)
      .map((p) => btn(String(p.id), locIco(p.loc), t(`loc.${p.loc}.name`), g.viewPoint === p.id))
      .join('')}`;
  }

  /** The stand shown now: its seller, what it has sold so far today, its payback, and the way back. */
  private pointInfo(p: Point): string {
    const g = this.g;
    const sell = this.phase === 'sell';
    const workers = pointWorkers(p);
    const person = (w: (typeof workers)[number]) => `<b>${t(`staff.name${w.nameId}`)}</b> <span class="skill">${'★'.repeat(skillStars(w.skill))}</span>`;
    let who: string;
    if (!workers.length) who = `${ico('pt_closed', '🤒')} ${t(p.away || p.issue === 'sick' ? 'points.closedIll' : p.store ? 'points.storeNoStaff' : 'points.noSeller')}`;
    else if (p.today?.status === 'nomoney') who = `💸 ${t('points.status.nomoney')}`;
    else who = `${workers.length > 1 ? ico('pt_team', '👥') : ico('pt_seller', '👤')} ${workers.map(person).join(' · ')}${!p.seller || p.issue === 'sick' ? `<br><small class="muted">${t('points.aloneToday')}</small>` : ''}`;
    let today = '';
    if (sell && p.today && workers.length && p.today.status !== 'nomoney') {
      const k = pointProgress(p, g.D.hour);
      today =
        k <= 0
          ? `🕐 ${t('points.notOpenYet', { h: fmtHour(pointOpensAt(p)) })}`
          : `🥤 ${t('points.soFar', { n: Math.round(p.today.sold * k), m: Math.round(p.today.revenue * k) })}`;
    } else if (p.last) today = t('points.lastProfit', { n: signedCoin(p.last.profit) });
    const pct = Math.max(0, Math.min(100, Math.round(payback(p).share * 100)));
    return `<div class="hp-title">${locIco(p.loc)} <b>${t(`loc.${p.loc}.name`)}</b></div>
      <div>${who}</div>
      ${today ? `<div>${today}</div>` : ''}
      <div class="hp-pb"><span>${ico('pt_payback', '💹')} ${t('points.payback')}: <b>${pct}%</b></span><div class="bar pb-bar"><i style="width:${pct}%"></i></div></div>
      ${sell ? `<small class="muted">🍋 ${t('points.ownQueue', { n: g.street.queued })}</small>` : ''}
      <div class="hp-btns">${
        p.store
          ? `<button class="btn btn-sm btn-y" data-hud="points">${ico('pt_stand', '🏪')} ${t('points.title')}</button>`
          : `<button class="btn btn-sm btn-y" data-hud="pshop:${p.id}">${ico('pt_upgrades', '🛠️')} ${t('points.upgrades')}</button>`
      }
        <button class="btn btn-sm btn-g" data-hud="view:own">↩ ${t('points.backHome')}</button></div>`;
  }

  private renderWhy(): void {
    const g = this.g;
    const f = g.D.funnel;
    const key = `${g.interest.raw}|${g.radius}|${f.tooExpensive}|${f.queueFull}|${f.impatient}|${f.inRange}|${f.joined}`;
    if (key === this.whyKey) return;
    this.whyKey = key;
    const rows = g.interest.parts
      .map((p) => {
        const v = p.kind === 'base' ? `${Math.round(p.value * 100)}%` : p.kind === 'add' ? `+${Math.round(p.value * 100)}%` : `×${round1(p.value)}`;
        return `<div class="wrow"><span>${t(p.key)}</span><b>${v}</b></div>`;
      })
      .join('');
    const reasons = [
      [`👀 ${t('hud.inRange')}`, f.inRange],
      [`👍 ${t('hud.joined')}`, f.joined],
      [`💸 ${t('reason.expensive')}`, f.tooExpensive],
      [`⏳ ${t('reason.queue')}`, f.queueFull],
      [`😠 ${t('reason.impatient')}`, f.impatient],
    ]
      .map(([k, n]) => `<div class="wrow"><span>${k}</span><b>${n}</b></div>`)
      .join('');
    this.set(
      'why',
      `${rows}<div class="wrow total"><span>${t('why.total')}</span><b>${Math.round(g.interest.chance * 100)}%</b></div>
       <small>📡 ${t('hud.zone', { n: round1(g.radius) })}</small><small>${t('why.typeNote')}</small>
       <div style="margin-top:6px">${reasons}</div>`,
    );
  }
}
