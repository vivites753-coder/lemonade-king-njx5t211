// One-at-a-time queue for Lemi tips, event cards and modal dialogs. While something is open during selling,
// the game pauses so a child never misses what is happening.
import { t, tipText } from '../i18n';
import type { CardInfo, Game } from '../sim/game';
import { esc, lemiFace, type LemiMood } from './dom';

/** How Lemi looks while giving a tip (neutral when not listed). */
const TIP_MOOD: Record<string, LemiMood> = {
  welcome: 'happy',
  first_sale: 'happy',
  bonus: 'happy',
  loyalty: 'happy',
  reputation: 'happy',
  points: 'happy',
  cookie_first: 'happy',
  spoiled: 'sad',
  breakdown: 'sad',
  thief_hit: 'sad',
  taste_bad: 'sad',
  mix_over: 'sad',
  pour_over: 'surprised',
  pour_under: 'think',
  thief: 'surprised',
  rain: 'surprised',
  expensive: 'surprised',
  cookie_expensive: 'surprised',
  price: 'think',
  prepare_cost: 'think',
  location: 'think',
  wholesale: 'think',
  cheap_lemons: 'think',
  maintenance: 'think',
  helper: 'think',
  online_ads: 'think',
  ice: 'happy',
  queue: 'think',
  two_queues: 'think',
  hand_stir: 'think',
  mixer: 'think',
  kitchen_more: 'think',
  store: 'happy',
  tables: 'happy',
  menu: 'happy',
  menu_first: 'happy',
  pastry_stale: 'surprised',
};

/** How Lemi looks under the lesson of an event card (thinking when not listed). */
const CARD_MOOD: Record<string, LemiMood> = {
  festival: 'happy',
  thiefCaught: 'happy',
  thiefLocked: 'happy',
  broke: 'sad',
  thiefStole: 'sad',
  grandmaHelp: 'sad',
  badLemons: 'sad',
  sugarHike: 'surprised',
  cupsSoldOut: 'surprised',
  thiefEmpty: 'surprised',
  storeOpened: 'happy',
};

export interface ModalSpec {
  render: () => string;
  /** Return true to close the modal. */
  act: (act: string, arg: string, el: HTMLElement) => boolean | void;
  wide?: boolean;
}

type Item = { kind: 'tip'; key: string } | { kind: 'card'; card: CardInfo } | { kind: 'modal'; spec: ModalSpec };

export class Overlays {
  private q: Item[] = [];
  private current: Item | null = null;
  /** The dialog (spec) that is on screen now. */
  private shown: ModalSpec | null = null;
  lastTip: string | null = null;

