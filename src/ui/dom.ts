// Small HTML helpers for the DOM overlay UI.
import { t } from '../i18n';
export { fmtHour } from '../sim/lessons';

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Coin amount, e.g. coin(12) → (coin icon)12 */
export function coin(n: number | string, cls = ''): string {
  return `<span class="money ${cls}"><i class="coin"></i>${n}</span>`;
}

export function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0';
}

export function signedCoin(n: number): string {
  return coin(signed(n), n > 0 ? 'pos' : n < 0 ? 'neg' : '');
}

/** Reputation as stars: a star lights up only when its level is reached (1.8 shows one star, 2.0 shows two). */
export function stars(rep: number): string {
  let s = '<span class="stars">';
  for (let i = 1; i <= 5; i++) s += rep >= i - 1e-9 ? '★' : '<span class="off">★</span>';
  return s + '</span>';
}

export function dots(n: number, max = 5): string {
  let s = '<span class="dots">';
  for (let i = 1; i <= max; i++) s += i <= n ? '●' : '<span class="off">●</span>';
  return s + '</span>';
}

export function lemiFace(mini = false): string {
  return `<div class="lemi-face${mini ? ' mini' : ''}" aria-hidden="true"><i class="leaf"></i><i class="eye l"></i><i class="eye r"></i><i class="mouth"></i></div>`;
}

export function toggle(act: string, on: boolean, label: string, desc = ''): string {
  return `<button class="toggle${on ? ' on' : ''}" data-act="${act}" role="switch" aria-checked="${on}">
    <span class="sw"></span><span class="grow"><b>${label}</b>${desc ? `<br><small class="muted">${desc}</small>` : ''}</span></button>`;
}

/** Game hours as "2 год" or "20 хв". */
export function fmtDur(h: number): string {
  return h < 1 ? t('time.min', { n: Math.round(h * 60) }) : t('time.h', { n: Math.round(h * 10) / 10 });
}

export function round1(v: number): string {
  return (Math.round(v * 10) / 10).toString();
}
