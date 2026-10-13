// Heads-up display: top bar (always), funnel card and selling controls (only while selling).
import { CONFIG } from '../core/config';
import type { Phase } from '../core/types';
import { LOCATIONS } from '../data/locations';
import { t } from '../i18n';
import type { Game } from '../sim/game';
import { fmtHour, ico, round1, stars, weatherIco } from './dom';

export class Hud {
  private els: Record<string, HTMLElement> = {};
  private cache = new Map<HTMLElement, string>();
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
      const [act, arg = ''] = el.dataset.hud!.split(':');
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
        <div class="hud-goal"><span data-el="goal"></span><div class="goal-bar"><i data-el="goalfill"></i></div></div>
        <span class="spacer"></span>
        <div class="seg" data-el="speed">
          <button data-hud="speed:0" aria-label="${t('hud.pause')}">⏸</button>
          <button data-hud="speed:1" aria-label="x1">▶</button>
          <button data-hud="speed:2" aria-label="x2">⏩</button>
          <button data-hud="speed:3" aria-label="x3">⏭</button>
        </div>
        <button class="hud-btn hidden" data-hud="points" data-el="points" aria-label="${t('points.title')}">🏪</button>
        <button class="hud-btn" data-hud="tip" aria-label="${t('hud.tip')}">🍋</button>
        <button class="hud-btn" data-hud="glossary" aria-label="${t('hud.glossary')}">📖</button>
        <button class="hud-btn" data-hud="sound" data-el="sound" aria-label="${t('hud.sound')}">🔊</button>
        <button class="hud-btn" data-hud="settings" aria-label="${t('btn.settings')}">⚙️</button>
      </div>
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
          <div class="price-box">
            <button class="btn btn-icon" data-hud="price:-1" aria-label="−">−</button>
            <div class="val"><small>${t('hud.price')}</small><b><i class="coin"></i><span data-el="price"></span></b></div>
            <button class="btn btn-icon btn-y" data-hud="price:1" aria-label="+">+</button>
          </div>
          <button class="btn" data-hud="speaker" data-el="speaker"></button>
        </div>
        <button class="serve-btn" data-hud="serve" data-el="serve">🥛<small>${t('hud.serve')}</small></button>
        <div class="hb-right">
          <span class="chip cups-chip" data-el="cups"></span>
          <button class="btn btn-y" data-hud="make" data-el="make"></button>
          <button class="btn btn-sm" data-hud="end">🌙<span class="lbl"> ${t('hud.end')}</span></button>
        </div>
      </div>`;
    this.els = {};
    this.cache.clear();
    for (const el of Array.from(this.root.querySelectorAll<HTMLElement>('[data-el]'))) this.els[el.dataset.el!] = el;
    this.setPhase(this.phase);
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

  private show(key: string, on: boolean): void {
    this.els[key]?.classList.toggle('hidden', !on);
  }

  update(userPaused: boolean): void {
    if (this.phase === 'title') return;
    const g = this.g;
    const S = g.S;
    const D = g.D;
    this.set('coins', String(S.coins));
    this.set('day', t('hud.day', { n: S.day }));
    this.set('clock', fmtHour(D.hour));
    // .lbl parts are hidden on small screens, .sm parts are shown only there
    this.set('weather', `${weatherIco(D.weather)}<span class="lbl"> ${t(`weather.${D.weather}`)}</span>`);
    this.set('loc', `${LOCATIONS[S.location].icon}<span class="lbl"> ${t(`loc.${S.location}.name`)}</span>`);
    this.set('rep', `<span class="lbl">${stars(S.rep)}</span><span class="sm">${ico('star_full', '⭐')}</span> ${S.rep.toFixed(1)}`);
    this.set('goal', `🏁 ${t('hud.goal', { coins: S.coins, goal: CONFIG.GOAL_COINS })}`);
    const fill = `${Math.round(Math.min(1, S.coins / CONFIG.GOAL_COINS) * 100)}%`;
    if (this.els.goalfill.style.width !== fill) this.els.goalfill.style.width = fill;
    this.set('sound', S.settings.sound ? '🔊' : '🔇');
    this.show('points', g.pointsOpen() || S.points.length > 0);
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
    this.set('speaker', `${S.speakerOn ? '🔊' : '🔇'}<span class="lbl"> ${t('hud.speaker')}: ${S.speakerOn ? t('hud.on') : t('hud.off')}</span>`);
    // the player can pour at any counter with a customer in front and nobody pouring there
    const counters = [...Array(g.counters()).keys()];
    const front = counters.some((c) => !!g.street.frontReady(c));
    const free = counters.some((c) => !!g.street.frontReady(c) && !g.servings[c]);
    const serveBtn = this.els.serve as HTMLButtonElement;
    const canServe = free && !g.making && D.cupsReady > 0;
    serveBtn.disabled = !front || !!g.making;
    serveBtn.classList.toggle('ready', canServe);
    // the ring shows the player's own pour (helpers' pours have their own rings over the stand)
    const mine = g.servings.find((x) => x && !x.helper) ?? null;
    serveBtn.style.setProperty('--p', mine ? String(Math.min(1, mine.t / mine.dur)) : '0');
    this.set('cups', g.isSoldOut() ? `🚫 ${t('hud.soldOut')}` : `🥛<span class="lbl"> ${t('hud.cups')}:</span> <b>${D.cupsReady}</b> · 👥 ${g.street.queued}`);
    const canMake = g.canMakePitcher();
    this.show('make', canMake || !!g.making);
    const makeBtn = this.els.make as HTMLButtonElement;
    makeBtn.disabled = !!g.making;
    this.set('make', g.making ? `🍋 ${Math.round(Math.min(1, g.making.t / g.making.dur) * 100)}%<span class="lbl"> ${t('hud.making')}</span>` : `🍳<span class="lbl"> ${t('hud.make')}</span><span class="sm">+</span>`);
    makeBtn.classList.toggle('btn-y', D.cupsReady === 0);
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