  constructor(
    private g: Game,
    private lemiEl: HTMLElement,
    private modalEl: HTMLElement,
    private click: () => void,
  ) {
    lemiEl.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-lemi]');
      if (!el) return;
      this.click();
      if (el.dataset.lemi === 'ok') this.close();
    });
    modalEl.addEventListener('click', (e) => {
      // a tap on the dim background closes an ordinary dialog (cards with choices wait for an answer)
      if (e.target === modalEl && this.current?.kind === 'modal') {
        this.click();
        this.close();
        return;
      }
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (!el || (el as HTMLButtonElement).disabled) return;
      this.click();
      const [act, arg = ''] = el.dataset.act!.split(':');
      const cur = this.current;
      if (!cur) return;
      if (cur.kind === 'card') {
        if (cur.card.choices) {
          if (this.g.cardChoice(cur.card, act)) this.close();
          return;
        }
        if (act === 'repair' && cur.card.repair) {
          if (this.g.repair(cur.card.repair)) this.close();
          return;
        }
        if (act === 'ok') this.close();
        return;
      }
      if (cur.kind === 'modal') {
        const close = cur.spec.act(act, arg, el);
        if (close) this.close();
        else if (this.current === cur) this.renderModal(cur.spec);
      }
    });
  }

  get active(): boolean {
    return this.current !== null;
  }

  /** The Lemi tip on screen now, if any. */
  tipKey(): string | null {
    return this.current?.kind === 'tip' ? this.current.key : null;
  }

  push(item: Item, front = false): void {
    if (front) {
      if (this.current) this.q.unshift(this.current);
      this.q.unshift(item);
      this.current = null;
      this.next();
      return;
    }
    this.q.push(item);
    if (!this.current) this.next();
  }

  tip(key: string): void {
    this.push({ kind: 'tip', key });
  }

  card(card: CardInfo): void {
    this.push({ kind: 'card', card });
  }

  modal(spec: ModalSpec): void {
    this.push({ kind: 'modal', spec }, true);
  }

  close(): void {
    this.lemiEl.classList.add('hidden');
    this.modalEl.classList.add('hidden');
    this.shown = null;
    this.current = null;
    this.next();
  }

  /** Re-render the open modal (e.g. after a language change). */
  refresh(): void {
    if (this.current?.kind === 'modal') this.renderModal(this.current.spec);
    else if (this.current?.kind === 'tip') this.renderTip(this.current.key);
    else if (this.current?.kind === 'card') this.renderCard(this.current.card);
  }

  /** Enter / Escape closes tips and cards. */
  key(k: string): boolean {
    if (!this.current) return false;
    // a card with choices waits for an answer
    if (this.current.kind === 'card' && this.current.card.choices) return false;
    if ((k === 'Enter' || k === 'Escape') && this.current.kind !== 'modal') {
      this.close();
      return true;
    }
    if (k === 'Escape' && this.current.kind === 'modal') {
      this.close();
      return true;
    }
    return false;
  }

  private next(): void {
    this.lemiEl.classList.add('hidden');
    this.modalEl.classList.add('hidden');
    this.shown = null;
    const it = this.q.shift();
    if (!it) {
      this.current = null;
      return;
    }
    this.current = it;
    if (it.kind === 'tip') {
      this.lastTip = it.key;
      this.renderTip(it.key);
    } else if (it.kind === 'card') {
      this.renderCard(it.card);
    } else {
      this.renderModal(it.spec);
    }
  }

  private renderTip(key: string): void {
    this.lemiEl.innerHTML = `${lemiFace(false, TIP_MOOD[key] ?? 'neutral')}
      <div class="lemi-bubble"><div class="lemi-name">${t('lemi.name')}</div>
        <div>${esc(tipText(key, this.g.S.ageMode))}</div>
        <div class="lemi-actions">
          <button class="btn btn-y btn-sm" data-lemi="ok">${t('btn.ok')}</button>
        </div>
      </div>`;
    this.lemiEl.classList.remove('hidden');
  }

  private renderCard(c: CardInfo): void {
    this.modalEl.innerHTML = `<div class="modal-card">
      <div class="ev-ico">${c.icon}</div>
      <h2 class="ev-title">${esc(t(`card.${c.id}.title`, c.params))}</h2>
      <p>${esc(t(`card.${c.id}.text`, c.params))}</p>
      <div class="lesson">${lemiFace(true, CARD_MOOD[c.id] ?? 'think')}<div>${esc(t(`card.${c.id}.lemi`, c.params))}</div></div>
      <div class="modal-actions${c.choices && c.choices.length > 2 ? ' wrap' : ''}">
        ${c.choices
          ? c.choices
              .map((ch) => `<button class="btn${ch.style ? ` btn-${ch.style}` : ''}" data-act="${ch.act}" ${ch.disabled ? 'disabled' : ''}>${esc(t(ch.key, ch.params))}</button>`)
              .join('')
          : c.repair
          ? `<button class="btn" data-act="ok">${t('card.later')}</button>
             <button class="btn btn-g" data-act="repair" ${this.g.S.coins < this.g.repairCost(c.repair) ? 'disabled' : ''}>🔧 ${t('card.repair', { cost: this.g.repairCost(c.repair) })}</button>`
          : `<button class="btn btn-y" data-act="ok">${t('btn.ok')}</button>`}
      </div>
    </div>`;
    this.modalEl.classList.remove('hidden');
  }

  private renderModal(spec: ModalSpec): void {
    // the same dialog drawn again (after a purchase, a language change): only its content changes, so it neither
    // pops in again nor jumps back to the top
    const card = this.modalEl.firstElementChild as HTMLElement | null;
    if (card && this.shown === spec && !this.modalEl.classList.contains('hidden')) {
      const top = card.scrollTop;
      card.innerHTML = spec.render();
      card.scrollTop = top;
      return;
    }
    this.shown = spec;
    this.modalEl.innerHTML = `<div class="modal-card${spec.wide ? ' wide' : ''}">${spec.render()}</div>`;
    this.modalEl.classList.remove('hidden');
  }
}
