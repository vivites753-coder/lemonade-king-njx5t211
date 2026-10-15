// Settings, glossary, parental gate, confirmations and the stage-complete screen.
import { EDITION } from '../core/config';
import { GLOSSARY_IDS } from '../data/glossary';
import { LANGS, asLang, t } from '../i18n';
import type { Lang } from '../core/types';
import type { Game } from '../sim/game';
import { esc, ico, toggle } from './dom';
import { toggleFullscreen } from './fullscreen';
import { isNativeApp } from '../native';
import type { ModalSpec } from './overlays';

/** The text sizes of the settings: [scale, label]. */
export const FONT_SCALES: [number, string][] = [
  [0.9, 'settings.font.s'],
  [1, 'settings.font.m'],
  [1.15, 'settings.font.l'],
  [1.3, 'settings.font.xl'],
];

/** The simple version for 6-8 year olds: its button comes back when that version is ready. */
export const KID_MODE_READY = false;

export function confirmModal(text: string, onYes: () => void): ModalSpec {
  return {
    render: () => `<p>${esc(text)}</p>
      <div class="modal-actions">
        <button class="btn" data-act="no">${t('btn.no')}</button>
        <button class="btn btn-y" data-act="yes">${t('btn.yes')}</button>
      </div>`,
    act: (act) => {
      if (act === 'yes') {
        // close first, then run (the action may open another overlay)
        queueMicrotask(onYes);
        return true;
      }
      return act === 'no';
    },
  };
}

export function infoModal(title: string, text: string): ModalSpec {
  return {
    render: () => `<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="modal-actions"><button class="btn btn-y" data-act="ok">${t('btn.ok')}</button></div>`,
    act: (act) => act === 'ok',
  };
}

/** A simple grown-ups-only check: a small arithmetic problem. */
export function gateModal(onPass: () => void): ModalSpec {
  const a = 3 + Math.floor(Math.random() * 6);
  const b = 3 + Math.floor(Math.random() * 6);
  const c = 1 + Math.floor(Math.random() * 9);
  const answer = a * b - c;
  let wrong = false;
  return {
    render: () => `<h2>${ico('lock', '🔒')} ${t('gate.title')}</h2>
      <p>${t('gate.q', { q: `${a} × ${b} − ${c} = ?` })}</p>
      <input id="gate-input" class="input-num" inputmode="numeric" autocomplete="off" />
      ${wrong ? `<div class="warn-box">${t('gate.wrong')}</div>` : ''}
      <div class="modal-actions">
        <button class="btn" data-act="cancel">${t('btn.cancel')}</button>
        <button class="btn btn-y" data-act="check">${t('gate.check')}</button>
      </div>`,
    act: (act) => {
      if (act === 'cancel') return true;
      if (act === 'check') {
        const v = Number((document.getElementById('gate-input') as HTMLInputElement | null)?.value);
        if (v === answer) {
          queueMicrotask(onPass);
          return true;
        }
        wrong = true;
      }
      return false;
    },
  };
}

export interface SettingsHooks {
  setLang(l: Lang): void;
  apply(): void;
  openGate(onPass: () => void): void;
  info(title: string, text: string): void;
  resetProgress(): void;
  toTitle(): void;
  exportSave(): void;
  importSave(): void;
  devMode(): boolean;
  enableDev(): void;
  openDev(): void;
  editHud(): void;
}

