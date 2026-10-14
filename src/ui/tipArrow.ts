// A big bouncing arrow that shows where to look while Lemi explains something: a button, a part of a window or
// something in the scene (the fox, a customer, a lucky find).

/** A spot in the scene the arrow can point at. */
export type WorldTarget = 'thief' | 'queue' | 'queue2' | 'critter' | 'stand';

/** For every tip: CSS selectors to try in order (the first visible one wins), or a spot in the scene. */
const TARGETS: Record<string, string[] | WorldTarget> = {
  welcome: ['.hud-top .chip.coins'],
  morning: ['#panel .locs .loc.sel', '#panel .locs'],
  location: ['#panel .locs'],
  market: ['#panel [data-act="kit"]'],
  wholesale: ['#panel .wholesale-h'],
  delivery: ['#panel [data-act="kit"]'],
  prepare_cost: ['#panel .cost-line', '#panel .formula'],
  price: ['#panel [data-act="price:1"]'],
  helper: ['#panel [data-act="helper"]', '#panel [data-act="helpers:1"]'],
  kitchen: ['.k-item'],
  mixer: ['.k-mixer-btn'],
  mix_over: ['.k-mixer-btn'],
  hand_stir: ['.k-mixer-btn'],
  kitchen_more: ['[data-kact="stand"]'],
  sell_start: ['[data-hud="serve"]'],
  first_sale: ['.hud-top .chip.coins'],
  queue: ['[data-hud="serve"]'],
  expensive: ['.price-box'],
  cookie_expensive: ['#panel [data-act="cprice:-1"]'],
  rain: ['[data-el="weather"]'],
  indoor: ['[data-el="loc"]'],
  spoiled: ['#resources'],
  reputation: ['[data-el="rep"]'],
  thief: 'thief',
  thief_hit: 'thief',
  two_queues: 'queue2',
  bonus: 'critter',
  report: ['#panel .big3'],
  shop: ['#panel .ups'],
  maintenance: ['#panel [data-act^="maintain"]'],
  points: ['[data-hud="points"]'],
  hire: ['[data-hud="points"]'],
  view: ['[data-el="pointinfo"]'],
};

function visible(el: Element): DOMRect | null {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return null;
  const st = getComputedStyle(el);
  if (st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0) return null;
  return r;
}

export class TipArrow {
  private el: HTMLElement;
  private shown = false;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'tip-arrow hidden';
    this.el.setAttribute('aria-hidden', 'true');
    this.el.innerHTML = `<svg viewBox="0 0 48 60" width="48" height="60"><path d="M24 58 L4 32 H16 V4 H32 V32 H44 Z" fill="#ffd43b" stroke="#5c3d00" stroke-width="3.5" stroke-linejoin="round"/></svg>`;
    parent.appendChild(this.el);
  }

  /** Every frame: point at the target of the tip on screen (or hide). `world` turns a scene spot into screen px. */
  update(tip: string | null, world: (w: WorldTarget) => { x: number; y: number } | null): void {
    const target = tip ? TARGETS[tip] : undefined;
    let x = 0;
    let y = 0;
    let below = false;
    let found = false;
    if (typeof target === 'string') {
      const p = world(target);
      if (p) {
        x = p.x;
        y = p.y;
        found = true;
      }
    } else if (target) {
      for (const sel of target) {
        const el = document.querySelector(sel);
        const r = el && visible(el);
        if (!r) continue;
        x = r.left + r.width / 2;
        // above the target, or below it when there is no room above
        below = r.top < 76;
        y = below ? r.bottom : r.top;
        found = true;
        break;
      }
    }
    if (!found) {
      if (this.shown) this.el.classList.add('hidden');
      this.shown = false;
      return;
    }
    x = Math.max(26, Math.min(window.innerWidth - 26, x));
    this.el.classList.toggle('up', below);
    this.el.style.transform = `translate(${Math.round(x - 24)}px, ${Math.round(below ? y + 2 : y - 62)}px)`;
    if (!this.shown) this.el.classList.remove('hidden');
    this.shown = true;
  }
}
