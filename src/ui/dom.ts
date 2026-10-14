// Small HTML helpers for the DOM overlay UI.
import type { WeatherId } from '../core/types';
import { WEATHER } from '../data/weather';
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
const iconFiles = import.meta.glob('/assets/ui/ui_*.{png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
/** The icons by their PNG path (a WebP stands in for the PNG of the same name). */
const iconUrls: Record<string, string> = {};
for (const [path, url] of Object.entries(iconFiles)) {
  const key = path.replace(/\.webp$/i, '.png');
  if (path.endsWith('.webp') || !iconUrls[key]) iconUrls[key] = url;
}

/** True when the picture assets/ui/ui_<id>.png has been drawn. */
export function hasIco(id: string): boolean {
  return `/assets/ui/ui_${id}.png` in iconUrls;
}

/** An interface icon: the picture assets/ui/ui_<id>.png, or the emoji when it has not been drawn yet. */
export function ico(id: string, fallback: string, cls = ''): string {
  const u = iconUrls[`/assets/ui/ui_${id}.png`];
  return u ? `<img class="ico-img i-${id} ${cls}" src="${u}" alt="" draggable="false">` : fallback;
}

/** The picture of the weather (the emoji from the data when there is none). */
export function weatherIco(id: WeatherId): string {
  return ico(`w_${id}`, WEATHER[id].icon);
}

// the coin of the money chips is drawn by CSS unless the picture exists
{
  const u = iconUrls['/assets/ui/ui_coin.png'];
  if (u && typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--coin-img', `url("${u}")`);
    document.documentElement.classList.add('coin-art');
  }
}

/** Five stars for a reputation; a half star when the fraction is at least a half. */
export function stars(rep: number): string {
  let s = '<span class="stars">';
  for (let i = 1; i <= 5; i++) {
    const full = rep >= i - 1e-9;
    const half = !full && rep >= i - 0.5 - 1e-9;
    s += hasIco('star_full')
      ? ico(full ? 'star_full' : half ? 'star_half' : 'star_empty', '')
      : full
        ? '★'
        : '<span class="off">★</span>';
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

/** Game hours as "2 год" or "20 хв". */
export function fmtDur(h: number): string {
  return h < 1 ? t('time.min', { n: Math.round(h * 60) }) : t('time.h', { n: Math.round(h * 10) / 10 });
}

export function round1(v: number): string {
  return (Math.round(v * 10) / 10).toString();
}
