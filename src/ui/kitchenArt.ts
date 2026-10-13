// Drawings for the kitchen work table. The tools on the table follow the player's upgrades
// (juicer, mixer, cups, cooler bag, toolkit), so buying something visibly changes the kitchen.

import { t } from '../i18n';

const svg = (w: number, h: number, body: string) => `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" aria-hidden="true">${body}</svg>`;

/** A wooden crate; the number of lemons shown follows the stock (up to 7). */
export function lemonCrate(n: number): string {
  const spots = [
    [16, 22],
    [30, 20],
    [44, 22],
    [23, 13],
    [37, 12],
    [10, 13],
    [50, 13],
  ];
  const lemons = spots
    .slice(0, Math.min(7, n))
    .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="6" fill="#ffd43b" stroke="#e0a800" stroke-width="1.2"/><ellipse cx="${x - 2}" cy="${y - 2}" rx="2.5" ry="1.5" fill="#fff3bf"/>`)
    .join('');
  return svg(
    60,
    44,
    `${lemons}<rect x="3" y="22" width="54" height="20" rx="3" fill="#c98a4b" stroke="#8a5a2b" stroke-width="1.5"/>
     <line x1="4" y1="31" x2="56" y2="31" stroke="#8a5a2b" stroke-width="1.2"/>
     <rect x="9" y="25" width="6" height="14" fill="#b07842"/><rect x="45" y="25" width="6" height="14" fill="#b07842"/>`,
  );
}

/** Water bottles; empty slots show how much is gone. */
export function waterBottles(n: number): string {
  let body = '';
  for (let i = 0; i < 3; i++) {
    const x = 6 + i * 17;
    const full = i < n;
    body += `<rect x="${x + 4}" y="4" width="6" height="6" rx="1.5" fill="${full ? '#1c7ed6' : '#ced4da'}"/>
      <path d="M${x} 16 Q${x} 10 ${x + 4} 10 L${x + 10} 10 Q${x + 14} 10 ${x + 14} 16 L${x + 14} 40 Q${x + 14} 43 ${x + 11} 43 L${x + 3} 43 Q${x} 43 ${x} 40 Z"
        fill="${full ? 'rgba(116,192,252,0.85)' : 'rgba(233,236,239,0.6)'}" stroke="${full ? '#1971c2' : '#adb5bd'}" stroke-width="1.3"/>
      ${full ? `<rect x="${x + 2}" y="22" width="10" height="7" rx="1.5" fill="#fff" opacity="0.85"/>` : ''}`;
  }
  return svg(60, 46, body);
}

export function sugarBag(n: number): string {
  const level = Math.max(0, Math.min(1, n / 5));
  return svg(
    50,
    46,
    `<path d="M10 12 L40 12 L44 42 Q44 45 41 45 L9 45 Q6 45 6 42 Z" fill="#f8f9fa" stroke="#adb5bd" stroke-width="1.5"/>
     <path d="M10 12 Q25 4 40 12" fill="none" stroke="#adb5bd" stroke-width="1.5"/>
     <rect x="13" y="${45 - 30 * level}" width="24" height="${30 * level}" fill="#fff" opacity="0.9"/>
     <rect x="12" y="22" width="26" height="11" rx="2" fill="#4dabf7"/>
     <text x="25" y="30.5" font-size="8" font-weight="900" fill="#fff" text-anchor="middle">${t('world.sugar')}</text>`,
  );
}

export type JuicerKind = 'none' | 'hand' | 'lever';

export function juicer(kind: JuicerKind): string {
  if (kind === 'lever') {
    return svg(
      80,
      90,
      `<rect x="10" y="78" width="60" height="9" rx="3" fill="#495057"/>
       <rect x="52" y="20" width="9" height="60" rx="3" fill="#868e96"/>
       <path d="M56 22 L18 8" stroke="#343a40" stroke-width="6" stroke-linecap="round"/>
       <circle cx="16" cy="8" r="6" fill="#e03131"/>
       <path d="M22 42 L52 42 L48 56 L26 56 Z" fill="#adb5bd" stroke="#495057" stroke-width="1.5"/>
       <ellipse cx="37" cy="66" rx="16" ry="5" fill="#ced4da" stroke="#868e96"/>
       <rect x="33" y="56" width="8" height="10" fill="#dee2e6"/>`,
    );
  }
  if (kind === 'hand') {
    return svg(
      80,
      90,
      `<ellipse cx="40" cy="80" rx="32" ry="8" fill="#d0ebff" stroke="#74c0fc" stroke-width="2"/>
       <path d="M10 78 Q12 60 40 60 Q68 60 70 78" fill="rgba(208,235,255,0.7)" stroke="#74c0fc" stroke-width="2"/>
       <path d="M24 62 L40 26 L56 62 Z" fill="#e7f5ff" stroke="#74c0fc" stroke-width="2"/>
       <path d="M32 50 L40 30 M48 50 L40 30" stroke="#a5d8ff" stroke-width="1.5"/>`,
    );
  }
  // no juicer yet: squeezing by hand over a bowl
  return svg(
    80,
    90,
    `<path d="M8 62 Q40 98 72 62 Z" fill="#fff4e6" stroke="#e8590c" stroke-width="2"/>
     <ellipse cx="40" cy="62" rx="32" ry="6" fill="#ffe8cc" stroke="#e8590c" stroke-width="2"/>
     <text x="40" y="48" font-size="30" text-anchor="middle">✊</text>`,
  );
}

export type MixerKind = 'basic' | 'pro' | 'broken';

export function mixer(kind: MixerKind): string {
  if (kind === 'pro') {
    return svg(
      70,
      90,
      `<rect x="8" y="80" width="54" height="8" rx="3" fill="#adb5bd"/>
       <rect x="44" y="20" width="14" height="62" rx="5" fill="#e9ecef" stroke="#868e96" stroke-width="1.5"/>
       <rect x="8" y="12" width="50" height="18" rx="9" fill="#f1f3f5" stroke="#868e96" stroke-width="1.5"/>
       <circle cx="52" cy="21" r="3" fill="#40c057"/>
       <line x1="22" y1="30" x2="22" y2="52" stroke="#868e96" stroke-width="3"/>
       <path d="M10 52 L36 52 L32 76 L14 76 Z" fill="#dee2e6" stroke="#868e96" stroke-width="1.5"/>
       <path d="M16 18 L26 16" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
    );
  }
  return svg(
    70,
    90,
    `<rect x="14" y="16" width="38" height="24" rx="10" fill="${kind === 'broken' ? '#ced4da' : '#ffa8a8'}" stroke="#c92a2a" stroke-width="1.5"/>
     <rect x="44" y="34" width="10" height="26" rx="4" fill="${kind === 'broken' ? '#adb5bd' : '#ff8787'}" stroke="#c92a2a" stroke-width="1.5"/>
     <line x1="24" y1="40" x2="22" y2="70" stroke="#868e96" stroke-width="2.5"/>
     <line x1="34" y1="40" x2="36" y2="70" stroke="#868e96" stroke-width="2.5"/>
     <ellipse cx="22" cy="74" rx="5" ry="7" fill="none" stroke="#868e96" stroke-width="2"/>
     <ellipse cx="36" cy="74" rx="5" ry="7" fill="none" stroke="#868e96" stroke-width="2"/>
     ${kind === 'broken' ? '<text x="50" y="18" font-size="18" text-anchor="middle">🔧</text>' : ''}`,
  );
}

