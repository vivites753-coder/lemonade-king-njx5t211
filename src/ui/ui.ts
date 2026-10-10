// UI controller: picks the panel for each phase, routes clicks/taps/keys, keeps the camera clear of panels.
import { play, setSoundEnabled } from '../audio/sfx';
import { clearSave, parseSave, readSave, serializeSave, writeSave } from '../core/save';
import type { AgeMode, Avatar, Lang, Phase } from '../core/types';
import { setLang, t } from '../i18n';
import type { Game } from '../sim/game';
import type { Renderer } from '../render/renderer';
import { Hud } from './hud';
import { confirmModal, gateModal, glossaryModal, infoModal, settingsModal, stageModal } from './modals';
import { Overlays } from './overlays';
import { marketPanel } from './panels/market';
import { morningPanel } from './panels/morning';
import { preparePanel } from './panels/prepare';
import { reportPanel } from './panels/report';
import { shopPanel } from './panels/shop';
import { titlePanel } from './panels/title';
import type { Panel, UIApi } from './panels/types';
import { esc } from './dom';

const PANELS: Partial<Record<Phase, Panel>> = {
  title: titlePanel,
  morning: morningPanel,
  market: marketPanel,
  prepare: preparePanel,
  report: reportPanel,
  shop: shopPanel,
};

export class UI implements UIApi {
  newSel: { avatar: Avatar; mode: AgeMode } = { avatar: 'boy', mode: 'pro' };
  titleScreen: 'main' | 'new' = 'main';
  private panelEl: HTMLElement;
  private toastsEl: HTMLElement;
  private hud: Hud;
  private overlays: Overlays;
  private current: Panel | null = null;
  private userPaused = false;

