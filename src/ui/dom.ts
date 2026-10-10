// Small HTML helpers for the DOM overlay UI.
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

export function stars(rep: number): string {
  let s = '<span class="stars">';
  for (let i = 1; i <= 5; i++) {
    if (rep >= i - 0.25) s += '★';
    else if (rep >= i - 0.75) s += '<span style="position:relative">☆<span style="position:absolute;left:0;width:50%;overflow:hidden">★</span></span>';
    else s += '<span class="off">★</span>';
  }
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

export function round1(v: number): string {
  return (Math.round(v * 10) / 10).toString();
}