export function cups(branded: boolean, n: number): string {
  let body = '';
  const stacks = Math.min(3, Math.ceil(n / 10));
  for (let s = 0; s < stacks; s++) {
    const x = 6 + s * 18;
    for (let i = 0; i < 4; i++) {
      const y = 40 - i * 6;
      body += `<path d="M${x} ${y - 8} L${x + 14} ${y - 8} L${x + 12} ${y + 2} L${x + 2} ${y + 2} Z" fill="${branded ? (i === 3 ? '#ffd43b' : '#fcc419') : i === 3 ? '#fff' : '#f1f3f5'}" stroke="${branded ? '#e0a800' : '#ced4da'}" stroke-width="1"/>`;
    }
    if (branded) body += `<circle cx="${x + 7}" cy="${17}" r="2.5" fill="#e8590c"/>`;
  }
  return svg(62, 46, body);
}

export function coolerBag(): string {
  return svg(
    70,
    50,
    `<rect x="4" y="12" width="62" height="34" rx="6" fill="#4dabf7" stroke="#1971c2" stroke-width="1.5"/>
     <rect x="2" y="8" width="66" height="9" rx="4" fill="#f8f9fa" stroke="#adb5bd"/>
     <path d="M22 8 Q35 -2 48 8" fill="none" stroke="#1971c2" stroke-width="3"/>
     <text x="35" y="37" font-size="16" text-anchor="middle" fill="#fff">❄</text>`,
  );
}

export function toolkitBox(): string {
  return svg(
    60,
    34,
    `<rect x="4" y="10" width="52" height="22" rx="3" fill="#e03131" stroke="#a61e1e" stroke-width="1.5"/>
     <path d="M20 10 Q20 2 30 2 Q40 2 40 10" fill="none" stroke="#495057" stroke-width="3"/>
     <rect x="26" y="17" width="8" height="5" rx="1" fill="#ffd43b"/>`,
  );
}
