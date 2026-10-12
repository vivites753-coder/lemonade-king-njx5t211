// Decorate the food truck: colour scheme, logo and the text of the neon sign, with a live preview.
import { TRUCK_LOGOS, TRUCK_SKINS, TRUCK_TEXT_MAX } from '../data/truck';
import { t } from '../i18n';
import type { Game } from '../sim/game';
import { esc } from './dom';
import type { ModalSpec } from './overlays';

/** A flat front view of the truck for the preview. */
function preview(skin: number, logo: number, label: string): string {
  const sk = TRUCK_SKINS[skin] ?? TRUCK_SKINS[0];
  const stripes = Array.from({ length: 8 }, (_, i) => `<rect x="${20 + i * 25}" y="44" width="25" height="12" fill="${i % 2 ? '#ffffff' : sk.awning}"/>`).join('');
  return `<svg viewBox="0 0 240 150" class="truck-preview" aria-hidden="true">
    <defs><filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect x="30" y="6" width="180" height="28" rx="7" fill="#1a1b26" stroke="${sk.neon}" stroke-width="2.5"/>
    <text x="120" y="25.5" text-anchor="middle" font-size="${label.length > 10 ? 13 : 16}" font-weight="900" fill="${sk.neon}" filter="url(#glow)" font-family="Nunito, Trebuchet MS, sans-serif">${esc(label)}</text>
    <rect x="14" y="36" width="212" height="92" rx="12" fill="${sk.body}" stroke="${sk.trim}" stroke-width="2"/>
    ${stripes}
    <rect x="26" y="58" width="150" height="36" rx="5" fill="#3b2f2f"/>
    <rect x="22" y="92" width="158" height="6" rx="3" fill="${sk.trim}"/>
    <rect x="14" y="110" width="212" height="7" fill="${sk.trim}"/>
    <circle cx="200" cy="74" r="17" fill="#fff" stroke="${sk.trim}" stroke-width="2.5"/>
    <text x="200" y="81" text-anchor="middle" font-size="19">${TRUCK_LOGOS[logo] ?? TRUCK_LOGOS[0]}</text>
    <circle cx="58" cy="130" r="13" fill="#212529"/><circle cx="58" cy="130" r="5" fill="#adb5bd"/>
    <circle cx="182" cy="130" r="13" fill="#212529"/><circle cx="182" cy="130" r="5" fill="#adb5bd"/>
  </svg>`;
}

export function truckModal(g: Game): ModalSpec {
  // the text field keeps its value between re-renders
  let draft = g.S.truck.text;
  const readDraft = () => {
    const el = document.getElementById('truck-text') as HTMLInputElement | null;
    if (el) draft = el.value;
  };
  return {
    wide: true,
    render: () => {
      const look = g.S.truck;
      const label = draft.trim() || t('world.truckDefault');
      return `<h2>🎨 ${t('truck.title')}</h2>
        <div class="truck-wrap">${preview(look.skin, look.logo, label)}</div>
        <h3>${t('truck.skin')}</h3>
        <div class="dev-row">${TRUCK_SKINS.map(
          (s, i) => `<button class="swatch${look.skin === i ? ' sel' : ''}" data-act="skin:${i}" style="background:${s.body};border-color:${s.trim}" aria-label="${t(`truck.skin.${s.id}`)}" title="${t(`truck.skin.${s.id}`)}"><i style="background:${s.neon}"></i></button>`,
        ).join('')}</div>
        <h3>${t('truck.logo')}</h3>
        <div class="dev-row">${TRUCK_LOGOS.map((l, i) => `<button class="btn btn-sm${look.logo === i ? ' btn-y' : ''}" data-act="logo:${i}">${l}</button>`).join('')}</div>
        <h3>${t('truck.text')}</h3>
        <input id="truck-text" class="input-name" maxlength="${TRUCK_TEXT_MAX}" value="${esc(draft)}" placeholder="${esc(t('world.truckDefault'))}" autocomplete="off" />
        <small class="muted">${t('truck.textNote', { n: TRUCK_TEXT_MAX })}</small>
        <div class="modal-actions">
          <button class="btn" data-act="preview">👀 ${t('truck.preview')}</button>
          <button class="btn btn-g" data-act="save">✅ ${t('truck.save')}</button>
        </div>`;
    },
    act: (act, arg) => {
      readDraft();
      if (act === 'skin') g.setTruckLook({ skin: Number(arg) });
      if (act === 'logo') g.setTruckLook({ logo: Number(arg) });
      if (act === 'save') {
        g.setTruckLook({ text: draft });
        return true;
      }
      return false;
    },
  };
}