export function settingsModal(g: Game, hooks: SettingsHooks): ModalSpec {
  // taps on "Entrepreneur" in a row (a pause longer than 2 s starts over)
  let taps = 0;
  let lastTap = 0;
  return {
    wide: true,
    render: () => {
      const s = g.S.settings;
      const inGame = g.phase !== 'title';
      return `<h2>⚙️ ${t('settings.title')}</h2>
        ${toggle('set:sound', s.sound, `🔊 ${t('settings.sound')}`)}
        ${toggle('set:music', s.music, `🎵 ${t('settings.music')}`)}
        ${toggle('set:showZone', s.showZone, `🟡 ${t('settings.showZone')}`)}
        ${toggle('set:reduceMotion', s.reduceMotion, `🐢 ${t('settings.reduceMotion')}`)}
        ${toggle('set:dyslexia', s.dyslexia, `🔤 ${t('settings.dyslexia')}`)}
        <h3>🔠 ${t('settings.fontSize')}</h3>
        <div class="row font-sizes">
          ${FONT_SCALES.map(([k, key]) => `<button class="btn btn-sm ${Math.abs((s.fontScale ?? 1) - k) < 0.01 ? 'btn-y' : ''}" data-act="font:${k}" style="font-size:${Math.round(14 * k)}px">${t(key)}</button>`).join('')}
        </div>
        ${inGame ? `<h3>🕹️ ${t('settings.hudLayout')}</h3>
        <div class="row"><button class="btn btn-sm" data-act="hudEdit">✋ ${t('settings.hudEdit')}</button></div>
        <p class="note">${t('settings.hudNote')}</p>` : ''}
        ${isNativeApp() ? '' : `<div class="row" style="margin:6px 0"><button class="btn btn-sm" data-act="fullscreen">⛶ ${t('settings.fullscreen')}</button></div>`}
        <h3>🌍 ${t('settings.lang')}</h3>
        <div class="row">
          ${LANGS.map((l) => `<button class="btn btn-sm ${g.S.lang === l.id ? 'btn-y' : ''}" data-act="lang:${l.id}">${l.name}</button>`).join('')}
        </div>
        ${inGame && KID_MODE_READY ? `<h3>🎚️ ${t('settings.mode')}</h3>
        <div class="row">
          <button class="btn btn-sm ${g.S.ageMode === 'kid' ? 'btn-y' : ''}" data-act="mode:kid">${t('mode.kid')}</button>
          <button class="btn btn-sm ${g.S.ageMode === 'pro' ? 'btn-y' : ''}" data-act="mode:pro">${t('mode.pro')}</button>
        </div>` : ''}
        <h3>💾 ${t('settings.backup')}</h3>
        <div class="row" style="flex-wrap:wrap">
          <button class="btn btn-sm" data-act="export">⬇️ ${t('settings.export')}</button>
          <button class="btn btn-sm" data-act="import">⬆️ ${t('settings.import')}</button>
        </div>
        <p class="note">${t('settings.backupNote')}</p>
        <h3>👪 ${t('settings.parents')}</h3>
        <div class="row" style="flex-wrap:wrap">
          <button class="btn btn-sm" data-act="full">⭐ ${t('settings.full')}</button>
          ${inGame ? `<button class="btn btn-sm" data-act="title">🏠 ${t('settings.toTitle')}</button>` : ''}
          <button class="btn btn-sm btn-r" data-act="reset">🗑️ ${t('settings.reset')}</button>
        </div>
        ${hooks.devMode() ? `<h3>🛠 ${t('dev.title')}</h3><button class="btn btn-sm btn-b" data-act="dev">🛠 ${t('dev.open')}</button>` : ''}
        <p class="note">${t('settings.edition', { e: EDITION === 'full' ? 'Full' : 'Demo' })} · v0.4</p>
        <div class="modal-actions"><button class="btn btn-y" data-act="close">${t('btn.close')}</button></div>`;
    },
    act: (act, arg) => {
      if (act === 'close') return true;
      if (act === 'set') {
        const key = arg as keyof typeof g.S.settings;
        g.updateSettings({ [key]: !g.S.settings[key] });
        hooks.apply();
      }
      if (act === 'hudEdit') {
        queueMicrotask(() => hooks.editHud());
        return true;
      }
      if (act === 'font') {
        g.updateSettings({ fontScale: Number(arg) || 1 });
        hooks.apply();
      }
      if (act === 'fullscreen') {
        toggleFullscreen();
        return false;
      }
      if (act === 'lang') hooks.setLang(asLang(arg));
      if (act === 'mode') {
        g.setAgeMode(arg === 'kid' ? 'kid' : 'pro');
        const now = Date.now();
        taps = arg === 'pro' && now - lastTap < 2000 ? taps + 1 : arg === 'pro' ? 1 : 0;
        lastTap = now;
        if (taps >= 5 && !hooks.devMode()) {
          taps = 0;
          hooks.enableDev();
        }
      }
      if (act === 'dev') {
        queueMicrotask(() => hooks.openDev());
        return true;
      }
      // open the next dialog only after this one has closed
      if (act === 'full') {
        queueMicrotask(() => hooks.openGate(() => hooks.info(t('settings.full'), t('settings.fullSoon'))));
        return true;
      }
      if (act === 'reset') {
        queueMicrotask(() => hooks.openGate(() => hooks.resetProgress()));
        return true;
      }
      if (act === 'export') {
        hooks.exportSave();
        return false;
      }
      if (act === 'import') {
        // the file picker must open straight from the tap, so close this dialog first and open the picker at once
        hooks.importSave();
        return true;
      }
      if (act === 'title') {
        queueMicrotask(() => hooks.toTitle());
        return true;
      }
      return false;
    },
  };
}

export function glossaryModal(g: Game): ModalSpec {
  return {
    wide: true,
    render: () => {
      const known = GLOSSARY_IDS.filter((id) => g.S.glossary.includes(id));
      const items = known.length
        ? known.map((id) => `<div class="gl-item"><b>${t(`gl.${id}.term`)}</b> — ${t(`gl.${id}.text`)}</div>`).join('')
        : `<p class="note">${t('glossary.empty')}</p>`;
      return `<h2>📖 ${t('glossary.title')} <small class="muted">${known.length}/${GLOSSARY_IDS.length}</small></h2>${items}
        <div class="modal-actions"><button class="btn btn-y" data-act="close">${t('btn.close')}</button></div>`;
    },
    act: (act) => act === 'close',
  };
}

export function stageModal(g: Game): ModalSpec {
  return {
    render: () => `<div class="ev-ico">${ico('crown', '👑')}🍋${ico('trophy', '🎉')}</div>
      <h2 class="ev-title">${t('stage.title')}</h2>
      <p>${t('stage.text', { coins: g.S.coins, stars: g.S.rep.toFixed(1) })}</p>
      <p>${EDITION === 'demo' ? t('stage.demo') : t('stage.full')}</p>
      <div class="modal-actions"><button class="btn btn-g btn-big" data-act="ok">${t('stage.continue')}</button></div>`,
    act: (act) => act === 'ok',
  };
}
