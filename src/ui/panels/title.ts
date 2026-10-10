import type { AgeMode, Avatar } from '../../core/types';
import { t } from '../../i18n';
import type { Panel } from './types';

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
        <h3>${t('newgame.avatar')}</h3>
        <div class="choice-grid">
          ${choice('avatar:boy', s.avatar === 'boy', '👦', t('newgame.boy'))}
          ${choice('avatar:girl', s.avatar === 'girl', '👧', t('newgame.girl'))}
        </div>
        <h3>${t('newgame.mode')}</h3>
        <div class="choice-grid">
          ${choice('mode:kid', s.mode === 'kid', '🧸', t('mode.kid'), t('mode.kid.desc'))}
          ${choice('mode:pro', s.mode === 'pro', '💼', t('mode.pro'), t('mode.pro.desc'))}
        </div>
        <button class="btn btn-g btn-big" data-act="start">▶ ${t('btn.start')}</button>
        <button class="btn btn-sm" data-act="back">← ${t('btn.back')}</button>
      </div>`;
    }
    const lang = g.S.lang;
    return `<div class="title-card">
      <div class="logo">👑🍋</div>
      <h1>${t('app.title')}</h1>
      <p>${t('app.subtitle')}</p>
      ${ui.hasSave() ? `<button class="btn btn-g btn-big" data-act="continue">▶ ${t('btn.continue')}</button>` : ''}
      <button class="btn ${ui.hasSave() ? 'btn-y' : 'btn-g btn-big'}" data-act="new">✨ ${t('btn.newGame')}</button>
      <button class="btn" data-act="settings">⚙️ ${t('btn.settings')}</button>
      <div class="lang-row">
        <button class="btn btn-sm ${lang === 'uk' ? 'btn-y' : ''}" data-act="lang:uk">Українська</button>
        <button class="btn btn-sm ${lang === 'en' ? 'btn-y' : ''}" data-act="lang:en">English</button>
      </div>
    </div>`;
  },
  act(_g, ui, act, arg) {
    switch (act) {
      case 'new':
        ui.titleScreen = 'new';
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
        if (ui.hasSave()) ui.confirm(t('newgame.overwrite'), () => ui.startNewGame());
        else ui.startNewGame();
        break;
      case 'continue':
        ui.continueGame();
        break;
      case 'settings':
        ui.openSettings();
        break;
      case 'lang':
        ui.setLang(arg === 'en' ? 'en' : 'uk');
        break;
    }
  },
};
