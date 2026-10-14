// UI controller: picks the panel for each phase, routes clicks/taps/keys, keeps the camera clear of panels.
import { play, setSoundEnabled } from '../audio/sfx';
import { activeProfile, clearSave, createProfile, deleteProfile, listProfiles, parseSave, readSave, serializeSave, setActiveProfile, writeSave } from '../core/save';
import type { AgeMode, Avatar, Lang, Phase } from '../core/types';
import { setLang, t } from '../i18n';
import type { Game } from '../sim/game';
import type { Renderer } from '../render/renderer';
import { Hud } from './hud';
import { confirmModal, gateModal, glossaryModal, infoModal, settingsModal, stageModal } from './modals';
import { Overlays } from './overlays';
import { kitchenPanel } from './panels/kitchen';
import { marketPanel } from './panels/market';
import { morningPanel } from './panels/morning';
import { preparePanel } from './panels/prepare';
import { reportPanel } from './panels/report';
import { shopPanel } from './panels/shop';
import { titlePanel } from './panels/title';
import type { Panel, UIApi } from './panels/types';
import { esc } from './dom';
import { devModal, devModeOn, setDevMode } from './devModal';
import { hireModal, pointShopModal, pointsModal, type PointsHooks } from './points';
import { TipArrow, type WorldTarget } from './tipArrow';
import { CONFIG } from '../core/config';
import { roadmapModal } from './roadmap';
import { truckModal } from './truckModal';
import { ResourceBar, stockModal } from './resources';

const PANELS: Partial<Record<Phase, Panel>> = {
  title: titlePanel,
  morning: morningPanel,
  market: marketPanel,
  kitchen: kitchenPanel,
  prepare: preparePanel,
  report: reportPanel,
  shop: shopPanel,
};

/** The player name that starts the test game: day 2, reputation 5, 5000 coins, no tips. */
const TEST_PROFILE_NAME = 'vivites753';

export class UI implements UIApi {
  newSel: { avatar: Avatar; mode: AgeMode; name: string } = { avatar: 'boy', mode: 'pro', name: '' };
  /** A profile chosen on the title screen that has no game yet. */
  private reuseProfile: string | null = null;
  private resources: ResourceBar;
  titleScreen: 'main' | 'new' = 'main';
  private panelEl: HTMLElement;
  private toastsEl: HTMLElement;
  private hud: Hud;
  private overlays: Overlays;
  private current: Panel | null = null;
  private userPaused = false;
  /** Phones: the full-screen panel can be hidden to look at the scene. */
  private panelHidden = false;
  private toggleEl: HTMLElement;
  private arrow: TipArrow;

