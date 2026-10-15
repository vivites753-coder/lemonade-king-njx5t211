import { listProfiles } from '../../core/save';
import type { AgeMode, Avatar } from '../../core/types';
import { LANGS, asLang, t } from '../../i18n';
import { coin, esc } from '../dom';
import { KID_MODE_READY } from '../modals';
import type { Panel } from './types';

const AVATAR_ICON: Record<Avatar, string> = { boy: '👦', girl: '👧' };

/** The version of the game: the day and time of the build (in the player's time zone). */
function buildLabel(): string {
  const d = new Date(__BUILD_TIME__);
  if (Number.isNaN(d.getTime())) return '';
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(d.getDate())}.${two(d.getMonth() + 1)} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

export const titlePanel: Panel = {
  id: 'title',
  dock: false,
  render(g, ui) {
    if (ui.titleScreen === 'new') {
      const s = ui.newSel;
      const choice = (act: string, sel: boolean, big: string, label: string, desc = '') =>
        `<button class="choice${sel ? ' sel' : ''}" data-act="${act}"><span class="big">${big}</span><b>${label}</b>${desc ? `<small>${desc}</small>` : ''}</button>`;
      return `<div class="title-card">
        <h2>${t('newgame.title')}</h2>
        <label class="name-label" for="new-name">${t('prof.name')}</label>
        <input id="new-name" class="input-name" maxlength="20" autocomplete="off" placeholder="${esc(t('prof.namePh'))}" value="${esc(s.name)}" />
        <div class="new-grid">
          <div>
            <h3>${t('newgame.avatar')}</h3>
            <div class="choice-grid">
              ${choice('avatar:boy', s.avatar === 'boy', '👦', t('newgame.boy'))}
              ${choice('avatar:girl', s.avatar === 'girl', '👧', t('newgame.girl'))}
            </div>
          </div>
          ${
            KID_MODE_READY
              ? `<div>
            <h3>${t('newgame.mode')}</h3>
            <div class="choice-grid">
              ${choice('mode:kid', s.mode === 'kid', '🧸', t('mode.kid'), t('mode.kid.desc'))}
              ${choice('mode:pro', s.mode === 'pro', '💼', t('mode.pro'), t('mode.pro.desc'))}
            </div>
          </div>`
              : ''
          }
        </div>
        <button class="btn btn-g btn-big" data-act="start">▶ ${t('btn.start')}</button>
        <button class="btn btn-sm" data-act="back">← ${t('btn.back')}</button>
      </div>`;
    }
    const lang = g.S.lang;
    const profiles = listProfiles();
    const cards = profiles
      .map(
        (p) => `<div class="prof">
          <button class="prof-main" data-act="profile:${p.id}">
            <span class="prof-ico">${AVATAR_ICON[p.avatar] ?? '🙂'}</span>
            <span class="grow"><b>${esc(p.name)}</b><small>${p.day ? `${t('prof.day', { n: p.day })} · ${coin(p.coins ?? 0)}` : t('prof.notStarted')}</small></span>
            <span class="prof-go">▶</span>
          </button>
          <button class="prof-del" data-act="delete:${p.id}" aria-label="${esc(t('prof.delete'))}" title="${esc(t('prof.delete'))}">🗑️</button>
        </div>`,
      )
      .join('');
    return `<div class="title-card">
      <div class="logo">👑🍋</div>
      <h1>${t('app.title')}</h1>
      <p>${t('app.subtitle')}</p>
      ${profiles.length ? `<h3>${t('prof.who')}</h3><div class="profs">${cards}</div>` : ''}
      <button class="btn ${profiles.length ? 'btn-y' : 'btn-g btn-big'}" data-act="new">✨ ${profiles.length ? t('prof.new') : t('btn.newGame')}</button>
      <button class="btn" data-act="settings">⚙️ ${t('btn.settings')}</button>
      <div class="lang-row">
        ${LANGS.map((l) => `<button class="btn btn-sm ${lang === l.id ? 'btn-y' : ''}" data-act="lang:${l.id}">${l.name}</button>`).join('')}
      </div>
      ${profiles.length ? `<p class="note">🔒 ${t('prof.local')}</p>` : ''}
      <p class="version-note">${t('title.version', { v: buildLabel() })}</p>
    </div>`;
  },
  act(_g, ui, act, arg) {
    switch (act) {
      case 'new':
        ui.titleScreen = 'new';
        ui.newSel.name = '';
        break;
      case 'back':
        ui.titleScreen = 'main';
        break;
      case 'avatar':
        ui.newSel.avatar = arg as Avatar;
        break;
      case 'mode':
        ui.newSel.mode = arg as AgeMode;
        break;
      case 'start':
        ui.startNewGame();
        break;
      case 'profile':
        ui.selectProfile(arg);
        break;
      case 'delete':
        ui.deleteProfile(arg);
        break;
      case 'settings':
        ui.openSettings();
        break;
      case 'lang':
        ui.setLang(asLang(arg));
        break;
    }
  },
};
