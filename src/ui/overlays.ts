// One-at-a-time queue for Lemi tips, event cards and modal dialogs. While something is open during selling,
// the game pauses so a child never misses what is happening.
import { t, tipText } from '../i18n';
import type { CardInfo, Game } from '../sim/game';
import { esc, lemiFace } from './dom';

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
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (!el || (el as HTMLButtonElement).disabled) return;
      this.click();
      const [act, arg = ''] = el.dataset.act!.split(':');
      const cur = this.current;
      if (!cur) return;
      if (cur.kind === 'card') {
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
    this.lemiEl.innerHTML = `${lemiFace()}
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
      <div class="lesson">${lemiFace(true)}<div>${esc(t(`card.${c.id}.lemi`, c.params))}</div></div>
      <div class="modal-actions">
        ${c.repair
          ? `<button class="btn" data-act="ok">${t('card.later')}</button>
             <button class="btn btn-g" data-act="repair" ${this.g.S.coins < this.g.repairCost(c.repair) ? 'disabled' : ''}>🔧 ${t('card.repair', { cost: this.g.repairCost(c.repair) })}</button>`
          : `<button class="btn btn-y" data-act="ok">${t('btn.ok')}</button>`}
      </div>
    </div>`;
    this.modalEl.classList.remove('hidden');
  }

  private renderModal(spec: ModalSpec): void {
    this.modalEl.innerHTML = `<div class="modal-card${spec.wide ? ' wide' : ''}">${spec.render()}</div>`;
    this.modalEl.classList.remove('hidden');
  }
}