  constructor(
    private g: Game,
    private r: Renderer,
  ) {
    this.panelEl = document.getElementById('panel')!;
    this.toggleEl = document.getElementById('panel-toggle')!;
    this.toggleEl.addEventListener('click', () => {
      play('click');
      this.panelHidden = !this.panelHidden;
      this.applyPanelHidden();
    });
    this.toastsEl = document.getElementById('toasts')!;
    this.hud = new Hud(document.getElementById('hud')!, g, (a, arg) => this.hudAct(a, arg));
    this.overlays = new Overlays(g, document.getElementById('lemi')!, document.getElementById('modal')!, () => play('click'));
    this.resources = new ResourceBar(document.getElementById('resources')!, g, () => {
      play('click');
      this.openStock();
    });
    this.panelEl.addEventListener('input', (e) => {
      const el = e.target as HTMLInputElement;
      if (el.id === 'new-name') this.newSel.name = el.value;
    });

    this.panelEl.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (!el || (el as HTMLButtonElement).disabled || !this.current) return;
      play('click');
      const [act, arg = ''] = el.dataset.act!.split(':');
      this.current.act(g, this, act, arg);
      this.refresh();
    });

    g.bus.on('phase', ({ phase }) => this.onPhase(phase));
    // the kitchen opens over the selling day when the lemonade runs out
    g.bus.on('kitchen', () => this.onPhase(g.phase));
    g.bus.on('changed', () => this.refresh());
    g.bus.on('tip', ({ key }) => {
      // something happens at the own stand while selling: the scene goes back there
      if (key !== 'view' && g.phase === 'sell') g.setView(null);
      this.overlays.tip(key);
    });
    g.bus.on('card', (c) => {
      if (g.phase === 'sell') g.setView(null);
      this.overlays.card(c);
    });
    g.bus.on('toast', (e) => this.toast(t(e.key, e.params), e.kind));
    g.bus.on('sfx', (e) => play(e.name));
    // a card asks to hire somebody (a stand-in for an ill seller): the list opens after the card has closed
    g.bus.on('hire', ({ point }) => queueMicrotask(() => this.pointsHooks.hire(point)));
    this.arrow = new TipArrow(document.getElementById('app') ?? document.body);
    // the top bar changes its height with its content (and the phase): keep the scene and the windows under it
    const bar = document.querySelector('.hud-top');
    if (bar && typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.layout()).observe(bar);

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
    const name = this.newSel.name.trim() || t('prof.default', { n: listProfiles().length + 1 });
    if (this.reuseProfile) setActiveProfile(this.reuseProfile);
    else createProfile(name, this.newSel.avatar);
    this.reuseProfile = null;
    this.titleScreen = 'main';
    this.userPaused = false;
    // typing this name starts a ready-made test game (see Game.newGame)
    const cheat = name.toLowerCase() === TEST_PROFILE_NAME;
    this.g.newGame({ ageMode: this.newSel.mode, avatar: this.newSel.avatar, lang: this.g.S.lang, name, cheat });
    this.applySettings();
  }

  /** Title screen: tap a player. Continues their game, or starts one if they have none yet. */
  selectProfile(id: string): void {
    setActiveProfile(id);
    if (readSave()) {
      this.continueGame();
      return;
    }
    const p = activeProfile();
    this.reuseProfile = id;
    this.newSel.name = p?.name ?? '';
    if (p) this.newSel.avatar = p.avatar;
    this.titleScreen = 'new';
    this.refresh();
  }

  deleteProfile(id: string): void {
    const p = listProfiles().find((x) => x.id === id);
    if (!p) return;
    this.confirm(t('prof.deleteAsk', { name: p.name }), () => {
      deleteProfile(id);
      this.refresh();
    });
  }

  openStock(): void {
    this.overlays.modal(stockModal(this.g));
  }

  private pointsHooks: PointsHooks = {
    hire: (id, role) => this.overlays.modal(hireModal(this.g, id, this.pointsHooks, role)),
    points: () => this.openPoints(),
    shop: (id) => this.overlays.modal(pointShopModal(this.g, id, this.pointsHooks)),
    view: (id) => this.g.setView(id),
    confirm: (text, yes) => this.confirm(text, yes),
  };

  openPoints(): void {
    this.overlays.modal(pointsModal(this.g, this.pointsHooks));
  }

  openRoadmap(): void {
    this.overlays.modal(roadmapModal(this.g));
  }

  openTruck(): void {
    this.overlays.modal(truckModal(this.g));
  }

  /** Set by main.ts: shows the developer stats panel. */
  debugPanel: () => void = () => undefined;

  openDev(): void {
    this.overlays.modal(
      devModal(this.g, {
        disable: () => {
          setDevMode(false);
          this.toast(t('dev.off'), 'info');
        },
        debugPanel: () => this.debugPanel(),
        toast: (text) => this.toast(text, 'info'),
      }),
    );
  }

  /** A new version of the game was published: offer to reload. */
  showUpdate(): void {
    if (document.getElementById('update-bar')) return;
    const bar = document.createElement('button');
    bar.id = 'update-bar';
    bar.className = 'update-bar';
    bar.innerHTML = `🔄 ${esc(t('update.available'))} <b>${esc(t('update.reload'))}</b>`;
    // a new address, so that the browser does not give back the page it keeps in its cache
    bar.addEventListener('click', () => location.replace(`${location.pathname}?v=${Date.now()}`));
    document.getElementById('app')!.appendChild(bar);
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
        devMode: () => devModeOn(),
        enableDev: () => {
          setDevMode(true);
          this.toast(t('dev.on'), 'good');
          this.overlays.refresh();
        },
        openDev: () => this.openDev(),
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
    this.resources.build();
    this.refresh();
    this.overlays.refresh();
  }

  refresh(): void {
    if (!this.current) return;
    if (this.current.update) {
      this.current.update(this.panelEl, this.g, this);
      return;
    }
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
    const midKitchen = p === 'sell' && this.g.midKitchen;
    this.hud.setPhase(midKitchen ? 'kitchen' : p);
    const panel = midKitchen ? kitchenPanel : (PANELS[p] ?? null);
    this.current?.unmount?.();
    this.current = panel;
    if (panel) {
      this.panelEl.classList.remove('hidden');
      this.panelEl.classList.toggle('center', !panel.dock && !panel.wide);
      this.panelEl.classList.toggle('wide', !!panel.wide);
      this.panelEl.classList.toggle('title-mode', p === 'title');
      if (panel.mount) panel.mount(this.panelEl, this.g, this);
      else this.panelEl.innerHTML = panel.render(this.g, this);
    } else {
      this.panelEl.classList.add('hidden');
      this.panelEl.innerHTML = '';
    }
    if (p === 'sell') this.userPaused = false;
    if (p === 'report' && this.g.D.report?.stageGoalReached) this.overlays.push({ kind: 'modal', spec: stageModal(this.g) });
    // a new stage always opens its window
    this.panelHidden = false;
    this.toggleEl.classList.toggle('hidden', !panel || p === 'title');
    this.applyPanelHidden();
  }

  private applyPanelHidden(): void {
    this.panelEl.classList.toggle('collapsed', this.panelHidden);
    this.toggleEl.classList.toggle('reopen', this.panelHidden);
    this.toggleEl.innerHTML = this.panelHidden ? `📋 ${t('ui.showPanel')}` : '✕';
    this.toggleEl.setAttribute('aria-label', this.panelHidden ? t('ui.showPanel') : t('ui.hidePanel'));
    this.layout();
  }

  /** Keeps the diorama visible next to docked panels and HUD. */
  layout(): void {
    const p = this.g.phase;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const compact = h < 460;
    // under the top bar: measured, because on phones it is big and on a narrow one it may take two rows
    const bar = document.querySelector<HTMLElement>('.hud-top');
    const barBottom = bar && !bar.classList.contains('hidden') ? Math.ceil(bar.getBoundingClientRect().bottom) : 0;
    document.documentElement.style.setProperty('--hud-h', `${barBottom || (compact ? 36 : 58)}px`);
    const top = p === 'title' ? 0 : compact ? Math.max(36, barBottom + 2) : 58;
    let right = 0;
    let bottom = 0;
    if (this.current?.dock && w > 860 && !compact) right = this.panelEl.getBoundingClientRect().width + 16;
    if (p === 'sell') {
      // on phones the controls may overlap the empty corners of the diamond-shaped diorama
      bottom = compact ? 28 : 110;
      if (w > 860) right = compact ? 180 : 252;
    }
    // the stock panel on the left edge
    const left = p === 'title' ? 0 : compact ? 52 : 74;
    this.r.compact = compact;
    this.r.insets = { top, right, bottom, left };
    const root = document.documentElement.style;
    root.setProperty('--scene-l', `${left}px`);
    root.setProperty('--scene-r', `${this.current?.dock && w > 860 && !compact ? right : 0}px`);
  }

  update(): void {
    const sell = this.g.phase === 'sell';
    this.g.paused = sell && (this.userPaused || this.overlays.active);
    this.hud.update(this.userPaused);
    this.resources.update(this.g.phase);
    this.arrow.update(this.overlays.tipKey(), (w) => this.worldSpot(w));
  }

  /** Screen position of something in the scene the tip arrow points at (the tip of the arrow is there). */
  private worldSpot(w: WorldTarget): { x: number; y: number } | null {
    const g = this.g;
    if (g.viewPoint !== null) return null;
    const at = (x: number, y: number, z: number) => this.r.worldToScreen(x, y, z);
    if (w === 'thief') return g.street.thief ? at(g.street.thief.x, g.street.thief.y, 52) : null;
    if (w === 'queue' || w === 'queue2') {
      const p = g.street.queueFor(w === 'queue2' ? 1 : 0)[0];
      return p ? at(p.x, p.y, 62) : null;
    }
    if (w === 'critter') {
      const c = g.critters.list.find((x) => x.bonus) ?? null;
      return c ? at(c.x, c.y, 30) : null;
    }
    return at(CONFIG.STAND.x, CONFIG.STAND.y, 100);
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
        g.openKitchen();
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
      case 'points':
        this.openPoints();
        break;
      case 'view':
        g.setView(arg === 'own' ? null : Number(arg));
        break;
      case 'pshop':
        this.pointsHooks.shop(Number(arg));
        break;
      case 'roadmap':
        this.openRoadmap();
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
    // taps on another stand do not serve the own customers
    if (g.phase !== 'sell' || g.paused || g.viewPoint !== null) return;
    // only a tap right on the fox counts
    const th = this.r.thiefScreen;
    if (th && g.street.thiefCatchable() && Math.hypot(th.x - x, th.y - y) < th.r) {
      g.hitThief();
      return;
    }
    // a lucky find (a cat, a wallet, a balloon, a coin)
    for (const tt of this.r.tapTargets) {
      if (Math.hypot(tt.x - x, tt.y - y) < tt.r && g.tapCritter(tt.id)) return;
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