  constructor(
    private g: Game,
    private r: Renderer,
  ) {
    this.panelEl = document.getElementById('panel')!;
    this.toastsEl = document.getElementById('toasts')!;
    this.hud = new Hud(document.getElementById('hud')!, g, (a, arg) => this.hudAct(a, arg));
    this.overlays = new Overlays(g, document.getElementById('lemi')!, document.getElementById('modal')!, () => play('click'));

    this.panelEl.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (!el || (el as HTMLButtonElement).disabled || !this.current) return;
      play('click');
      const [act, arg = ''] = el.dataset.act!.split(':');
      this.current.act(g, this, act, arg);
      this.refresh();
    });

    g.bus.on('phase', ({ phase }) => this.onPhase(phase));
    g.bus.on('changed', () => this.refresh());
    g.bus.on('tip', ({ key }) => this.overlays.tip(key));
    g.bus.on('card', (c) => this.overlays.card(c));
    g.bus.on('toast', (e) => this.toast(t(e.key, e.params), e.kind));
    g.bus.on('sfx', (e) => play(e.name));

    const canvas = document.getElementById('scene')!;
    canvas.addEventListener('pointerdown', (e) => this.onTap(e.clientX, e.clientY));
    window.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && g.phase === 'sell') this.userPaused = true;
    });

    this.applySettings();
    this.onPhase(g.phase);
  }

  // ---------------------------------------------------------------- UIApi
  hasSave(): boolean {
    return readSave() !== null;
  }

  startNewGame(): void {
    this.titleScreen = 'main';
    this.userPaused = false;
    this.g.newGame({ ageMode: this.newSel.mode, avatar: this.newSel.avatar, lang: this.g.S.lang });
    this.applySettings();
  }

  continueGame(): void {
    const snap = readSave();
    if (!snap) return;
    this.userPaused = false;
    setLang(snap.S.lang);
    this.g.restore(snap);
    this.hud.build();
    this.applySettings();
  }

  confirm(text: string, onYes: () => void): void {
    this.overlays.modal(confirmModal(text, onYes));
  }

  openSettings(): void {
    this.overlays.modal(
      settingsModal(this.g, {
        setLang: (l) => this.setLang(l),
        apply: () => this.applySettings(),
        openGate: (onPass) => this.overlays.modal(gateModal(onPass)),
        info: (title, text) => this.overlays.modal(infoModal(title, text)),
        resetProgress: () => {
          clearSave();
          this.toast(t('toast.resetDone'), 'good');
          this.toTitle();
        },
        toTitle: () => this.toTitle(),
        exportSave: () => this.exportSave(),
        importSave: () => this.pickSaveFile(),
      }),
    );
  }

  /** Downloads the save as a file (the game in progress, or the stored save when on the title screen). */
  private exportSave(): void {
    const snap = this.g.phase !== 'title' ? this.g.snapshot() : readSave();
    if (!snap) {
      this.toast(t('toast.noSave'), 'warn');
      return;
    }
    const blob = new Blob([serializeSave(snap)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lemonade-king-save-day${snap.S.day}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    this.toast(t('toast.exported', { day: snap.S.day, coins: snap.S.coins }), 'good');
  }

  /** Opens the file picker; the chosen file is validated, then the player confirms replacing the current progress. */
  private pickSaveFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return;
      const snap = parseSave(await file.text());
      if (!snap) {
        this.toast(t('toast.importBad'), 'warn');
        return;
      }
      const apply = () => {
        writeSave(snap);
        this.continueGame();
        this.toast(t('toast.imported', { day: snap.S.day, coins: snap.S.coins }), 'good');
      };
      const current = this.g.phase !== 'title' ? this.g.S : readSave()?.S;
      if (current) this.confirm(t('settings.importAsk', { day: snap.S.day, coins: snap.S.coins, curDay: current.day, curCoins: current.coins }), apply);
      else apply();
    });
    document.body.appendChild(input);
    input.click();
  }

  openGlossary(): void {
    this.overlays.modal(glossaryModal(this.g));
  }

  setLang(l: Lang): void {
    setLang(l);
    this.g.setLang(l);
    this.hud.build();
    this.refresh();
    this.overlays.refresh();
  }

  refresh(): void {
    if (!this.current) return;
    const body = this.panelEl.querySelector('.panel-body');
    const scroll = body ? body.scrollTop : 0;
    this.panelEl.innerHTML = this.current.render(this.g, this);
    const nb = this.panelEl.querySelector('.panel-body');
    if (nb) nb.scrollTop = scroll;
    // no slide-in animation on re-render
    this.panelEl.querySelector('.panel')?.setAttribute('style', 'animation:none');
  }

  // ---------------------------------------------------------------- phases & layout
  private onPhase(p: Phase): void {
    this.hud.setPhase(p);
    const panel = PANELS[p] ?? null;
    this.current = panel;
    if (panel) {
      this.panelEl.classList.remove('hidden');
      this.panelEl.classList.toggle('center', !panel.dock);
      this.panelEl.innerHTML = panel.render(this.g, this);
    } else {
      this.panelEl.classList.add('hidden');
      this.panelEl.innerHTML = '';
    }
    if (p === 'sell') this.userPaused = false;
    if (p === 'report' && this.g.D.report?.stageGoalReached) this.overlays.push({ kind: 'modal', spec: stageModal(this.g) });
    this.layout();
  }

  /** Keeps the diorama visible next to docked panels and HUD. */
  layout(): void {
    const p = this.g.phase;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const compact = h < 460;
    const top = p === 'title' ? 0 : compact ? 36 : 58;
    let right = 0;
    let bottom = 0;
    if (this.current?.dock && w > 860) right = this.panelEl.getBoundingClientRect().width + 16;
    if (p === 'sell') {
      // on phones the controls may overlap the empty corners of the diamond-shaped diorama
      bottom = compact ? 28 : 110;
      if (w > 860) right = compact ? 180 : 252;
    }
    this.r.compact = compact;
    this.r.insets = { top, right, bottom, left: 0 };
  }

  update(): void {
    const sell = this.g.phase === 'sell';
    this.g.paused = sell && (this.userPaused || this.overlays.active);
    this.hud.update(this.userPaused);
  }

  private toTitle(): void {
    this.titleScreen = 'main';
    this.g.goTitle();
  }

  private applySettings(): void {
    const s = this.g.S.settings;
    setSoundEnabled(s.sound);
    document.body.classList.toggle('dyslexia', s.dyslexia);
    document.body.classList.toggle('reduce-motion', s.reduceMotion);
  }

  // ---------------------------------------------------------------- input
  private hudAct(act: string, arg: string): void {
    const g = this.g;
    play('click');
    switch (act) {
      case 'speed':
        if (arg === '0') this.userPaused = !this.userPaused;
        else {
          this.userPaused = false;
          g.setSpeed(Number(arg));
        }
        break;
      case 'price':
        g.setPrice(g.S.price + Number(arg));
        break;
      case 'speaker':
        g.toggleSpeaker();
        break;
      case 'serve':
        g.serve();
        break;
      case 'make':
        g.makePitcher();
        break;
      case 'end':
        this.confirm(t('hud.end') + '?', () => g.endDay());
        break;
      case 'tip':
        if (this.overlays.lastTip) this.overlays.tip(this.overlays.lastTip);
        else this.overlays.tip('welcome');
        break;
      case 'glossary':
        this.openGlossary();
        break;
      case 'sound':
        g.updateSettings({ sound: !g.S.settings.sound });
        this.applySettings();
        break;
      case 'settings':
        this.openSettings();
        break;
    }
  }

  private onTap(x: number, y: number): void {
    const g = this.g;
    if (g.phase !== 'sell' || g.paused) return;
    const th = this.r.thiefScreen;
    if (th && Math.hypot(th.x - x, th.y - y) < 70) {
      g.catchThief();
      return;
    }
    g.serve();
  }

  private onKey(e: KeyboardEvent): void {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') {
      if (e.key === 'Enter') (document.querySelector('[data-act="check"]') as HTMLButtonElement | null)?.click();
      return;
    }
    if (this.overlays.key(e.key)) {
      e.preventDefault();
      return;
    }
    if (this.g.phase !== 'sell') return;
    if (e.key === ' ') {
      e.preventDefault();
      this.g.serve();
    } else if (e.key === 'p' || e.key === 'P') this.userPaused = !this.userPaused;
    else if (e.key === '1' || e.key === '2' || e.key === '3') {
      this.userPaused = false;
      this.g.setSpeed(Number(e.key));
    } else if (e.key === 'n' || e.key === 'N') this.g.makePitcher();
  }

  /** Used by the dev helpers to fast-forward through tips. */
  closeOverlaysForDev(): void {
    while (this.overlays.active) this.overlays.close();
  }

  toast(text: string, kind: 'info' | 'warn' | 'good' = 'info'): void {
    const el = document.createElement('div');
    el.className = `toast toast-${kind}`;
    el.innerHTML = esc(text);
    this.toastsEl.appendChild(el);
    while (this.toastsEl.children.length > 3) this.toastsEl.firstElementChild?.remove();
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3100);
  }
}
