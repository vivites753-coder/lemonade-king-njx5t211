// Developer mode for testing on a phone: coins, reputation, weather, events, speed.
// Switched on by tapping the biggest text size in the settings 6 times; remembered on this device only.
import { clearErrors, errorLog } from '../core/errors';
import type { WeatherId } from '../core/types';
import { DAY_EVENTS, type DayEventId } from '../data/events';
import { ACCIDENTS, BONUSES } from '../data/incidents';
import { WEATHER, WEATHER_IDS } from '../data/weather';
import { t } from '../i18n';
import type { Game } from '../sim/game';
import { coin, esc } from './dom';
import type { ModalSpec } from './overlays';

const KEY = 'lemonadeKing.dev';

export function devModeOn(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setDevMode(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    // private mode: dev mode lasts until the page is closed
  }
}

export interface DevHooks {
  disable(): void;
  debugPanel(): void;
  toast(text: string): void;
}

/** The kept errors as text, to send to the developer. */
function errorsText(): string {
  return errorLog()
    .map((e) => `[${e.where}] ×${e.n} ${new Date(e.at).toISOString()}\n${e.msg}\n${e.stack}`)
    .join('\n\n');
}

/** The errors of the game on this device, the newest first. */
function errorsHtml(): string {
  const list = errorLog();
  if (!list.length) return `<h3>🐞 ${t('dev.errors')}</h3><p class="note">${t('dev.noErrors')}</p>`;
  const rows = [...list]
    .reverse()
    .slice(0, 6)
    .map((e) => `<div class="dev-err"><b>${esc(e.where)}</b> ×${e.n} · ${new Date(e.at).toLocaleString()}<br><code>${esc(e.msg)}</code></div>`)
    .join('');
  return `<h3>🐞 ${t('dev.errors')} · ${list.length}</h3>${rows}
    <div class="dev-row">
      <button class="btn btn-sm" data-act="errCopy">📋 ${t('dev.errCopy')}</button>
      <button class="btn btn-sm" data-act="errClear">🧹 ${t('dev.errClear')}</button>
    </div>`;
}

export function devModal(g: Game, hooks: DevHooks): ModalSpec {
  return {
    wide: true,
    render: () => {
      const sell = g.phase === 'sell';
      return `<h2>🛠 ${t('dev.title')}</h2>
        <p class="note">${t('dev.note')}</p>
        <h3>💰 ${t('dev.coins')} · ${coin(g.S.coins)}</h3>
        <div class="dev-row">
          ${[100, 500, 1000, 5000].map((n) => `<button class="btn btn-sm btn-y" data-act="coins:${n}">+${n}</button>`).join('')}
          <button class="btn btn-sm" data-act="coins:-${g.S.coins}">0</button>
        </div>
        <h3>⭐ ${t('dev.rep')} · ${g.S.rep.toFixed(2)} (${t('dev.best')} ${g.S.bestRep.toFixed(2)})</h3>
        <div class="dev-row">
          ${[1, 2, 3, 4, 4.9].map((r) => `<button class="btn btn-sm ${r >= 2 ? 'btn-g' : ''}" data-act="rep:${r}">⭐ ${r}</button>`).join('')}
          <button class="btn btn-sm" data-act="repAdd:0.5">+0.5</button>
        </div>
        <h3>🌦 ${t('dev.weather')}</h3>
        <div class="dev-row">${WEATHER_IDS.map((w) => `<button class="btn btn-sm${g.D.weather === w ? ' btn-b' : ''}" data-act="weather:${w}">${WEATHER[w].icon}</button>`).join('')}</div>
        <h3>🎲 ${t('dev.events')}</h3>
        <div class="dev-row">${DAY_EVENTS.map((e) => `<button class="btn btn-sm" data-act="event:${e.id}">${e.icon} ${e.id}</button>`).join('')}</div>
        <h3>🎭 ${t('dev.incidents')}</h3>
        <div class="dev-row">${[...ACCIDENTS, ...BONUSES].map((a) => `<button class="btn btn-sm" data-act="inc:${a.id}" ${sell ? '' : 'disabled'}>${a.icon} ${a.id}</button>`).join('')}</div>
        <h3>⏩ ${t('dev.day')}</h3>
        <div class="dev-row">
          <button class="btn btn-sm" data-act="speed:6" ${sell ? '' : 'disabled'}>×6</button>
          <button class="btn btn-sm" data-act="speed:10" ${sell ? '' : 'disabled'}>×10</button>
          <button class="btn btn-sm" data-act="end" ${sell ? '' : 'disabled'}>🌙 ${t('dev.endDay')}</button>
          <button class="btn btn-sm" data-act="panel">📊 ${t('dev.panel')}</button>
        </div>
        ${errorsHtml()}
        <div class="modal-actions">
          <button class="btn btn-r" data-act="off">${t('dev.disable')}</button>
          <button class="btn btn-y" data-act="close">${t('btn.close')}</button>
        </div>`;
    },
    act: (act, arg) => {
      if (act === 'close') return true;
      if (act === 'coins') g.devGift(Number(arg));
      if (act === 'rep') g.devSetRep(Number(arg));
      if (act === 'repAdd') g.devSetRep(g.S.rep + Number(arg));
      if (act === 'weather') g.debugSetWeather(arg as WeatherId);
      if (act === 'event') {
        g.debugForceEvent(arg as DayEventId);
        hooks.toast(`🎲 ${arg}`);
      }
      if (act === 'speed') g.setSpeed(Number(arg));
      if (act === 'inc') {
        g.devIncident(arg);
        return true;
      }
      if (act === 'end') {
        g.endDay();
        return true;
      }
      if (act === 'panel') {
        hooks.debugPanel();
        return true;
      }
      if (act === 'errClear') clearErrors();
      if (act === 'errCopy') {
        void navigator.clipboard
          ?.writeText(errorsText())
          .then(() => hooks.toast(t('dev.errCopied')))
          .catch(() => hooks.toast('⚠️'));
      }
      if (act === 'off') {
        hooks.disable();
        return true;
      }
      return false;
    },
  };
}
