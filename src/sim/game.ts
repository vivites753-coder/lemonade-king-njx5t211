// The game controller: owns the state, runs the day loop and the selling simulation.
// No DOM here — the UI and renderer only listen to `bus` and call public methods, so tests can run it headless.
import { Bus } from '../core/bus';
import { CONFIG } from '../core/config';
import { RNG } from '../core/rng';
import type { AgeMode, Avatar, EquipId, GoodId, Lang, LocationId, MixResult, Params, Phase, UpgradeId, WeatherId } from '../core/types';
import { EQUIPMENT } from '../data/equipment';
import { BAD_LEMONS_SHARE, LOC_EVENTS, type DayEventId } from '../data/events';
import { COOKIES, COOKIE_TASTE, GOODS, GOOD_IDS, SUGAR_HIKE } from '../data/goods';
import { DRINK_IDS, EXTRAS, MENU, extraFair, type DrinkId, type ExtraId, type Order } from '../data/menu';
import { TIP_GLOSSARY } from '../data/glossary';
import { LOCATIONS, LOCATION_IDS, locationUnlocked, storeSeats, storeSetupCost } from '../data/locations';
import { ROOM_D, type Seat } from '../data/storeRoom';
import { PED_TYPES } from '../data/pedTypes';
import { UPGRADES } from '../data/upgrades';
import { WEATHER, WEATHER_ORDER } from '../data/weather';
import {
  attentionRadius,
  breakEvenCups,
  costPerCup,
  interestChance,
  lemonReduction,
  lemonsConsumed,
  maxPitchers,
  pitcherCost,
  quality,
  repDelta,
  satisfaction,
  iceBonus,
  serveTime,
  stockValue,
  storeTax,
  tasteBalance,
  type Owned,
} from './economy';
import { activeUpgrades, applyWear, maintenanceCost, mixerBroken, repairCost, restore, rollBreaks, rollMiddayBreak } from './equipment';
import { pickLesson } from './lessons';
import { applyEvent, rollDayEvents } from './randomEvents';
import {
  dayExpenses,
  emptyKitchen,
  lemonsTotal,
  newDayState,
  newGameState,
  normalizeState,
  type DayReport,
  type DayState,
  type StoreDay,
  type PointReport,
  type Stain,
  type StoreState,
  type TruckLook,
  type GameState,
  type Recipe,
} from './state';
import { addDirt, cleanPct, dirtPerCustomer, dirtShare, wipeStain } from './cleaning';
import { ACCIDENTS, BONUSES, ELECTRIC, INCIDENT, type AccidentId, type BonusId } from '../data/incidents';
import { POINTS, STORE_GEAR, type WorkerIssue } from '../data/staff';
import { TRUCK_LOGOS, TRUCK_SKINS, TRUCK_TEXT_MAX } from '../data/truck';
import {
  candidates,
  freePlaces,
  isGirl,
  pointAt,
  pointsOpen,
  pointFixedCosts,
  pointHasRoomFor2,
  pointUps,
  pointWorkers,
  POINT_START,
  POINT_UPGRADE_IDS,
  recordDay,
  rollMorningIssue,
  rollTheft,
  simulatePoint,
  standCount,
  storePointAt,
  type Point,
  type PointDay,
  type Seller,
} from './points';
import { Critters } from './critters';
import { Street, type Ped, type StreetHost } from './street';
import { placeEventStop } from './traffic';

export type SfxName =
  | 'coin'
  | 'click'
  | 'pop'
  | 'buzz'
  | 'pour'
  | 'serve'
  | 'splash'
  | 'alarm'
  | 'fanfare'
  | 'buy'
  | 'mix'
  | 'break'
  | 'crash'
  | 'zap'
  | 'woof'
  | 'meow'
  // the kitchen
  | 'squeeze'
  | 'water'
  | 'sugar'
  | 'stir'
  | 'mixStart'
  | 'mixLoop'
  | 'mixPerfect'
  | 'mixOver'
  | 'jugReady'
  | 'pick'
  | 'drop'
  | 'spill'
  | 'ice'
  // the jingles of the day
  | 'dayStart'
  | 'profit'
  | 'loss'
  | 'repUp'
  | 'unlock'
  | 'king';

export interface CardInfo {
  id: string;
  icon: string;
  params?: Params;
  /** Offer to repair this equipment right from the card. */
  repair?: EquipId;
  /** A decision about the seller of this stand (see `workerChoice`). */
  point?: number;
  choices?: CardChoice[];
}

export interface CardChoice {
  act: string;
  /** i18n key of the button label. */
  key: string;
  params?: Params;
  style?: 'g' | 'r' | 'y';
  disabled?: boolean;
}

export type GameEvents = {
  phase: { phase: Phase };
  tip: { key: string };
  card: CardInfo;
  toast: { key: string; params?: Params; kind?: 'info' | 'warn' | 'good' };
  sale: { x: number; y: number; amount: number; sat: number; free: boolean; cookie?: boolean; icon?: string };
  sfx: { name: SfxName };
  thief: { state: 'appear' | 'hit' | 'caught' | 'stole' | 'locked'; amount?: number };
  changed: Record<string, never>;
  save: Snapshot;
  /** The kitchen opened or closed while selling. */
  kitchen: { open: boolean };
  /** A lucky find was picked up. */
  found: { x: number; y: number; amount: number; icon: string };
  /** The player wants to hire a seller for this stand (a card button): the UI opens the list of people. */
  hire: { point: number };
  /** The scene shows another stand of the player's (null: the player's own). */
  view: { point: number | null };
  /** A stain was wiped off the floor of the store (by the player or by the cleaner). */
  wiped: { x: number; y: number };
};

/** The cleaner of the store at work while the player sells there: only the show of her (where she is, what she mops). */
export interface Cleaner {
  x: number;
  y: number;
  /** The stain she goes to (or mops). */
  to: Stain | null;
  /** How long she has mopped it (simulation seconds). */
  mop: number;
  dirX: number;
  /** Walking down the screen (her face to us). */
  front: boolean;
  moving: boolean;
  anim: number;
}

/** Where the cleaner waits when the floor is clean: by the right end of the counter. */
const CLEANER_HOME = { x: 10.9, y: 2.55 };
/** She stands beside the stain she mops, the mop on it. */
const MOP_DX = 0.34;
/** Phases in which the floor of the store is in view and a stain can be wiped off with a tap. */
const CLEAN_PHASES: Phase[] = ['morning', 'prepare', 'sell', 'report', 'shop'];

export interface Serving {
  ped: Ped;
  t: number;
  dur: number;
  /** Poured by a helper (faster), not by the player. */
  helper: boolean;
  /** The player's pour of the pouring mini-game: it lasts while the button is held (`pourEnd`); rate = gauges a second. */
  pour?: { rate: number };
}

export interface Snapshot {
  v: 1;
  S: GameState;
  D: DayState;
  phase: Phase;
  rng: number;
  savedAt: number;
}

export type Cart = Record<GoodId, number>;
export const emptyCart = (): Cart => ({
  lemon: 0,
  lemon_cheap: 0,
  water: 0,
  sugar: 0,
  cups: 0,
  cups_super: 0,
  cookies: 0,
  orange: 0,
  juice: 0,
  pastry: 0,
  lemon_bulk: 0,
  water_bulk: 0,
  sugar_bulk: 0,
  cups_bulk: 0,
});
export type KitchenItem = 'lemon' | 'water' | 'sugar' | 'ice';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
const ISSUE_ICON: Record<WorkerIssue, string> = { sick: '🤒', late: '⏰', rude: '😠', raise: '💬', stole: '💸' };
/** Equipment names in params are translated by the UI. */
const equipName = (id: EquipId) => `@equip.${id}`;

export class Game {
  readonly bus = new Bus<GameEvents>();
  rng: RNG;
  S: GameState;
  D: DayState;
  phase: Phase = 'title';
  readonly street: Street;
  speed = 1;
  paused = false;
  /** Cups being poured, one slot per counter. */
  servings: (Serving | null)[] = [null, null];
  /** Lemonade being made at the stand: `jugs` pitchers are ready when the time is up. */
  making: { t: number; dur: number; jugs: number; cold: number } | null = null;
  /** The kitchen mini-game is open in the middle of the selling day (the world waits). */
  midKitchen = false;
  /** Actors of accidents and lucky finds (only for the show). */
  readonly critters = new Critters();
  cart: Cart = emptyCart();
  interest: ReturnType<typeof interestChance>;
  radius: number = CONFIG.BASE_RADIUS;
  /** Real seconds each counter's helper has waited with a customer in front. */
  private helperIdle = [0, 0];
  /** The scene shows this stand of the player's (null: the player's own). Not saved. */
  viewPoint: number | null = null;
  /** The cleaner of the store here at work (while selling; null when none is hired). Not saved. */
  cleaner: Cleaner | null = null;

  /** The first counter's pour (the player's usual counter). */
  get serving(): Serving | null {
    return this.servings[0];
  }

  set serving(v: Serving | null) {
    this.servings[0] = v;
  }

  /** Is anybody pouring a cup right now? */
  busy(): boolean {
    return this.servings.some((s) => s !== null);
  }

  constructor(seed = 1) {
    this.rng = new RNG(seed);
    this.S = newGameState(seed, { ageMode: 'pro', avatar: 'boy', lang: 'uk' });
    this.D = newDayState(this.S, 'sunny', 'sunny');
    this.D.hour = 9;
    this.street = new Street(this.makeHost());
    this.interest = this.calcInterest();
    this.street.reset(true);
  }

  private makeHost(): StreetHost {
    const self = this;
    return {
      get rng() {
        return self.rng;
      },
      hour: () => this.D.hour,
      location: () => this.S.location,
      weather: () => this.D.weather,
      crowd: () => this.D.events,
      selling: () => this.phase === 'sell',
      radius: () => this.radius,
      patienceMult: () => {
        let m = 1;
        for (const id of Object.keys(this.active()) as UpgradeId[]) m = Math.max(m, UPGRADES[id].patience ?? 1);
        return m;
      },
      isServed: (p) => this.servings.some((s) => s?.ped === p),
      onSpawnCounted: () => {
        this.D.funnel.passed++;
      },
      onInRange: (p) => this.onInRange(p),
      onImpatient: (p) => this.onImpatient(p),
      store: () => this.atStore(),
      seats: () => this.storeSeats(),
      sitMult: () => this.upgradeMult('sitMult'),
      onTip: (p) => this.tipFrom(p),
    };
  }

  /** Upgrades that work right now (broken equipment gives no bonus; nothing electric works in a blackout). */
  active(): Owned {
    const up = activeUpgrades(this.S);
    if (this.D && this.D.blackoutUntil > this.D.hour) for (const id of ELECTRIC) delete up[id];
    return up;
  }

  // ---------------------------------------------------------------- setup / save

  /**
   * `cheat`: a ready-made profile for testing: day 2 (no guided first day, every place is open), reputation 5,
   * 5000 coins and no tutorial tips.
   */
  newGame(o: { ageMode: AgeMode; avatar: Avatar; lang: Lang; seed?: number; name?: string; cheat?: boolean }): void {
    const seed = o.seed ?? (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    this.setRng(seed);
    this.S = newGameState(seed, o);
    if (o.cheat) {
      this.S.day = 2;
      this.S.rep = 5;
      this.S.bestRep = 5;
      this.S.coins = 5000;
      this.S.noTips = true;
    }
    this.speed = 1;
    this.paused = false;
    this.midKitchen = false;
    this.startMorning(0, []);
  }

  private setRng(seed: number, state?: number): void {
    this.rng = new RNG(seed);
    if (state !== undefined) this.rng.state = state;
  }

  snapshot(): Snapshot {
    return { v: 1, S: clone(this.S), D: clone(this.D), phase: this.phase, rng: this.rng.state, savedAt: Date.now() };
  }

  restore(snap: Snapshot): void {
    this.S = clone(snap.S);
    this.D = clone(snap.D);
    normalizeState(this.S, this.D);
    this.setRng(this.S.seed, snap.rng);
    this.servings = [null, null];
    this.making = null;
    this.midKitchen = false;
    this.paused = false;
    this.speed = 1;
    this.cart = emptyCart();
    // a loaded game starts at the player's own stand
    this.viewPoint = null;
    this.phase = snap.phase === 'title' ? 'morning' : snap.phase;
    this.street.reset(true);
    // the new crowd used the RNG; rewind so the simulation continues exactly from the snapshot
    this.rng.state = snap.rng;
    this.refreshInterest();
    if (this.phase === 'sell') this.D.funnel.passed += this.street.markAllCounted();
    this.critters.minY = this.atStore() ? ROOM_D + 0.3 : 0;
    this.placeCleaner();
    this.bus.emit('phase', { phase: this.phase });
  }

  private save(): void {
    if (this.phase === 'title') return;
    this.bus.emit('save', this.snapshot());
  }

  /** Saves the game as it is now, in the middle of the day too (the game goes to the background). */
  saveNow(): void {
    this.save();
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    // a new part of the day starts at the player's own stand
    if (this.viewPoint !== null) this.setView(null);
    this.save();
    this.bus.emit('phase', { phase: p });
  }

  /** Look at another stand of the player's (null: back to the own one; the store where the player is, is the own one). */
  setView(id: number | null): void {
    const p = id !== null ? this.pointById(id) : undefined;
    const next = p && p.loc !== this.S.location ? p.id : null;
    if (next === this.viewPoint) return;
    this.viewPoint = next;
    if (next !== null) this.tip('view');
    this.bus.emit('view', { point: next });
    this.changed();
  }

  /** Shows a Lemi tip once per game and unlocks its glossary cards. */
  tip(key: string): void {
    if (this.S.noTips || this.S.seenTips[key]) return;
    this.S.seenTips[key] = true;
    for (const g of TIP_GLOSSARY[key] ?? []) if (!this.S.glossary.includes(g)) this.S.glossary.push(g);
    this.bus.emit('tip', { key });
  }

  private toast(key: string, params?: Params, kind: 'info' | 'warn' | 'good' = 'info'): void {
    this.bus.emit('toast', { key, params, kind });
  }

  private sfx(name: SfxName): void {
    this.bus.emit('sfx', { name });
  }

  private card(id: string, icon: string, params?: Params, repair?: EquipId, extra: Partial<CardInfo> = {}): void {
    this.bus.emit('card', { id, icon, params, repair, ...extra });
  }

  changed(): void {
    this.bus.emit('changed', {});
  }

  // ---------------------------------------------------------------- morning

  private rollWeather(): WeatherId {
    const d = this.S.day;
    if (d <= 2) return 'sunny';
    if (d === 3) return 'rain';
    const weights = Object.fromEntries(Object.values(WEATHER).map((w) => [w.id, w.weight])) as Record<WeatherId, number>;
    const hist = this.S.weatherHistory;
    for (let i = 0; i < 10; i++) {
      const w = this.rng.weighted(weights);
      const n = hist.length;
      if (n >= 2 && hist[n - 1] === w && hist[n - 2] === w) continue;
      return w;
    }
    return 'sunny';
  }

  private forecastFor(w: WeatherId): WeatherId {
    if (this.S.day <= 3 || this.rng.chance(CONFIG.FORECAST_ACCURACY)) return w;
    const i = WEATHER_ORDER.indexOf(w);
    const j = i === 0 ? 1 : i === WEATHER_ORDER.length - 1 ? i - 1 : i + (this.rng.chance(0.5) ? 1 : -1);
    return WEATHER_ORDER[j];
  }

  private startMorning(spoiled: number, broke: EquipId[]): void {
    const w = this.rollWeather();
    const f = this.forecastFor(w);
    this.D = newDayState(this.S, w, f);
    this.D.spoiledOvernight = spoiled;
    // lemonade kept in the cooler overnight
    this.D.cupsReady = this.S.carryCups;
    this.D.carriedIn = this.S.carryCups;
    this.S.carryCups = 0;
    rollDayEvents(this);
    this.rollIncidents();
    this.critters.clear();
    // the player cannot stand where a seller of theirs works
    if (this.S.day === 1 || pointAt(this.S, this.S.location)) this.S.location = 'yard';
    this.servings = [null, null];
    this.making = null;
    this.paused = false;
    this.speed = 1;
    this.cart = emptyCart();
    this.refreshInterest();
    this.street.reset(true);
    const gift = this.grandmaHelp();
    this.setPhase('morning');
    this.sfx('dayStart');
    // grandma and the parents take turns
    if (gift > 0) this.card(this.S.day % 2 ? 'grandmaHelp' : 'parentsHelp', this.S.day % 2 ? '👵' : '👪', { n: gift });
    if (this.S.day === 1) this.tip('welcome');
    this.tip('morning');
    if (this.S.day >= 2) this.tip('location');
    if (spoiled > 0) this.tip('spoiled');
    if (this.D.carriedIn > 0) this.toast('toast.carried', { n: this.D.carriedIn }, 'good');
    for (const id of broke) this.card('broke', EQUIPMENT[id].icon, { item: equipName(id), cost: repairCost(this.S, id) }, id);
    if (broke.length) this.tip('breakdown');
    if (this.D.events.festival) this.card('festival', '🎉');
    for (const e of LOC_EVENTS) if (this.D.events[e.id]) this.card(`ev.${e.id}`, e.icon);
    this.morningStaff();
    this.rollBreakIn();
  }

  /** Places open for the player (some need a better reputation). */
  unlocked(id: LocationId): boolean {
    return locationUnlocked(this.S.bestRep, id);
  }

  /**
   * Soft safety net: when the purse holds less than FAMILY_HELP_BELOW coins, or coins and stock cannot make even one
   * pitcher, grandma or the parents help. Counts as income (a gift).
   */
  private grandmaHelp(): number {
    const onePitcher = Math.ceil(pitcherCost(this.S.recipe, this.active())) + CONFIG.CUPS_PER_PITCHER;
    const broke = this.S.coins < CONFIG.FAMILY_HELP_BELOW;
    if (!broke && this.S.coins + stockValue(this.S.stock) + this.D.cupsReady >= onePitcher) return 0;
    const gift = this.S.ageMode === 'kid' ? CONFIG.GRANDMA_GIFT_KID : CONFIG.GRANDMA_GIFT;
    this.S.coins += gift;
    this.D.bonus += gift;
    return gift;
  }

  /** Pick the place for today: in the morning, or while preparing (e.g. when the rent is too high). */
  chooseLocation(id: LocationId): boolean {
    if (this.phase !== 'morning' && this.phase !== 'prepare') return false;
    if (this.S.day === 1 && id !== 'yard') {
      this.toast('toast.day1yard', undefined, 'warn');
      return false;
    }
    if (!this.unlocked(id)) {
      this.toast('toast.locLocked', { n: LOCATIONS[id].minRep ?? 0 }, 'warn');
      this.sfx('buzz');
      return false;
    }
    if (pointAt(this.S, id)) {
      this.toast('toast.pointHere', undefined, 'warn');
      this.sfx('buzz');
      return false;
    }
    if (!this.storeReady(id)) {
      this.toast('toast.storeClosed', { n: storeSetupCost(id) }, 'warn');
      this.sfx('buzz');
      return false;
    }
    if (this.S.location === id) return true;
    this.S.location = id;
    // the store the player was looking at is the own scene now
    if (this.viewPoint !== null && this.pointById(this.viewPoint)?.loc === id) this.setView(null);
    if (LOCATIONS[id].indoor) this.tip('indoor');
    if (LOCATIONS[id].bus) this.tip('busstop');
    this.street.reset(true);
    this.refreshInterest();
    this.sfx('pop');
    this.changed();
    return true;
  }

  // ---------------------------------------------------------------- the own store (level 4)

  /** Today the player works at an own store (not at the stand). */
  atStore(): boolean {
    return !!LOCATIONS[this.S.location].store;
  }

  /** The chairs of the store here where served customers may sit down (the extra tables only with their upgrade). */
  storeSeats(): Seat[] {
    return storeSeats(this.S.location, this.active());
  }

  /** Electricity and water of the store here today: the premises, and what its equipment uses (the air conditioner). */
  storeUtilities(): number {
    const st = LOCATIONS[this.S.location].store;
    if (!st) return 0;
    let n = st.utilities;
    for (const id of Object.keys(this.active()) as UpgradeId[]) n += UPGRADES[id].utilities ?? 0;
    return n;
  }

  /** The product of one multiplier of the upgrades that work now (1 when none has it). */
  private upgradeMult(field: 'walletMult' | 'sitMult'): number {
    let m = 1;
    for (const id of Object.keys(this.active()) as UpgradeId[]) m *= UPGRADES[id][field] ?? 1;
    return m;
  }

  /** A customer leaves the table of the store: a tip now and then (only while the store is open). */
  private tipFrom(p: Ped): void {
    if (this.phase !== 'sell' || !this.rng.chance(CONFIG.TIP_CHANCE * (1 - CONFIG.DIRT_TIPS * this.dirt()))) return;
    const n = this.rng.int(CONFIG.TIP[0], CONFIG.TIP[1]);
    this.S.coins += n;
    this.D.tips += n;
    this.S.totals.earned += n;
    this.bus.emit('found', { x: p.x, y: p.y, amount: n, icon: '💛' });
    this.sfx('coin');
  }

  /** The point of the store where the player works today (its staff work with the player there). */
  storePoint(): Point | undefined {
    return this.atStore() ? storePointAt(this.S, this.S.location) : undefined;
  }

  /** The staff of the store here who work with the player today: one at each place of its counter. */
  storeStaff(): Seller[] {
    const p = this.storePoint();
    return p ? pointWorkers(p).slice(0, 2) : [];
  }

  /** Who of the store's staff stands at the counter with the player: girls or boys (for their pictures). */
  get helperGirls(): boolean[] | undefined {
    const staff = this.storeStaff();
    return staff.length ? staff.map((s) => isGirl(s.nameId)) : undefined;
  }

  /** The store here (its floor and its cleaner), when the player works at one. */
  storeHere(): StoreState | undefined {
    return this.atStore() ? this.S.stores[this.S.location] : undefined;
  }

  /** The share of the floor of the store here that is dirty (0: clean, and anywhere else). */
  dirt(): number {
    return dirtShare(this.storeHere());
  }

  /** How clean the floor of the store here is (per cent). */
  cleanliness(): number {
    return cleanPct(this.storeHere());
  }

  /** The cleaner's wage today: at the store here, when she is hired. */
  cleanerWage(): number {
    return this.storeHere()?.cleaner ? CONFIG.CLEANER_WAGE : 0;
  }

  /** Hire (or let go) the cleaner of a store: any time except while selling. She works every day the store is open. */
  setCleaner(loc: LocationId, on: boolean): boolean {
    const st = this.S.stores[loc];
    if (!st || !this.canManageStaff() || !!st.cleaner === on) return false;
    st.cleaner = on;
    if (on) this.tip('cleaner');
    else this.toast('toast.cleanerGone');
    this.sfx(on ? 'pop' : 'click');
    this.save();
    this.changed();
    return true;
  }

  /** The player wipes a stain off the floor of the store here (a tap on it; without one, the first stain). */
  cleanStain(s?: Stain): boolean {
    const st = this.storeHere();
    if (!st || !CLEAN_PHASES.includes(this.phase) || this.viewPoint !== null || (this.phase === 'sell' && (this.paused || this.midKitchen))) return false;
    const target = s ?? st.stains?.[0];
    if (!target || !wipeStain(st, target)) return false;
    // the cleaner was going to this one: she takes another
    if (this.cleaner?.to === target) {
      this.cleaner.to = null;
      this.cleaner.mop = 0;
    }
    this.bus.emit('wiped', { x: target.x, y: target.y });
    this.sfx('water');
    this.tip('cleaned');
    this.changed();
    return true;
  }

  /** A served customer of the store brings some dirt in (more on a rainy day). */
  private soil(): void {
    if (!this.atStore()) return;
    if (addDirt(this.S, this.S.location, dirtPerCustomer(this.D.weather), this.D.weather) > 0 && this.dirt() >= 0.25) this.tip('dirty');
  }

  /** The cleaner comes to work with the selling (when she is hired for the store here). */
  private placeCleaner(): void {
    this.cleaner = this.phase === 'sell' && this.storeHere()?.cleaner ? { ...CLEANER_HOME, to: null, mop: 0, dirX: -1, front: true, moving: false, anim: 0 } : null;
  }

  /** The cleaner walks to the nearest stain and mops it; with a clean floor she waits by the counter. */
  private stepCleaner(dt: number): void {
    const c = this.cleaner;
    const st = this.storeHere();
    if (!c || !st) return;
    const stains = st.stains ?? [];
    if (c.to && !stains.includes(c.to)) {
      c.to = null;
      c.mop = 0;
    }
    if (!c.to) {
      let best = Infinity;
      for (const s of stains) {
        const d = Math.hypot(s.x + MOP_DX - c.x, s.y - c.y);
        if (d < best) {
          best = d;
          c.to = s;
        }
      }
    }
    const goal = c.to ? { x: c.to.x + MOP_DX, y: c.to.y } : CLEANER_HOME;
    const dx = goal.x - c.x;
    const dy = goal.y - c.y;
    const d = Math.hypot(dx, dy);
    const step = CONFIG.CLEANER_SPEED * dt;
    if (d > 0.04) {
      const k = Math.min(1, step / d);
      c.x += dx * k;
      c.y += dy * k;
      c.moving = true;
      c.anim += dt * 9;
      // (on the screen: x − y is to the right, x + y is down)
      if (Math.abs(dx - dy) > 0.01) c.dirX = dx - dy > 0 ? 1 : -1;
      c.front = dx + dy >= 0;
      return;
    }
    c.moving = false;
    c.front = true;
    if (!c.to) {
      c.dirX = -1;
      return;
    }
    // the mop is on her left: she turns to the stain
    c.dirX = -1;
    c.mop += dt;
    if (c.mop < CONFIG.CLEANER_MOP) return;
    const s = c.to;
    c.to = null;
    c.mop = 0;
    if (wipeStain(st, s)) this.bus.emit('wiped', { x: s.x, y: s.y });
  }

  /** A place without a store, or one whose store is open (its renovation and equipment are paid). */
  storeReady(id: LocationId): boolean {
    return !LOCATIONS[id].store || !!this.S.stores[id];
  }

  canOpenStore(id: LocationId): { ok: boolean; reason?: 'na' | 'ready' | 'locked' | 'phase' | 'money' } {
    if (!LOCATIONS[id].store) return { ok: false, reason: 'na' };
    if (this.S.stores[id]) return { ok: false, reason: 'ready' };
    if (!this.unlocked(id)) return { ok: false, reason: 'locked' };
    if (this.phase !== 'morning' && this.phase !== 'prepare') return { ok: false, reason: 'phase' };
    if (this.S.coins < storeSetupCost(id)) return { ok: false, reason: 'money' };
    return { ok: true };
  }

  /**
   * Opens the store of a place: its renovation and equipment are paid once, and the player works there today. It is
   * an investment, not a cost of the day: the profits of the store pay it back (see the evening report).
   */
  openStore(id: LocationId): boolean {
    const can = this.canOpenStore(id);
    if (!can.ok) {
      if (can.reason === 'money') this.toast('toast.storeNoMoney', { n: storeSetupCost(id), coins: this.S.coins }, 'warn');
      this.sfx('buzz');
      return false;
    }
    const cost = storeSetupCost(id);
    this.S.coins -= cost;
    this.S.stores[id] = { opened: this.S.day, invested: cost, earned: 0, days: 0, stains: [], dirt: 0 };
    // it is among "My stands" too: staff hired for it run it while the player works elsewhere
    this.S.points.push({
      id: this.S.nextPointId++,
      loc: id,
      store: true,
      opened: this.S.day,
      seller: null,
      helper: null,
      issue: null,
      last: null,
      history: [],
      total: 0,
      upgrades: { ...STORE_GEAR },
      invested: cost,
      away: null,
    });
    this.sfx('buy');
    this.chooseLocation(id);
    this.card('storeOpened', '🏪', { place: `@loc.${id}.name`, n: cost, rent: LOCATIONS[id].rent, util: LOCATIONS[id].store!.utilities, tax: Math.round(CONFIG.STORE_TAX * 100) });
    this.tip('store');
    this.save();
    this.changed();
    return true;
  }

  /** Market trip: the fastest vehicle you have counts (bike 1 h, scooter 20 min). */
  tripHours(delivery = false): number {
    if (delivery) return 0;
    let h: number = CONFIG.MARKET_TRIP_H;
    for (const id of Object.keys(this.active()) as UpgradeId[]) h = Math.min(h, UPGRADES[id].tripHours ?? h);
    return h;
  }

  travelHours(id: LocationId = this.S.location): number {
    let reduce = 0;
    for (const u of Object.keys(this.active()) as UpgradeId[]) reduce = Math.max(reduce, UPGRADES[u].travelReduce ?? 0);
    return Math.max(0, LOCATIONS[id].travel - reduce);
  }

  /** Kitchen time for n pitchers (doubles when stirring by hand). */
  kitchenHours(n: number, hand = mixerBroken(this.S)): number {
    if (n <= 0) return 0;
    return (CONFIG.KITCHEN_BASE_H + CONFIG.KITCHEN_PER_PITCHER_H * n) * (hand ? 2 : 1);
  }

  /** Estimated opening hour. In the morning it includes a typical kitchen time (2 pitchers). */
  openingHour(withMarket: boolean, id: LocationId = this.S.location, delivery = false): number {
    const kitchen = this.phase === 'morning' || this.phase === 'market' ? this.kitchenHours(2) : 0;
    return this.D.hour + (withMarket ? this.tripHours(delivery) : 0) + kitchen + this.travelHours(id);
  }

  canGoMarket(delivery = false): boolean {
    return this.openingHour(true, this.S.location, delivery) < CONFIG.DAY_END - 1;
  }

  // ---------------------------------------------------------------- market

  goMarket(delivery = false): boolean {
    if (this.phase !== 'morning' && this.phase !== 'prepare' && this.phase !== 'kitchen') return false;
    if (delivery && !this.S.upgrades.delivery) return false;
    if (!this.canGoMarket(delivery)) {
      this.toast('toast.tooLateMarket', undefined, 'warn');
      this.sfx('buzz');
      return false;
    }
    this.D.delivery = delivery;
    if (!delivery) this.D.marketTrips++;
    this.D.hour += this.tripHours(delivery);
    this.cart = emptyCart();
    this.setPhase('market');
    this.tip(delivery ? 'delivery' : 'market');
    if (this.goodAvailable('lemon_bulk')) this.tip('wholesale');
    if (this.extrasOpen()) this.tip('menu');
    if (!this.D.marketCardsShown) {
      this.D.marketCardsShown = true;
      if (this.D.events.sugarHike) this.card('sugarHike', '📈', { price: this.goodPrice('sugar') });
      if (this.D.events.cupsSoldOut) this.card('cupsSoldOut', '🚚', { price: this.goodPrice('cups_super') });
    }
    return true;
  }

  goodPrice(id: GoodId): number {
    const g = GOODS[id];
    let p: number = g.price;
    if (id === 'sugar' && this.D.events.sugarHike) p = Math.round(p * SUGAR_HIKE);
    if (this.D.delivery) p = Math.ceil(p * (UPGRADES.delivery.deliveryMarkup ?? 1));
    return p;
  }

  goodAvailable(id: GoodId): boolean {
    // the wholesale warehouse sells to owners of a stand network (a store of one's own is not a network of stands)
    if (GOODS[id].wholesale) return standCount(this.S) > 0;
    // the menu of the store: for those who have one
    if (GOODS[id].needsStore && !Object.keys(this.S.stores).length) return false;
    const minRep = GOODS[id].minRep;
    if (minRep && this.S.bestRep < minRep - 1e-9) return false;
    if (id === 'cups') return !this.D.events.cupsSoldOut;
    if (GOODS[id].onlyWhenCupsSoldOut) return this.D.events.cupsSoldOut;
    return true;
  }

  cartTotal(): number {
    let t = 0;
    for (const id of GOOD_IDS) t += this.cart[id] * this.goodPrice(id);
    return t;
  }

  setCart(id: GoodId, qty: number): void {
    if (!this.goodAvailable(id)) qty = 0;
    this.cart[id] = clamp(Math.round(qty), 0, 99);
    this.changed();
  }

  /** Take everything out of the cart. */
  clearCart(): void {
    this.cart = emptyCart();
    this.changed();
  }

  /** Stock plus what is in the cart (units). */
  stockWithCart(): { lemons: number; water: number; sugar: number; cups: number } {
    const s = this.S.stock;
    const out = { lemons: lemonsTotal(s), water: s.water, sugar: s.sugar, cups: s.cups };
    for (const id of GOOD_IDS) {
      const g = GOODS[id];
      if (g.stock === 'lemons' || g.stock === 'water' || g.stock === 'sugar' || g.stock === 'cups') out[g.stock] += this.cart[id] * g.pack;
    }
    return out;
  }

  /** How many pitchers stock + cart allow with the current recipe. */
  pitchersWithCart(): number {
    const u = this.stockWithCart();
    const r = this.S.recipe;
    const lemonsPer = lemonsConsumed(r, this.active());
    return Math.max(
      0,
      Math.min(
        Math.floor(u.lemons / lemonsPer),
        Math.floor(u.water / CONFIG.WATER_PER_PITCHER),
        r.sugar > 0 ? Math.floor(u.sugar / r.sugar) : Infinity,
        Math.floor(u.cups / CONFIG.CUPS_PER_PITCHER),
      ),
    );
  }

  /**
   * A set for one pitcher: its lemons, water and cups (a pack of 10), whatever is at home already. Sugar comes in
   * packs for several pitchers, so a pack is added only when the sugar at home and in the cart is not enough.
   */
  addPitcherKit(): void {
    const r = this.S.recipe;
    const cupsId: GoodId = this.goodAvailable('cups') ? 'cups' : 'cups_super';
    this.cart.lemon += lemonsConsumed(r, this.active());
    this.cart.water += CONFIG.WATER_PER_PITCHER;
    this.cart[cupsId] += Math.ceil(CONFIG.CUPS_PER_PITCHER / GOODS[cupsId].pack);
    // the pitchers that lemons, water and cups allow now, and the sugar for them
    const u = this.stockWithCart();
    const jugs = Math.min(Math.floor(u.lemons / lemonsConsumed(r, this.active())), Math.floor(u.water / CONFIG.WATER_PER_PITCHER), Math.floor(u.cups / CONFIG.CUPS_PER_PITCHER));
    const sugar = jugs * r.sugar - u.sugar;
    if (sugar > 0) this.cart.sugar += Math.ceil(sugar / GOODS.sugar.pack);
    this.sfx('pop');
    this.changed();
  }

  pay(): boolean {
    if (this.phase !== 'market') return false;
    const total = this.cartTotal();
    if (total === 0) {
      this.leaveMarket();
      return true;
    }
    if (total > this.S.coins) {
      this.toast('toast.notEnough', { total, coins: this.S.coins }, 'warn');
      this.sfx('buzz');
      return false;
    }
    this.S.coins -= total;
    this.D.expenses.ingredients += total;
    let rotten = 0;
    let rottenCheap = 0;
    let boughtCheap = 0;
    for (const id of GOOD_IDS) {
      const n = this.cart[id];
      if (!n) continue;
      const g = GOODS[id];
      if (g.stock === 'lemons') {
        // a box of the wholesaler holds many lemons
        const units = n * g.pack;
        const bad = g.rotten ? this.rng.binomial(units, g.rotten) : this.D.events.badLemons ? this.rng.binomial(units, BAD_LEMONS_SHARE) : 0;
        this.addLemons(units - bad);
        if (g.rotten) {
          rottenCheap += bad;
          boughtCheap += units;
        } else rotten += bad;
      } else {
        this.S.stock[g.stock] += n * g.pack;
      }
    }
    this.D.rottenToday += rotten + rottenCheap;
    this.cart = emptyCart();
    this.sfx('coin');
    this.tip('stock');
    this.goKitchen();
    if (boughtCheap > 0) {
      this.toast(rottenCheap > 0 ? 'toast.cheapRotten' : 'toast.cheapLucky', { n: rottenCheap, total: boughtCheap }, rottenCheap > 0 ? 'warn' : 'good');
      this.tip('cheap_lemons');
    }
    if (rotten > 0) this.card('badLemons', '🤢', { n: rotten });
    return true;
  }

  private addLemons(n: number): void {
    if (n <= 0) return;
    const fresh = this.S.stock.lemons.find((b) => b.age === 0);
    if (fresh) fresh.n += n;
    else this.S.stock.lemons.push({ n, age: 0 });
  }

  leaveMarket(): void {
    if (this.phase !== 'market') return;
    this.cart = emptyCart();
    this.goKitchen();
  }

  skipMarket(): void {
    if (this.phase === 'morning') this.goKitchen();
  }

  // ---------------------------------------------------------------- kitchen (mini-game)

  goKitchen(): void {
    if (!['morning', 'market', 'prepare'].includes(this.phase)) return;
    this.D.kitchen = emptyKitchen();
    this.D.kitchenJugs = 0;
    this.setPhase('kitchen');
    this.tip('kitchen');
    if (mixerBroken(this.S)) this.tip('hand_stir');
    if (this.active().freezer) this.tip('ice');
  }

  /** The kitchen mini-game is on screen (before selling, or in the middle of the day). */
  inKitchen(): boolean {
    return this.phase === 'kitchen' || (this.phase === 'sell' && this.midKitchen);
  }

  /** Lemonade is over while selling: go and make more (the world waits meanwhile). */
  openKitchen(): boolean {
    if (this.phase !== 'sell' || this.midKitchen) return false;
    if (!this.canMakePitcher()) {
      this.toast('toast.noIngredients', undefined, 'warn');
      this.sfx('buzz');
      return false;
    }
    this.midKitchen = true;
    this.D.kitchen = emptyKitchen();
    this.D.kitchenJugs = 0;
    this.bus.emit('kitchen', { open: true });
    this.tip('kitchen');
    if (mixerBroken(this.S)) this.tip('hand_stir');
    this.changed();
    return true;
  }

  /** Back to the stand: the poured jugs are being made there (it takes time, no serving meanwhile). */
  closeKitchen(): void {
    if (!this.midKitchen) return;
    this.midKitchen = false;
    this.D.kitchen = emptyKitchen();
    this.bus.emit('kitchen', { open: false });
    this.changed();
  }

  /** Lemons squeezed into the jug so far (a juicer gets more juice out of them, see kitchenAdd). */
  kitchenLemons(): number {
    const k = this.D.kitchen;
    return k.juice > 0 ? lemonsConsumed({ lemons: k.juice, sugar: k.sugar }, this.active()) : 0;
  }

  /** What is still on the shelves: the stock minus what is already in the jug. */
  kitchenLeft(): Record<Exclude<KitchenItem, 'ice'>, number> {
    const k = this.D.kitchen;
    const st = this.S.stock;
    return { lemon: lemonsTotal(st) - this.kitchenLemons(), water: st.water - k.water, sugar: st.sugar - k.sugar };
  }

  /** Trays of ice still in the freezer (what is in the jug is not there any more). */
  kitchenIceLeft(): number {
    return (this.S.stock.ice ?? 0) - this.D.kitchen.ice;
  }

  /** Juice of one more lemon: a juicer squeezes more out of the first one (that is how it saves lemons). */
  private nextJuice(): number {
    const k = this.D.kitchen;
    return k.juice === 0 ? Math.min(CONFIG.KITCHEN_MAX_JUICE, 1 + lemonReduction(this.active())) : k.juice + 1;
  }

  /** Ingredients still free in the stock for one more unit in the jug. */
  kitchenCanAdd(item: KitchenItem): 'ok' | 'full' | 'noStock' {
    const k = this.D.kitchen;
    const st = this.S.stock;
    if (item === 'lemon') {
      if (k.juice >= CONFIG.KITCHEN_MAX_JUICE) return 'full';
      return this.kitchenLemons() + 1 <= lemonsTotal(st) ? 'ok' : 'noStock';
    }
    if (item === 'water') {
      if (k.water >= CONFIG.WATER_PER_PITCHER) return 'full';
      return st.water >= k.water + 1 ? 'ok' : 'noStock';
    }
    if (item === 'ice') {
      // one tray a jug; a broken freezer gives none
      if (k.ice >= CONFIG.ICE_PER_PITCHER) return 'full';
      return this.active().freezer && (st.ice ?? 0) >= k.ice + 1 ? 'ok' : 'noStock';
    }
    if (k.sugar >= CONFIG.KITCHEN_MAX_SUGAR) return 'full';
    return st.sugar >= k.sugar + 1 ? 'ok' : 'noStock';
  }

  kitchenAdd(item: KitchenItem): 'ok' | 'full' | 'noStock' | 'no' {
    if (!this.inKitchen()) return 'no';
    const can = this.kitchenCanAdd(item);
    if (can !== 'ok') {
      this.sfx('buzz');
      return can;
    }
    const k = this.D.kitchen;
    if (item === 'lemon') k.juice = this.nextJuice();
    else if (item === 'water') k.water++;
    else if (item === 'ice') k.ice++;
    else k.sugar++;
    // anything added after mixing has to be mixed again (ice goes in last: it does not)
    if (item !== 'ice') {
      k.mix = 'none';
      k.stir = 0;
    }
    this.sfx(item === 'lemon' ? 'squeeze' : item === 'water' ? 'water' : item === 'ice' ? 'ice' : 'sugar');
    // the first time the jug can be mixed, Lemi explains the mixer
    if (this.kitchenCanMix() && !this.S.upgrades.mixer_pro && !mixerBroken(this.S)) this.tip('mixer');
    this.changed();
    return 'ok';
  }

  kitchenReset(): void {
    if (!this.inKitchen()) return;
    this.D.kitchen = emptyKitchen();
    this.changed();
  }

  /** Fills the jug with yesterday's recipe (as far as the stock allows). Mixing is still needed. */
  kitchenRepeat(): void {
    if (!this.inKitchen()) return;
    this.D.kitchen = emptyKitchen();
    const r = this.S.recipe;
    for (let i = 0; i < CONFIG.WATER_PER_PITCHER; i++) if (this.kitchenCanAdd('water') === 'ok') this.D.kitchen.water++;
    while (this.D.kitchen.juice < r.lemons && this.kitchenCanAdd('lemon') === 'ok') this.D.kitchen.juice = this.nextJuice();
    for (let i = 0; i < r.sugar; i++) if (this.kitchenCanAdd('sugar') === 'ok') this.D.kitchen.sugar++;
    // the jug of last time had ice: ice again, if the freezer has it
    for (let i = 0; i < (r.ice ?? 0); i++) if (this.kitchenCanAdd('ice') === 'ok') this.D.kitchen.ice++;
    this.sfx('water');
    this.changed();
  }

  kitchenRecipe(): Recipe {
    const k = this.D.kitchen;
    return k.ice > 0 ? { lemons: k.juice, sugar: k.sugar, ice: k.ice } : { lemons: k.juice, sugar: k.sugar };
  }

  kitchenCanMix(): boolean {
    const k = this.D.kitchen;
    return k.water >= CONFIG.WATER_PER_PITCHER && k.juice >= 1;
  }

  /** Result of holding the mixer button (or perfect automatically with the pro mixer). */
  kitchenMix(result: Exclude<MixResult, 'none'>): void {
    if (!this.inKitchen() || !this.kitchenCanMix() || mixerBroken(this.S)) return;
    const k = this.D.kitchen;
    k.mix = this.S.upgrades.mixer_pro ? 'perfect' : result;
    k.hand = false;
    // stopped too early: the motor just stops (no sound of its own)
    if (k.mix !== 'under') this.sfx(k.mix === 'over' ? 'mixOver' : 'mixPerfect');
    if (k.mix === 'over') this.tip('mix_over');
    this.changed();
  }

  /** Stir by hand when the mixer is broken. Returns true when the lemonade is mixed. */
  kitchenStir(): boolean {
    if (!this.inKitchen() || !this.kitchenCanMix()) return false;
    const k = this.D.kitchen;
    if (k.mix !== 'none') return true;
    k.stir++;
    this.sfx('stir');
    if (k.stir >= CONFIG.STIR_TAPS) {
      k.mix = 'perfect';
      k.hand = true;
      this.sfx('mixPerfect');
    }
    this.changed();
    return k.mix !== 'none';
  }

  kitchenMaxPitchers(): number {
    if (this.D.kitchen.juice < 1) return 0;
    return maxPitchers(this.S.stock, this.kitchenRecipe(), this.active());
  }

  /** Time for the next jug: the first one of a kitchen visit also pays the set-up. */
  nextJugHours(hand = this.D.kitchen.hand || mixerBroken(this.S)): number {
    const h = (this.D.kitchenJugs === 0 ? CONFIG.KITCHEN_BASE_H : 0) + CONFIG.KITCHEN_PER_PITCHER_H;
    return h * (hand ? 2 : 1);
  }

  /**
   * Pour the mixed jug into one pitcher (10 cups): uses the ingredients and time. Every jug is made from
   * scratch — collect the ingredients and mix again for the next one.
   */
  kitchenPour(): boolean {
    if (!this.inKitchen()) return false;
    const k = this.D.kitchen;
    if (k.mix === 'none' || !this.kitchenCanMix()) {
      this.toast('toast.mixFirst', undefined, 'warn');
      this.sfx('buzz');
      return false;
    }
    if (this.kitchenMaxPitchers() < 1) {
      this.toast('toast.noIngredients', undefined, 'warn');
      this.sfx('buzz');
      return false;
    }
    const mid = this.phase === 'sell';
    const hours = this.nextJugHours(k.hand);
    if (!mid && this.D.hour + hours + this.travelHours() >= CONFIG.DAY_END - 0.5) {
      this.toast('toast.tooLate', undefined, 'warn');
      this.sfx('buzz');
      return false;
    }
    const recipe = this.kitchenRecipe();
    this.S.recipe = recipe;
    // (the recipe of the day has no ice: the quick pitcher of the tests and bots would take ice out of the freezer)
    this.D.recipeUsed = { lemons: recipe.lemons, sugar: recipe.sugar };
    const cold = recipe.ice ? CONFIG.CUPS_PER_PITCHER : 0;
    this.D.mixQuality = CONFIG.MIX_QUALITY[k.mix];
    this.consumePitcher(recipe);
    this.D.pitchersMade++;
    this.D.kitchenJugs++;
    if (mid) {
      // at the stand the jugs are made after the kitchen closes; serving waits meanwhile
      const dur = CONFIG.PITCHER_TIME * (k.hand ? 2 : 1);
      if (this.making) {
        this.making.dur += dur;
        this.making.jugs++;
        this.making.cold += cold;
      } else this.making = { t: 0, dur, jugs: 1, cold };
    } else {
      this.clampCold();
      this.D.cupsReady += CONFIG.CUPS_PER_PITCHER;
      this.D.coldCups += cold;
      this.D.hour += hours;
    }
    this.D.kitchen = emptyKitchen();
    this.sfx('jugReady');
    this.toast('toast.jugReady', { n: this.D.kitchenJugs }, 'good');
    if (this.D.kitchenJugs === 1) this.tip('kitchen_more');
    this.changed();
    return true;
  }

  /** From the kitchen to the stand (only if there is lemonade). */
  leaveKitchen(): void {
    // (the store can open with its juices alone)
    if (this.phase === 'kitchen' && this.anyDrinkLeft()) this.goPrepare();
    else if (this.midKitchen) this.closeKitchen();
  }

  // ---------------------------------------------------------------- prepare

  private goPrepare(): void {
    // a jug that was not poured goes back to the shelves
    this.D.kitchen = emptyKitchen();
    this.setPhase('prepare');
    this.tip('prepare_cost');
    this.tip('price');
    if (this.onlineAdsOpen()) this.tip('online_ads');
    if (this.S.day >= 2 && this.helperOpen()) this.tip('helper');
  }

  maxPitchersNow(recipe: Recipe = this.S.recipe): number {
    return maxPitchers(this.S.stock, recipe, this.active());
  }

  setPrice(p: number): void {
    this.S.price = clamp(Math.round(p), CONFIG.PRICE_MIN, CONFIG.PRICE_MAX);
    this.changed();
  }

  setFlyers(on: boolean): void {
    this.D.flyers = on;
    this.refreshInterest();
    this.changed();
  }

  /** Online ads can be ordered once the reputation has reached this level (the best ever reached counts). */
  onlineAdsOpen(): boolean {
    return this.S.bestRep >= CONFIG.ONLINE_ADS_MIN_REP - 1e-9;
  }

  setOnlineAds(on: boolean): void {
    this.D.onlineAds = on && this.onlineAdsOpen();
    this.refreshInterest();
    this.changed();
  }

  /** The helper can be hired once the reputation reaches 2. */
  helperOpen(): boolean {
    return this.S.bestRep >= CONFIG.HELPER_MIN_REP - 1e-9;
  }

  /** How many helpers can work today: one from reputation 2, two at a stand with two counters from 3. */
  helperCap(): number {
    if (!this.helperOpen()) return 0;
    return this.counters() >= 2 && this.S.bestRep >= CONFIG.HELPER2_MIN_REP - 1e-9 ? 2 : 1;
  }

  setHelper(on: boolean): void {
    this.setHelpers(on ? 1 : 0);
  }

  setHelpers(n: number): void {
    // at the own store the helpers are its staff (hired in "My stands")
    if (this.phase !== 'prepare' || this.storePoint()) return;
    this.D.helpers = clamp(Math.round(n), 0, this.helperCap());
    this.D.helper = this.D.helpers > 0;
    this.changed();
  }

  /** Serving counters of the stand (the big stand and the truck have two). */
  counters(): number {
    // the counter of a store has two places
    let n = this.atStore() ? 2 : 1;
    for (const id of Object.keys(this.active()) as UpgradeId[]) n = Math.max(n, UPGRADES[id].counters ?? 1);
    return n;
  }

  /** Queues that form at the stand: a seller alone serves one queue, even at a stand with two counters. */
  queues(): number {
    return this.counters() >= 2 && this.D.helpers >= 1 ? 2 : 1;
  }

  /** A helper serves this counter by himself. One helper takes the second counter, two helpers take both. */
  autoCounter(c: number): boolean {
    const h = this.D.helpers;
    if (h <= 0 || c >= this.counters()) return false;
    if (this.counters() === 1) return c === 0;
    return c === 1 || h >= 2;
  }

  /** The wages of today's helpers: the staff of the store here (their own wages), or the helpers hired for the day. */
  helperWages(): number {
    if (this.storePoint()) return this.storeStaff().reduce((n, w) => n + w.wage, 0);
    return this.D.helpers * CONFIG.HELPER_WAGE;
  }

  /** Coins needed today before opening (rent, utilities, flyers, online ads, the helpers' wages, the cleaner). */
  openingCosts(): number {
    const D = this.D;
    return (
      LOCATIONS[this.S.location].rent +
      this.storeUtilities() +
      (D.flyers ? CONFIG.FLYERS_COST : 0) +
      (D.onlineAds ? CONFIG.ONLINE_ADS_COST : 0) +
      this.helperWages() +
      this.cleanerWage()
    );
  }

  canStartSelling(): { ok: boolean; reason?: string } {
    if (!this.anyDrinkLeft()) return { ok: false, reason: 'toast.noLemonade' };
    if (this.D.hour + this.travelHours() >= CONFIG.DAY_END - 0.5) return { ok: false, reason: 'toast.tooLate' };
    if (this.S.coins < this.openingCosts()) return { ok: false, reason: 'toast.noRent' };
    return { ok: true };
  }

  startSelling(): boolean {
    if (this.phase !== 'prepare') return false;
    const chk = this.canStartSelling();
    if (!chk.ok) {
      this.toast(chk.reason!, { rent: this.openingCosts() }, 'warn');
      this.sfx('buzz');
      return false;
    }
    const D = this.D;
    const rent = LOCATIONS[this.S.location].rent;
    D.hour += this.travelHours();
    D.startHour = D.hour;
    D.lastRiskHour = Math.floor(D.hour);
    D.opened = true;
    if (rent) {
      this.S.coins -= rent;
      D.expenses.rent += rent;
    }
    // a store pays for electricity and water too
    const utilities = this.storeUtilities();
    if (utilities) {
      this.S.coins -= utilities;
      D.expenses.utilities += utilities;
    }
    if (D.flyers) {
      this.S.coins -= CONFIG.FLYERS_COST;
      D.expenses.flyers += CONFIG.FLYERS_COST;
    }
    if (D.onlineAds) {
      this.S.coins -= CONFIG.ONLINE_ADS_COST;
      D.expenses.onlineAds += CONFIG.ONLINE_ADS_COST;
    }
    // the helpers' wages (a stand with one counter has room for one helper; at the store its staff work with the player)
    D.helpers = this.storePoint() ? this.storeStaff().length : Math.min(D.helpers, this.helperCap());
    D.helper = D.helpers > 0;
    const wages = this.helperWages();
    if (wages > 0) {
      this.S.coins -= wages;
      D.expenses.wages += wages;
    }
    const cleaning = this.cleanerWage();
    if (cleaning > 0) {
      this.S.coins -= cleaning;
      D.expenses.cleaning += cleaning;
    }
    if (D.events.thiefAt !== null) D.events.thiefAt = Math.max(D.events.thiefAt, D.startHour + 1);
    this.servings = [null, null];
    this.making = null;
    this.helperIdle = [0, 0];
    this.speed = 1;
    this.refreshInterest();
    D.funnel.passed += this.street.markAllCounted();
    // the dogs, the cat and the finds stay outside the walls of the store
    this.critters.minY = this.atStore() ? ROOM_D + 0.3 : 0;
    this.openStands();
    this.setPhase('sell');
    this.placeCleaner();
    this.tip('sell_start');
    if (D.helpers > 0 && this.storePoint()) this.tip('store_staff');
    if (D.weather === 'rain') this.tip('rain');
    if (this.S.location === 'school') this.tip('school');
    return true;
  }

  private consumePitcher(r: Recipe): void {
    const st = this.S.stock;
    let need = lemonsConsumed(r, this.active());
    st.lemons.sort((a, b) => b.age - a.age);
    for (const b of st.lemons) {
      const take = Math.min(b.n, need);
      b.n -= take;
      need -= take;
      if (need <= 0) break;
    }
    st.lemons = st.lemons.filter((b) => b.n > 0);
    st.water -= CONFIG.WATER_PER_PITCHER;
    st.sugar -= r.sugar;
    st.cups -= CONFIG.CUPS_PER_PITCHER;
    if (r.ice) st.ice = Math.max(0, (st.ice ?? 0) - r.ice);
  }

  /** The iced cups are some of the ready ones: lemonade that was lost or sold cannot stay iced. */
  private clampCold(): void {
    this.D.coldCups = Math.max(0, Math.min(this.D.coldCups, this.D.cupsReady));
  }

  // ---------------------------------------------------------------- selling

  calcInterest(): ReturnType<typeof interestChance> {
    return interestChance({
      upgrades: this.active(),
      speakerOn: this.S.speakerOn,
      flyers: this.D.flyers,
      onlineAds: this.D.onlineAds,
      weather: this.D.weather,
      rep: this.S.rep,
      // the city festival is outdoors; indoor places have their own events
      festival: this.D.events.festival && !LOCATIONS[this.S.location].indoor,
      location: this.S.location,
      event: placeEventStop(this.S.location, this.D.events),
      scare: this.D.dogsUntil > this.D.hour ? { key: 'why.dogs', mult: INCIDENT.DOGS_STOP } : undefined,
      store: this.atStore(),
      dirt: this.dirt(),
    });
  }

  refreshInterest(): void {
    this.interest = this.calcInterest();
    this.radius = attentionRadius(this.active(), this.S.speakerOn);
  }

  /** Advance the world. `realDt` in seconds. */
  update(realDt: number): void {
    const rdt = Math.min(realDt, 0.1);
    if (this.phase !== 'sell') {
      if (!this.paused) this.street.update(rdt);
      return;
    }
    if (this.paused || this.midKitchen) return;
    const sim = rdt * this.speed;
    const n = Math.max(1, Math.ceil(sim / 0.05));
    for (let i = 0; i < n && this.phase === 'sell'; i++) this.stepSell(sim / n, rdt / n);
  }

  private stepSell(dt: number, rdt: number): void {
    const D = this.D;
    D.hour += dt / CONFIG.HOUR_SEC;
    this.refreshInterest();
    this.street.update(dt);

    for (let c = 0; c < this.servings.length; c++) {
      const s = this.servings[c];
      if (!s) continue;
      s.t += dt;
      if (s.t >= s.dur) this.completeServe(c);
    }
    if (this.making) {
      this.making.t += dt;
      if (this.making.t >= this.making.dur) {
        this.clampCold();
        D.cupsReady += CONFIG.CUPS_PER_PITCHER * this.making.jugs;
        D.coldCups += this.making.cold;
        this.making = null;
        D.outAsked = false;
        this.sfx('splash');
        this.toast('toast.pitcherReady', undefined, 'good');
      }
    }

    // helpers serve their counters by themselves; making more lemonade is the player's decision
    for (let c = 0; c < this.counters(); c++) {
      if (!this.autoCounter(c) || this.servings[c] || this.making) continue;
      if (this.street.frontReady(c) && this.anyDrinkLeft()) {
        this.helperIdle[c] += rdt;
        if (this.helperIdle[c] >= CONFIG.HELPER_DELAY) this.serveAt(c, true);
      } else this.helperIdle[c] = 0;
    }

    // the lemonade is over: ask the player once (until the next refill)
    if (D.cupsReady === 0 && !this.making && !this.busy() && !D.outAsked && this.canMakePitcher()) {
      D.outAsked = true;
      this.card('outOfLemonade', '🥛', undefined, undefined, {
        choices: [
          { act: 'later', key: 'card.later' },
          { act: 'kitchen', key: 'kitchen.makeMore', style: 'g' },
        ],
      });
    }

    if (D.events.thiefAt !== null && !D.thief.appeared && D.hour >= D.events.thiefAt && D.hour < CONFIG.DAY_END - 0.5) {
      D.thief.appeared = true;
      // the fox is at the own stand: the scene goes back there
      if (this.viewPoint !== null) this.setView(null);
      this.street.spawnThief();
      this.bus.emit('thief', { state: 'appear' });
      this.sfx('alarm');
      this.tip('thief');
    }
    if (this.street.thief && this.street.updateThief(rdt) === 'steal') this.thiefSteals();
    this.stepIncidents(rdt);
    this.stepCleaner(dt);
    if (this.street.sitting > 0) this.tip('tables');

    // a worn item may break during the day (about once per game hour we roll the dice)
    if (Math.floor(D.hour) > D.lastRiskHour) {
      D.lastRiskHour = Math.floor(D.hour);
      const broke = rollMiddayBreak(this.S, this.rng, D.weather);
      if (broke) {
        D.brokeToday.push(broke);
        this.refreshInterest();
        this.sfx('break');
        this.card('broke', EQUIPMENT[broke].icon, { item: equipName(broke), cost: repairCost(this.S, broke) }, broke);
        this.tip('breakdown');
      }
    }

    if (this.isSoldOut()) {
      if (D.soldOutAt === null) {
        D.soldOutAt = D.hour;
        this.toast('toast.soldOut', undefined, 'warn');
      }
      if (this.street.queued) this.street.sendAwayQueue('😢');
    }

    if (D.hour >= CONFIG.DAY_END) this.endDay();
  }

  canMakePitcher(): boolean {
    return maxPitchers(this.S.stock, this.D.recipeUsed, this.active()) >= 1;
  }

  isSoldOut(): boolean {
    return this.D.cupsReady <= 0 && !this.making && !this.canMakePitcher() && !this.extraDrinkLeft();
  }

  private onInRange(p: Ped): void {
    const f = this.D.funnel;
    f.inRange++;
    const chance = Math.min(CONFIG.MAX_STOP_CHANCE, this.interest.raw * PED_TYPES[p.type].interest);
    if (!this.rng.chance(chance)) return;
    f.stopped++;
    if (this.isSoldOut()) {
      f.soldOut++;
      this.street.setEmote(p, '😢', 2);
    } else if (this.S.price > p.maxPrice * this.upgradeMult('walletMult')) {
      f.tooExpensive++;
      this.street.setEmote(p, '💸', 2.4);
      this.tip('expensive');
    } else {
      // people pick the shorter queue (a second queue only forms when a helper works at the second counter)
      let best = -1;
      for (let c = 0; c < this.queues(); c++) {
        const len = this.street.queueFor(c).length;
        if (len < this.maxQueue() && (best < 0 || len < this.street.queueFor(best).length)) best = c;
      }
      if (best < 0) {
        f.queueFull++;
        this.street.setEmote(p, '⏳', 2);
        this.tip('queue');
      } else {
        f.joined++;
        this.street.joinQueue(p, best);
        if (best === 1) this.tip('two_queues');
      }
    }
  }

  private onImpatient(p: Ped): void {
    this.D.funnel.impatient++;
    this.S.rep = clamp(this.S.rep + CONFIG.REP_ANGRY, 0, 5);
    this.street.leave(p, '😠');
    this.tip('queue');
  }

  /** Places in the queue (the TV with cartoons adds some). */
  maxQueue(): number {
    let n: number = CONFIG.MAX_QUEUE;
    for (const id of Object.keys(this.active()) as UpgradeId[]) n += UPGRADES[id].queueBonus ?? 0;
    return n;
  }

  setCookiePrice(p: number): void {
    this.S.cookiePrice = clamp(Math.round(p), COOKIES.PRICE_MIN, COOKIES.PRICE_MAX);
    this.changed();
  }

  /** Cookies can be bought at the market from this reputation. */
  cookiesOpen(): boolean {
    return this.goodAvailable('cookies');
  }

  // ---------------------------------------------------------------- the menu of the store (fresh, juice, pastries)

  /** The menu of the store is open: the best reputation 4 and a store of one's own. */
  extrasOpen(): boolean {
    return this.S.bestRep >= MENU.MIN_REP - 1e-9 && Object.keys(this.S.stores).length > 0;
  }

  /** It is sold here and now: in the own store. */
  extrasHere(): boolean {
    return this.extrasOpen() && this.atStore();
  }

  setExtraPrice(id: ExtraId, p: number): void {
    this.S.extraPrices[id] = clamp(Math.round(p), MENU.PRICE_MIN, MENU.PRICE_MAX);
    this.changed();
  }

  /** Portions of a product of the menu in the stock (drinks also need a paper cup). */
  extraPortions(id: ExtraId): number {
    const e = EXTRAS[id];
    const n = Math.floor((this.S.stock[e.stock] ?? 0) / e.per);
    return e.stock === 'pastries' ? n : Math.min(n, this.S.stock.cups);
  }

  /** A glass of this drink can be poured now (the glasses being poured at the other counter are taken already). */
  private canPour(o: Order): boolean {
    if (o === 'lemonade') return this.freeCups() > 0;
    if (!this.extrasHere()) return false;
    const pouring = this.servings.filter((s) => s && s.ped.order === o).length;
    return this.extraPortions(o) > pouring;
  }

  /** A juice of the menu is left to pour here. */
  private extraDrinkLeft(): boolean {
    return DRINK_IDS.some((id) => this.canPour(id));
  }

  /** Something is left to pour: lemonade, or (in the store) a juice. */
  anyDrinkLeft(): boolean {
    return this.freeCups() > 0 || this.extraDrinkLeft();
  }

  /**
   * What a customer at the counter orders: lemonade, or in the store a juice of its menu, by their taste and the
   * prices (a price over the fair one puts people off, under it draws them); null: nothing here for them.
   */
  private chooseOrder(p: Ped): Order | null {
    const lemonade = this.canPour('lemonade');
    if (!this.extrasHere()) return lemonade ? 'lemonade' : null;
    const S = this.S;
    const fair = LOCATIONS[S.location].fairPrice;
    const wallet = p.maxPrice * this.upgradeMult('walletMult');
    const opts: [Order, number][] = [];
    if (lemonade) opts.push(['lemonade', (fair / Math.max(1, S.price)) ** 2]);
    for (const id of DRINK_IDS) {
      if (!this.canPour(id)) continue;
      const price = S.extraPrices[id];
      // they pay as much more for it as its fair price is above the lemonade's
      if (price > wallet * EXTRAS[id].fair) continue;
      opts.push([id, EXTRAS[id].taste[p.type] * (extraFair(id, fair) / Math.max(1, price)) ** 2]);
    }
    if (!opts.length) return null;
    let r = this.rng.range(0, opts.reduce((a, o) => a + o[1], 0));
    for (const [id, w] of opts) if ((r -= w) <= 0) return id;
    return opts[opts.length - 1][0];
  }

  /** The order of the customer at a counter: decided once (shown over their head), again when it ran out. */
  private orderOf(p: Ped): Order | null {
    if (p.order && this.canPour(p.order)) return p.order;
    const o = this.chooseOrder(p);
    p.order = o ?? undefined;
    if (o && o !== 'lemonade') this.street.setEmote(p, EXTRAS[o].icon, 3);
    return o;
  }

  /** A glass of a juice of the menu is sold (the pour is done). */
  private sellDrink(p: Ped, id: DrinkId, fill: 'perfect' | 'under' | 'timed'): void {
    const S = this.S;
    const D = this.D;
    const e = EXTRAS[id];
    // it ran out meanwhile: they choose again at the next pour
    if (this.extraPortions(id) < 1) {
      p.order = undefined;
      return;
    }
    S.stock[e.stock] -= e.per;
    S.stock.cups--;
    const price = S.extraPrices[id];
    D.funnel.sold++;
    S.totals.sold++;
    S.coins += price;
    D.sales += price;
    D.extraSales[id] += price;
    D.extraSold[id]++;
    S.totals.earned += price;
    let sat = satisfaction(e.quality, price, p.maxPrice * this.upgradeMult('walletMult') * e.fair, p.waited, p.patienceMax);
    if (fill === 'perfect') sat = Math.min(1, sat + CONFIG.PERFECT_POUR_BONUS);
    else if (fill === 'under') sat = Math.max(0, sat - CONFIG.UNDERFILL_PENALTY);
    // a dirty floor pleases nobody
    sat = Math.max(0, sat - CONFIG.DIRT_SAT * this.dirt());
    S.rep = clamp(S.rep + repDelta(sat, S.rep, this.active()), 0, 5);
    const emote = fill === 'under' && sat < 0.75 ? '😕' : sat >= 0.75 ? '😍' : sat >= 0.5 ? '🙂' : '😐';
    this.street.serveDone(p, emote);
    this.bus.emit('sale', { x: p.x, y: p.y, amount: price, sat, free: false, icon: e.icon });
    this.maybeSellPastry(p);
    this.maybeSellCookie(p);
    this.soil();
    this.sfx('coin');
    this.tip('menu_first');
  }

  /** In the store a customer may also take a pastry, if there are any and the price suits them. */
  private maybeSellPastry(p: Ped): void {
    const S = this.S;
    if (!this.extrasHere() || S.stock.pastries <= 0) return;
    if (!this.rng.chance(MENU.PASTRY_ATTACH * EXTRAS.pastry.taste[p.type])) return;
    const wallet = extraFair('pastry', LOCATIONS[S.location].fairPrice) * PED_TYPES[p.type].priceMult * this.rng.range(0.85, 1.35);
    const price = S.extraPrices.pastry;
    if (price > wallet) return;
    S.stock.pastries--;
    S.coins += price;
    this.D.sales += price;
    this.D.extraSales.pastry += price;
    this.D.extraSold.pastry++;
    S.totals.earned += price;
    this.bus.emit('sale', { x: p.x, y: p.y, amount: price, sat: 1, free: false, icon: EXTRAS.pastry.icon });
  }

  /** A lemonade customer may also take a cookie, if there are cookies and the price suits them. */
  private maybeSellCookie(p: Ped): void {
    const S = this.S;
    if ((S.stock.cookies ?? 0) <= 0) return;
    const wallet = COOKIES.FAIR * (LOCATIONS[S.location].fairPrice / 10) * PED_TYPES[p.type].priceMult * this.rng.range(0.85, 1.35);
    const want = this.rng.chance(COOKIES.ATTACH * (COOKIE_TASTE[p.type] ?? 1));
    if (!want) return;
    if (S.cookiePrice > wallet) {
      this.tip('cookie_expensive');
      return;
    }
    S.stock.cookies--;
    S.coins += S.cookiePrice;
    this.D.sales += S.cookiePrice;
    this.D.cookieSales += S.cookiePrice;
    this.D.cookiesSold++;
    S.totals.earned += S.cookiePrice;
    this.bus.emit('sale', { x: p.x, y: p.y, amount: S.cookiePrice, sat: 1, free: false, cookie: true });
    this.tip('cookie_first');
  }

  /**
   * The player taps to pour a cup. They take a counter no helper looks after first; if every customer
   * in front is at a helper's counter, the player helps there.
   */
  serve(): 'ok' | 'busy' | 'making' | 'noCustomer' | 'noCups' | 'no' {
    if (this.phase !== 'sell' || this.paused) return 'no';
    const order = [...Array(this.counters()).keys()].sort((a, b) => Number(this.autoCounter(a)) - Number(this.autoCounter(b)));
    let last: ReturnType<Game['serve']> = 'noCustomer';
    for (const c of order) {
      const r = this.serveAt(c, false);
      if (r === 'ok' || r === 'noCups' || r === 'making') return r;
      if (r === 'busy') last = 'busy';
    }
    return last;
  }

  /** The good part of the pouring gauge (shares of the top); the dispenser makes it wider. */
  pourZone(): [number, number] {
    return this.active().dispenser ? CONFIG.POUR_ZONE_DISPENSER : CONFIG.POUR_ZONE;
  }

  /** With the dispenser the tap stops by itself when the cup is full (this level): a tap on "Pour" is enough. */
  pourDose(): number | null {
    return this.active().dispenser ? CONFIG.POUR_DOSE_DISPENSER : null;
  }

  /** How fast this cup fills (gauges a second): a little different every time; the dispenser is fast and even. */
  private pourRate(): number {
    if (this.active().dispenser) return 1 / CONFIG.POUR_TIME_DISPENSER;
    return (1 + (Math.random() * 2 - 1) * CONFIG.POUR_VARY) / CONFIG.POUR_TIME;
  }

  /** The counter where the player is pouring now, or -1. */
  pouringAt(): number {
    return this.servings.findIndex((s) => !!s?.pour);
  }

  /**
   * The pouring mini-game: the player holds "Pour" and a cup starts filling at a counter (chosen like `serve`
   * does); it is finished by `pourEnd` when the button is let go.
   */
  pourStart(): ReturnType<Game['serve']> {
    if (this.phase !== 'sell' || this.paused) return 'no';
    if (this.pouringAt() >= 0) return 'busy';
    const order = [...Array(this.counters()).keys()].sort((a, b) => Number(this.autoCounter(a)) - Number(this.autoCounter(b)));
    let last: ReturnType<Game['serve']> = 'noCustomer';
    for (const c of order) {
      const r = this.serveAt(c, false, true);
      if (r === 'ok' || r === 'noCups' || r === 'making') return r;
      if (r === 'busy') last = 'busy';
    }
    return last;
  }

  /**
   * The player let go at `level` (share of the gauge). In the green zone the cup is sold; below it the cup is not
   * full and the customer is less happy; above it the cup overflows: that lemonade is lost and the customer waits
   * for another cup. A very short press pours nothing.
   */
  pourEnd(level: number): 'perfect' | 'under' | 'over' | 'cancel' | 'no' {
    const c = this.pouringAt();
    if (c < 0) return 'no';
    const [lo, hi] = this.pourZone();
    if (level < CONFIG.POUR_MIN) {
      this.servings[c] = null;
      return 'cancel';
    }
    // the dispenser never spills
    if (level > hi && this.pourDose() === null) {
      const order = this.servings[c]!.ped.order ?? 'lemonade';
      this.servings[c] = null;
      if (order !== 'lemonade') {
        if (this.extraPortions(order) > 0) this.S.stock[EXTRAS[order].stock] -= EXTRAS[order].per;
      } else if (this.D.cupsReady > 0) this.D.cupsReady--;
      this.sfx('spill');
      this.toast('toast.overPoured', undefined, 'warn');
      this.tip('pour_over');
      this.changed();
      return 'over';
    }
    const fill = level < lo ? 'under' : 'perfect';
    this.completeServe(c, fill);
    if (fill === 'under') this.tip('pour_under');
    return fill;
  }

  /** Cups of lemonade that no counter is pouring yet. */
  freeCups(): number {
    return this.D.cupsReady - this.servings.filter((s) => s).length;
  }

  /** Pour a cup at one counter (by the player or by that counter's helper). */
  serveAt(c: number, byHelper: boolean, pour = false): 'ok' | 'busy' | 'making' | 'noCustomer' | 'noCups' | 'no' {
    if (this.phase !== 'sell' || this.paused) return 'no';
    if (this.servings[c]) return 'busy';
    if (this.making) return 'making';
    const p = this.street.frontReady(c);
    if (!p) return 'noCustomer';
    // a cup that is being poured at the other counter is already taken
    if (!this.anyDrinkLeft()) {
      if (!byHelper) {
        this.toast(this.canMakePitcher() ? 'toast.needPitcher' : 'toast.soldOut', undefined, 'warn');
        this.sfx('buzz');
      }
      return 'noCups';
    }
    // what they order (in the store: lemonade or a juice); what is left may be too dear for them
    const order = this.orderOf(p);
    if (!order) {
      this.D.funnel.tooExpensive++;
      this.street.leave(p, '💸', 2.4);
      return 'noCustomer';
    }
    // fresh juice is squeezed for every glass: it takes longer
    const slow = order === 'lemonade' ? 1 : EXTRAS[order].time;
    this.helperIdle[c] = 0;
    // a counter that a helper looks after pours at the helper's speed
    // the player's pour of the mini-game lasts until the button is let go (its sound is played by the button)
    if (pour) {
      this.servings[c] = { ped: p, t: 0, dur: Infinity, helper: false, pour: { rate: this.pourRate() / slow } };
      return 'ok';
    }
    this.servings[c] = { ped: p, t: 0, dur: serveTime(this.active(), byHelper || this.autoCounter(c)) * slow, helper: byHelper };
    this.sfx('serve');
    return 'ok';
  }

  /** fill: how the player's pour of the mini-game ended ('timed' = a pour by time: a helper, or `serve`). */
  private completeServe(c = 0, fill: 'perfect' | 'under' | 'timed' = 'timed'): void {
    const p = this.servings[c]!.ped;
    this.servings[c] = null;
    if (!this.street.inQueue(p)) return;
    // a juice of the menu of the store
    if (p.order && p.order !== 'lemonade') {
      this.sellDrink(p, p.order, fill);
      return;
    }
    const S = this.S;
    const D = this.D;
    // the lemonade was spilt meanwhile: the customer keeps waiting for the next pitcher
    if (D.cupsReady <= 0) return;
    const up = this.active();
    this.clampCold();
    const cold = D.coldCups > 0;
    D.cupsReady--;
    if (cold) {
      D.coldCups--;
      D.coldSold++;
    }
    D.funnel.sold++;
    S.totals.sold++;
    // loyalty card: every N-th cup is a gift
    const every = up.loyalty ? UPGRADES.loyalty.freeEvery ?? 0 : 0;
    const free = every > 0 && S.totals.sold % every === 0;
    const paid = free ? 0 : S.price;
    if (free) D.freeCups++;
    S.coins += paid;
    D.sales += paid;
    S.totals.earned += paid;
    const q = quality(D.recipeUsed) * D.mixQuality;
    let sat = satisfaction(q, paid, p.maxPrice * this.upgradeMult('walletMult'), p.waited, p.patienceMax);
    // a cup poured just right pleases a little more, a cup not full pleases less
    if (fill === 'perfect') sat = Math.min(1, sat + CONFIG.PERFECT_POUR_BONUS);
    else if (fill === 'under') sat = Math.max(0, sat - CONFIG.UNDERFILL_PENALTY);
    // an iced cup is a cold drink: the customer is happier, and the reputation grows faster
    if (cold) sat = Math.min(1, sat + iceBonus(D.weather, LOCATIONS[S.location].indoor));
    // a dirty floor pleases nobody
    sat = Math.max(0, sat - CONFIG.DIRT_SAT * this.dirt());
    S.rep = clamp(S.rep + repDelta(sat, S.rep, up), 0, 5);
    const bal = tasteBalance(D.recipeUsed);
    const emote = free ? '🎁' : fill === 'under' && sat < 0.75 ? '😕' : sat >= 0.75 ? '😍' : sat >= 0.5 ? '🙂' : bal >= 2 ? '😝' : bal <= -2 ? '🥴' : '😐';
    this.street.serveDone(p, emote);
    this.bus.emit('sale', { x: p.x, y: p.y, amount: paid, sat, free });
    this.maybeSellPastry(p);
    this.maybeSellCookie(p);
    this.soil();
    this.sfx('coin');
    this.tip('first_sale');
    if (free) this.tip('loyalty');
    if (q < 0.6) this.tip('taste_bad');
    if (S.totals.sold >= 20) this.tip('reputation');
  }

  /**
   * Quick pitcher with the last recipe (costs time, no serving meanwhile; twice as long by hand).
   * The game UI opens the kitchen mini-game instead (`openKitchen`); tests and bots use this shortcut.
   */
  makePitcher(): boolean {
    if (this.phase !== 'sell' || this.making || this.busy() || this.paused) return false;
    if (!this.canMakePitcher()) {
      this.toast('toast.noIngredients', undefined, 'warn');
      this.sfx('buzz');
      return false;
    }
    this.consumePitcher(this.D.recipeUsed);
    this.D.pitchersMade++;
    this.making = { t: 0, dur: CONFIG.PITCHER_TIME * (mixerBroken(this.S) ? 2 : 1), jugs: 1, cold: 0 };
    this.sfx('splash');
    return true;
  }

  toggleSpeaker(): void {
    if (!this.S.upgrades.speaker) return;
    this.S.speakerOn = !this.S.speakerOn;
    this.refreshInterest();
    this.sfx('click');
    this.changed();
  }

  setSpeed(n: number): void {
    this.speed = clamp(n, 1, 10);
    this.paused = false;
    this.changed();
  }

  /** A tap on the fox. Three hits catch him. */
  hitThief(): 'hit' | 'caught' | null {
    const r = this.street.hitThief();
    if (r === 'hit') {
      this.bus.emit('thief', { state: 'hit', amount: this.street.thief?.hits ?? 0 });
      this.sfx('pop');
      this.tip('thief_hit');
    }
    if (r === 'caught') this.thiefCaught();
    return r;
  }

  /** One hit on the fox (true when it hit him). */
  catchThief(): boolean {
    return this.hitThief() !== null;
  }

  private thiefCaught(): void {
    this.D.thief.caught = true;
    this.S.coins += CONFIG.THIEF_REWARD;
    this.D.bonus += CONFIG.THIEF_REWARD;
    this.bus.emit('thief', { state: 'caught', amount: CONFIG.THIEF_REWARD });
    this.sfx('fanfare');
    this.card('thiefCaught', '🦊', { n: CONFIG.THIEF_REWARD });
  }

  private thiefSteals(): void {
    if (this.active().cash_lock) {
      this.bus.emit('thief', { state: 'locked' });
      this.sfx('pop');
      this.card('thiefLocked', '🔒');
      return;
    }
    const amount = Math.max(0, Math.min(CONFIG.THIEF_MAX, Math.floor(this.D.sales * 0.5), this.S.coins));
    this.S.coins -= amount;
    this.D.expenses.stolen += amount;
    this.D.thief.stolen = amount;
    this.bus.emit('thief', { state: 'stole', amount });
    this.sfx('buzz');
    this.card(amount > 0 ? 'thiefStole' : 'thiefEmpty', '🦊', { n: amount });
  }

  // ---------------------------------------------------------------- equipment

  repairCost(id: EquipId): number {
    return repairCost(this.S, id);
  }

  maintenanceCost(id: EquipId): number {
    return maintenanceCost(this.S, id);
  }

  /** Repair broken equipment. Before the evening it counts as today's expense. */
  repair(id: EquipId): boolean {
    if (!this.S.broken[id]) return false;
    const cost = repairCost(this.S, id);
    if (this.S.coins < cost) {
      this.toast('toast.notEnough', { total: cost, coins: this.S.coins }, 'warn');
      this.sfx('buzz');
      return false;
    }
    this.S.coins -= cost;
    if (this.phase !== 'report' && this.phase !== 'shop') this.D.expenses.repairs += cost;
    restore(this.S, id);
    this.refreshInterest();
    this.sfx('buy');
    this.toast('toast.repaired', { item: equipName(id) }, 'good');
    this.save();
    this.changed();
    return true;
  }

  /** Preventive maintenance in the shop: back to 100%. */
  maintain(id: EquipId): boolean {
    if (this.phase !== 'shop' || this.S.broken[id]) return false;
    const cost = maintenanceCost(this.S, id);
    if (cost <= 0 || this.S.coins < cost) {
      this.sfx('buzz');
      return false;
    }
    this.S.coins -= cost;
    restore(this.S, id);
    this.sfx('buy');
    this.save();
    this.changed();
    return true;
  }

  // ---------------------------------------------------------------- end of day

  /** Skip selling today (nothing to sell, too late, or just a day off). Goes straight to the evening report. */
  restDay(): void {
    if (!['morning', 'prepare', 'market', 'kitchen'].includes(this.phase)) return;
    this.cart = emptyCart();
    this.finishDay();
  }

  endDay(): void {
    if (this.phase !== 'sell') return;
    this.finishDay();
  }

  private finishDay(): void {
    const S = this.S;
    const D = this.D;
    this.servings = [null, null];
    this.making = null;
    this.cleaner = null;
    this.critters.clear();
    if (this.midKitchen) this.closeKitchen();
    this.street.sendAwayQueue();
    if (this.street.thief && (this.street.thief.state === 'run' || this.street.thief.state === 'grab')) this.street.thief = null;
    // unsold lemonade: poured out, or kept for tomorrow in the cooler (cups from the cooler are sold first)
    let wasted = D.cupsReady;
    let carried = 0;
    // the cooler (or the cold display of a store) keeps it
    if (this.active().cooler || (this.atStore() && D.opened)) {
      const oldLeft = Math.max(0, D.carriedIn - D.funnel.sold);
      wasted = Math.min(oldLeft, D.cupsReady);
      carried = D.cupsReady - wasted;
    }
    S.carryCups = carried;
    D.cupsReady = 0;
    applyWear(S, this.rng, D.weather, D.pitchersMade > 0, D.opened);
    // a day without selling: the stands open now (they pay their rent and wages first)
    if (S.points.some((p) => !p.today)) this.openStands();
    const prepaid = S.points.reduce((n, p) => n + (p.paid ?? 0), 0);
    const points = this.eveningPoints();
    const pointsIncome = points.reduce((n, p) => n + p.revenue, 0);
    const pointsCosts = points.reduce((n, p) => n + p.ingredients + p.rent + p.wage + p.stolen + (p.utilities ?? 0) + (p.cleaning ?? 0) + (p.tax ?? 0), 0);
    const pointsProfit = pointsIncome - pointsCosts;
    // the rent and the wages were paid in the morning; the takings minus the goods (and a theft) come in now
    S.coins += pointsProfit + prepaid;
    const store = this.storeDay();
    const income = D.sales + D.bonus + D.tips + pointsIncome;
    const expenses = dayExpenses(D) + pointsCosts;
    const f = { ...D.funnel };
    const report: DayReport = {
      sales: D.sales,
      cookieSales: D.cookieSales,
      cookiesSold: D.cookiesSold,
      extras: {
        orange: { sold: D.extraSold.orange, sales: D.extraSales.orange },
        multifruit: { sold: D.extraSold.multifruit, sales: D.extraSales.multifruit },
        pastry: { sold: D.extraSold.pastry, sales: D.extraSales.pastry },
      },
      bonus: D.bonus,
      income,
      expenses,
      ingredients: D.expenses.ingredients,
      rent: D.expenses.rent,
      flyers: D.expenses.flyers,
      onlineAds: D.expenses.onlineAds,
      stolen: D.expenses.stolen,
      wages: D.expenses.wages,
      repairs: D.expenses.repairs,
      training: D.expenses.training,
      profit: income - expenses,
      sold: f.sold,
      freeCups: D.freeCups,
      wastedCups: wasted,
      wasteCost: Math.round(wasted * costPerCup(D.recipeUsed, this.active())),
      carriedCups: carried,
      repStart: D.repStart,
      repEnd: S.rep,
      funnel: f,
      outOfRange: Math.max(0, f.passed - f.inRange),
      lesson: { key: 'lesson.profit', params: {} },
      stockValue: stockValue(S.stock),
      spoilTomorrow: S.stock.lemons.filter((b) => b.age + 1 >= CONFIG.LEMON_SPOIL_AGE).reduce((n, b) => n + b.n, 0),
      broke: [...D.brokeToday],
      unlocked: [],
      spilled: D.spilled,
      coldSold: D.coldSold,
      points,
      pointsProfit,
      pointsUnlocked: false,
      utilities: D.expenses.utilities,
      tax: D.expenses.tax,
      cleaning: D.expenses.cleaning,
      clean: store ? this.cleanliness() : undefined,
      tips: D.tips,
      store,
    };
    // reputation milestones open new places for good
    const before = S.bestRep;
    S.bestRep = Math.max(S.bestRep, S.rep);
    report.unlocked = LOCATION_IDS.filter((id) => !locationUnlocked(before, id) && locationUnlocked(S.bestRep, id));
    report.pointsUnlocked = before < POINTS.MIN_REP - 1e-9 && pointsOpen(S);
    report.lesson = pickLesson(S, D, report);
    S.history.push({ day: S.day, profit: report.profit, sold: f.sold, location: S.location, weather: D.weather });
    if (S.history.length > 60) S.history.shift();
    D.report = report;
    this.setPhase('report');
    this.tip('report');
    // one jingle for the day, the biggest news first
    const newStar = Math.floor(S.rep + 1e-9) > Math.floor(D.repStart + 1e-9);
    // (the king's jingle is kept for the real end of the game)
    if (report.unlocked.length || report.pointsUnlocked) this.sfx('unlock');
    else if (newStar) this.sfx('repUp');
    else if (report.profit > 0) this.sfx('profit');
    else if (report.profit < 0) this.sfx('loss');
    if (report.unlocked.length) this.card('locUnlocked', '🔓', { list: report.unlocked.map((id) => `@loc.${id}.name`).join(', ') });
    if (report.pointsUnlocked) this.card('pointsUnlocked', '🏪');
    for (const p of S.points) if (p.issue === 'stole' && p.seller) this.staffCard(p);
  }

  /**
   * The evening of a day at the own store: the tax on the day's profit (the takings minus the costs of the day; not
   * the takings themselves, and nothing on a loss), and the payback of the store.
   */
  private storeDay(): StoreDay | undefined {
    const S = this.S;
    const D = this.D;
    const st = S.stores[S.location];
    if (!this.atStore() || !D.opened || !st) return undefined;
    const e = D.expenses;
    // (training belongs to the sellers of the other stands, not to the store)
    const taxBase = D.sales + D.tips - (dayExpenses(D) - e.training);
    const tax = Math.min(S.coins, storeTax(taxBase));
    S.coins -= tax;
    e.tax += tax;
    st.earned += taxBase - tax;
    st.days++;
    // the day is in the history and the payback of the store's point too ("My stands")
    const p = storePointAt(S, S.location);
    if (p) {
      recordDay(p, {
        day: S.day,
        status: 'owner',
        sold: D.funnel.sold,
        revenue: D.sales + D.tips,
        ingredients: e.ingredients,
        rent: e.rent,
        wage: e.wages,
        stolen: e.stolen,
        profit: taxBase - tax,
        utilities: e.utilities,
        cleaning: e.cleaning,
        tax,
        clean: this.cleanliness(),
      });
      p.today = null;
      p.paid = 0;
    }
    const fixed = e.rent + e.utilities + e.flyers + e.onlineAds + e.wages + e.cleaning;
    return {
      loc: S.location,
      taxBase,
      tax,
      fixed,
      breakEven: breakEvenCups(fixed, S.price, costPerCup(D.recipeUsed, this.active())),
      invested: st.invested,
      earned: st.earned,
      days: st.days,
    };
  }

  // ---------------------------------------------------------------- accidents and lucky finds

  /** Morning: which accidents and finds happen today, and when. */
  private rollIncidents(): void {
    const S = this.S;
    const D = this.D;
    D.incidents = [];
    if (S.day < 2) return;
    let acc = 0;
    for (const a of ACCIDENTS) {
      if (acc >= INCIDENT.MAX_ACCIDENTS || S.day < a.minDay) continue;
      if (!this.rng.chance(a.chance)) continue;
      D.incidents.push({ id: a.id, kind: 'acc', at: this.rng.range(11, 18.5), done: false });
      acc++;
    }
    let found = 0;
    for (const b of BONUSES) {
      if (found >= INCIDENT.MAX_BONUSES || !this.rng.chance(b.chance)) continue;
      D.incidents.push({ id: b.id, kind: 'bonus', at: this.rng.range(10.5, 18.5), done: false });
      found++;
      // the lost cat is in the morning news
      if (b.id === 'cat' && D.newsKey.startsWith('news.calm')) D.newsKey = 'news.lostCat';
    }
  }

  /** Morning: thieves may have broken into the storeroom overnight (the cash lock protects it too). */
  private rollBreakIn(): void {
    const S = this.S;
    if (S.day < INCIDENT.BREAK_IN_MIN_DAY || !this.rng.chance(INCIDENT.BREAK_IN_CHANCE)) return;
    const st = S.stock;
    if (lemonsTotal(st) + st.sugar + st.cups + (st.cookies ?? 0) <= 0) return;
    if (this.active().cash_lock) {
      this.card('acc.breakInLocked', '🔒');
      return;
    }
    const k = INCIDENT.BREAK_IN_SHARE;
    let lemons = 0;
    for (const b of st.lemons) {
      const n = Math.floor(b.n * k);
      b.n -= n;
      lemons += n;
    }
    st.lemons = st.lemons.filter((b) => b.n > 0);
    const sugar = Math.floor(st.sugar * k);
    const cups = Math.floor(st.cups * k);
    const cookies = Math.floor((st.cookies ?? 0) * k);
    st.sugar -= sugar;
    st.cups -= cups;
    st.cookies = (st.cookies ?? 0) - cookies;
    this.sfx('crash');
    this.card('acc.breakIn', '🔓', { l: lemons, s: sugar, c: cups });
  }

  /** While selling: start what is due. */
  private stepIncidents(rdt: number): void {
    const D = this.D;
    for (const inc of D.incidents) {
      if (inc.done || D.hour < inc.at) continue;
      inc.done = true;
      if (inc.kind === 'acc') this.startAccident(inc.id as AccidentId);
      else this.startBonus(inc.id as BonusId);
    }
    this.critters.update(rdt);
    if (D.dogsUntil > 0 && D.hour >= D.dogsUntil) {
      D.dogsUntil = 0;
      this.critters.dismissDogs();
      this.refreshInterest();
    }
    if (D.blackoutUntil > 0 && D.hour >= D.blackoutUntil) {
      D.blackoutUntil = 0;
      this.refreshInterest();
      this.toast('toast.powerBack', undefined, 'good');
    }
  }

  private startAccident(id: AccidentId): void {
    const D = this.D;
    const def = ACCIDENTS.find((a) => a.id === id)!;
    if (def.outdoorOnly && LOCATIONS[this.S.location].indoor) return;
    switch (id) {
      case 'runner': {
        // (a boy running along the street runs into a stand, not into a store behind its walls)
        if (D.cupsReady <= 0 || this.atStore()) return;
        const n = Math.min(D.cupsReady, this.rng.int(4, 8));
        D.cupsReady -= n;
        D.spilled += n;
        this.critters.runner();
        this.sfx('crash');
        this.card('acc.runner', def.icon, { n });
        break;
      }
      case 'football': {
        if (D.cupsReady <= 0) return;
        const n = Math.min(D.cupsReady, CONFIG.CUPS_PER_PITCHER);
        D.cupsReady -= n;
        D.spilled += n;
        this.critters.ball();
        this.sfx('crash');
        this.card('acc.football', def.icon, { n });
        break;
      }
      case 'helperSpill': {
        if (D.helpers <= 0) return;
        const c = [0, 1].find((k) => this.autoCounter(k) && this.street.frontReady(k));
        const p = c === undefined ? null : this.street.frontReady(c);
        if (!p) return;
        if (this.servings[c!]?.ped === p) this.servings[c!] = null;
        this.street.leave(p, '😡', 3);
        this.critters.splash(p.x, p.y);
        this.S.rep = clamp(this.S.rep - INCIDENT.HELPER_SPILL_REP, 0, 5);
        this.sfx('splash');
        this.card('acc.helperSpill', def.icon);
        break;
      }
      case 'helperStole': {
        if (D.helpers <= 0 || D.sales <= 0) return;
        const n = Math.min(this.S.coins, clamp(Math.round(D.sales * 0.25), 5, CONFIG.THIEF_MAX));
        if (n <= 0) return;
        this.S.coins -= n;
        D.expenses.stolen += n;
        this.sfx('buzz');
        this.card('acc.helperStole', def.icon, { n });
        break;
      }
      case 'blackout':
        D.blackoutUntil = D.hour + INCIDENT.BLACKOUT_H;
        this.refreshInterest();
        this.sfx('zap');
        this.card('acc.blackout', def.icon);
        break;
      case 'dogs':
        D.dogsUntil = D.hour + INCIDENT.DOGS_H;
        this.critters.dogs(3);
        this.refreshInterest();
        this.sfx('woof');
        this.card('acc.dogs', def.icon);
        break;
    }
  }

  private startBonus(id: BonusId): void {
    const def = BONUSES.find((b) => b.id === id)!;
    this.critters[id](def.life);
    if (id === 'cat') this.sfx('meow');
    this.toast(`bonus.${id}.seen`, undefined, 'good');
    this.tip('bonus');
  }

  /** Developer mode: start an accident or a lucky find right now (while selling). */
  devIncident(id: string): void {
    if (this.phase !== 'sell') return;
    const kind = ACCIDENTS.some((a) => a.id === id) ? 'acc' : 'bonus';
    this.D.incidents.push({ id, kind, at: this.D.hour, done: false });
  }

  /** The player taps a critter: a lucky find pays out. */
  tapCritter(id: number): boolean {
    const c = this.critters.list.find((x) => x.id === id);
    if (!c || !c.bonus || this.phase !== 'sell') return false;
    const def = BONUSES.find((b) => b.id === c.kind);
    if (!def) return false;
    this.critters.remove(id);
    this.S.coins += def.reward;
    this.D.bonus += def.reward;
    this.S.rep = clamp(this.S.rep + def.rep, 0, 5);
    this.bus.emit('found', { x: c.x, y: c.y, amount: def.reward, icon: def.icon });
    this.sfx('coin');
    if (c.kind === 'cat') this.sfx('meow');
    this.toast(`bonus.${c.kind}.found`, { n: def.reward }, 'good');
    this.changed();
    return true;
  }

  // ---------------------------------------------------------------- my stands

  pointsOpen(): boolean {
    return pointsOpen(this.S);
  }

  pointById(id: number): Point | undefined {
    return this.S.points.find((p) => p.id === id);
  }

  /** New stands are built (and old ones sold) in the evening, like the other investments. */
  canOpenPoint(loc: LocationId): { ok: boolean; reason?: 'locked' | 'taken' | 'max' | 'evening' | 'money' } {
    if (!pointsOpen(this.S)) return { ok: false, reason: 'locked' };
    if (!freePlaces(this.S).includes(loc)) return { ok: false, reason: 'taken' };
    if (standCount(this.S) >= POINTS.MAX) return { ok: false, reason: 'max' };
    if (this.phase !== 'shop') return { ok: false, reason: 'evening' };
    if (this.S.coins < POINTS.COST) return { ok: false, reason: 'money' };
    return { ok: true };
  }

  openPoint(loc: LocationId): Point | null {
    if (!this.canOpenPoint(loc).ok) {
      this.sfx('buzz');
      return null;
    }
    this.S.coins -= POINTS.COST;
    const p: Point = {
      id: this.S.nextPointId++,
      loc,
      opened: this.S.day,
      seller: null,
      issue: null,
      last: null,
      history: [],
      total: 0,
      upgrades: { ...POINT_START },
      invested: POINTS.COST,
      away: null,
      helper: null,
    };
    this.S.points.push(p);
    this.sfx('buy');
    this.tip('points');
    this.save();
    this.changed();
    return p;
  }

  /** Coins you get back when you close a stand: half of everything put into it. */
  pointRefund(p: Point): number {
    return Math.round((p.invested ?? POINTS.COST) * POINTS.SELL_BACK);
  }

  closePoint(id: number): boolean {
    const i = this.S.points.findIndex((p) => p.id === id);
    // (a store is not sold: it is the player's own premises)
    if (i < 0 || this.phase !== 'shop' || this.S.points[i].store) return false;
    const refund = this.pointRefund(this.S.points[i]);
    if (this.viewPoint === id) this.setView(null);
    this.S.points.splice(i, 1);
    this.S.coins += refund;
    this.sfx('coin');
    this.save();
    this.changed();
    return true;
  }

  /** Can this stand get this upgrade now? Bought in the evening, like the player's own upgrades. */
  canBuyPointUpgrade(pointId: number, id: UpgradeId): { ok: boolean; reason?: 'na' | 'owned' | 'rep' | 'requires' | 'money' | 'evening' } {
    const p = this.pointById(pointId);
    // (the things of a store are bought in the evening shop: they work for all the stores)
    if (!p || p.store || !POINT_UPGRADE_IDS.includes(id)) return { ok: false, reason: 'na' };
    const up = pointUps(p);
    const u = UPGRADES[id];
    if (up[id]) return { ok: false, reason: 'owned' };
    if (u.minRep && this.S.bestRep < u.minRep - 1e-9) return { ok: false, reason: 'rep' };
    if (u.requires && !up[u.requires]) return { ok: false, reason: 'requires' };
    if (this.phase !== 'shop') return { ok: false, reason: 'evening' };
    if (this.S.coins < u.price) return { ok: false, reason: 'money' };
    return { ok: true };
  }

  buyPointUpgrade(pointId: number, id: UpgradeId): boolean {
    const p = this.pointById(pointId);
    if (!p || !this.canBuyPointUpgrade(pointId, id).ok) {
      this.sfx('buzz');
      return false;
    }
    const price = UPGRADES[id].price;
    this.S.coins -= price;
    p.upgrades = { ...pointUps(p), [id]: true };
    p.invested = (p.invested ?? POINTS.COST) + price;
    this.sfx('buy');
    this.save();
    this.changed();
    // the scene of this stand shows the new thing at once
    if (this.viewPoint === pointId) this.bus.emit('view', { point: pointId });
    return true;
  }

  /** Hiring and firing: any time except while selling. */
  canManageStaff(): boolean {
    return this.phase !== 'sell' && this.phase !== 'title';
  }

  candidates(pointId: number): Seller[] {
    return candidates(this.S, pointId);
  }

  /** Hire one of today's candidates as the seller of a stand, or as its second worker (`helper`). */
  hireSeller(pointId: number, index: number, role: 'seller' | 'helper' = 'seller'): boolean {
    const p = this.pointById(pointId);
    if (!p || !this.canManageStaff()) return false;
    if (role === 'seller' ? p.seller : p.helper) return false;
    // a second worker needs a counter of their own (the big stand or the truck)
    if (role === 'helper' && !pointHasRoomFor2(p)) return false;
    const c = candidates(this.S, pointId)[index];
    if (!c) return false;
    if (role === 'helper') p.helper = c;
    else {
      p.seller = c;
      p.issue = null;
    }
    this.sfx('pop');
    this.tip(role === 'helper' ? 'hire2' : 'hire');
    this.save();
    this.changed();
    return true;
  }

  fireHelper(pointId: number): boolean {
    const p = this.pointById(pointId);
    if (!p || !p.helper || !this.canManageStaff()) return false;
    this.toast('toast.fired', { name: `@staff.name${p.helper.nameId}` });
    p.helper = null;
    this.sfx('click');
    this.save();
    this.changed();
    return true;
  }

  fireSeller(pointId: number): boolean {
    const p = this.pointById(pointId);
    if (!p || !p.seller || !this.canManageStaff()) return false;
    this.toast('toast.fired', { name: `@staff.name${p.seller.nameId}` });
    p.seller = null;
    p.issue = null;
    this.sfx('click');
    this.save();
    this.changed();
    return true;
  }

  /** Morning: sellers call with their problems. */
  private morningStaff(): void {
    for (const p of this.S.points) {
      p.today = null;
      if (p.away) {
        p.away.days--;
        if (p.away.days <= 0) this.sellerBack(p);
      }
      p.issue = rollMorningIssue(this.S, p, this.rng);
      // the own seller falls ill for some days: the stand needs a stand-in (a stand-in who falls ill misses one day)
      if (p.issue === 'sick' && p.seller && !p.away) {
        p.away = { seller: p.seller, days: this.rng.int(POINTS.SICK_DAYS[0], POINTS.SICK_DAYS[1]) };
        p.seller = null;
      }
      if (p.issue) this.staffCard(p);
    }
  }

  /** The ill seller is well again: back to work, or the player chooses between them and the stand-in. */
  private sellerBack(p: Point): void {
    const back = p.away?.seller;
    if (!back) {
      p.away = null;
      return;
    }
    const params: Params = { name: `@staff.name${back.nameId}`, place: `@loc.${p.loc}.name` };
    if (!p.seller) {
      p.seller = back;
      p.away = null;
      this.toast('toast.sellerBack', params, 'good');
      return;
    }
    params.other = `@staff.name${p.seller.nameId}`;
    // the choice is made on the card; until then the stand-in keeps working
    this.card('staff.back', '🙂', params, undefined, {
      point: p.id,
      choices: [
        { act: 'keepOld', key: 'staff.act.keepOld', params: { name: `@staff.name${back.nameId}` }, style: 'g' },
        { act: 'keepNew', key: 'staff.act.keepNew', params: { name: `@staff.name${p.seller.nameId}` } },
      ],
    });
  }

  /**
   * The stands open: each one pays its rent and its seller's wage from the coins first (like the player's own stand).
   * A stand the player cannot pay for stays closed today. Then the day of every stand is known.
   */
  private openStands(): void {
    for (const p of this.S.points) {
      p.paid = 0;
      // the player opens this store today: its staff work with the player (their wages are the player's own costs)
      if (p.store && p.loc === this.S.location && this.D.opened) {
        p.today = { day: this.S.day, status: 'owner', sold: 0, revenue: 0, ingredients: 0, rent: 0, wage: 0, stolen: 0, profit: 0 };
        continue;
      }
      const fixed = pointFixedCosts(this.S, p);
      if (fixed > 0 && this.S.coins < fixed) {
        p.today = { day: this.S.day, status: 'nomoney', sold: 0, revenue: 0, ingredients: 0, rent: 0, wage: 0, stolen: 0, profit: 0 };
        this.toast('toast.standNoMoney', { place: `@loc.${p.loc}.name`, n: fixed }, 'warn');
        continue;
      }
      this.S.coins -= fixed;
      p.paid = fixed;
      p.today = simulatePoint(this.S, p, this.D.weather, this.D.events, this.rng);
    }
  }

  /** Evening: every stand's day in numbers; a dishonest seller may take money from the till. */
  private eveningPoints(): PointReport[] {
    const out: PointReport[] = [];
    for (const p of this.S.points) {
      // the player worked at this store today: its day is the player's own (see storeDay)
      if (p.today?.status === 'owner') continue;
      const d = p.today ?? simulatePoint(this.S, p, this.D.weather, this.D.events, this.rng);
      p.today = null;
      p.paid = 0;
      p.issue = rollTheft(p, d, this.rng) > 0 ? 'stole' : null;
      if (p.store) this.storeEvening(p, d);
      recordDay(p, d);
      out.push({ ...d, id: p.id, loc: p.loc, nameId: p.seller?.nameId ?? null });
    }
    return out;
  }

  /** The evening of a store its staff ran: the dirt of the day stays on the floor (a cleaner wipes it all off), and the
   * payback of the store. */
  private storeEvening(p: Point, d: PointDay): void {
    const st = this.S.stores[p.loc];
    if (!st) return;
    if (d.status !== 'empty' && d.status !== 'sick' && d.status !== 'nomoney') {
      if (st.cleaner) {
        st.stains = [];
        st.dirt = 0;
      } else addDirt(this.S, p.loc, d.dirt ?? 0, this.D.weather);
      st.days++;
    }
    st.earned += d.profit;
    d.clean = cleanPct(st);
  }

  /** A card about a problem with a seller, with the choices the player has. */
  private staffCard(p: Point): void {
    // an ill seller is at home (p.away) while the card is shown
    const s = p.seller ?? (p.issue === 'sick' ? p.away?.seller : null);
    const issue = p.issue;
    if (!s || !issue) return;
    const params: Params = { name: `@staff.name${s.nameId}`, place: `@loc.${p.loc}.name` };
    const fire: CardChoice = { act: 'fire', key: 'staff.act.fire', style: 'r' };
    let choices: CardChoice[] | undefined;
    switch (issue) {
      case 'late':
        params.n = s.warnings + 1;
        choices = s.warnings + 1 >= POINTS.MAX_WARNINGS ? [fire] : [{ act: 'warn', key: 'staff.act.warn', style: 'y' }, fire];
        break;
      case 'rude':
        choices = [
          { act: 'ignore', key: 'staff.act.ignore' },
          { act: 'train', key: 'staff.act.train', params: { cost: POINTS.TRAIN_COST }, style: 'g', disabled: this.S.coins < POINTS.TRAIN_COST },
          fire,
        ];
        break;
      case 'raise':
        params.old = s.wage;
        params.new = s.wage + POINTS.RAISE;
        choices = [
          { act: 'refuse', key: 'staff.act.refuse' },
          { act: 'agree', key: 'staff.act.agree', style: 'g' },
        ];
        break;
      case 'stole':
        params.n = p.last?.stolen ?? 0;
        choices = [{ act: 'chance', key: 'staff.act.chance' }, { ...fire, style: 'y' }];
        break;
      case 'sick':
        // ill for some days: find a stand-in or keep the stand closed; a stand-in who is ill misses only today
        if (p.away && !p.seller) {
          params.n = p.away.days;
          choices = [
            { act: 'standin', key: 'staff.act.standin', style: 'g' },
            { act: 'wait', key: 'staff.act.wait' },
          ];
          this.card('staff.ill', ISSUE_ICON.sick, params, undefined, { point: p.id, choices });
          return;
        }
        break;
    }
    this.card(`staff.${issue}`, ISSUE_ICON[issue], params, undefined, { point: p.id, choices });
  }

  /** The player's answer on a seller card. Returns true when the card can close. */
  workerChoice(pointId: number, act: string): boolean {
    const p = this.pointById(pointId);
    if (!p) return true;
    if (act === 'standin') {
      // the people who want the job: the UI shows the list
      this.bus.emit('hire', { point: p.id });
      return true;
    }
    if (act === 'wait') return true;
    if (act === 'keepOld' || act === 'keepNew') {
      const back = p.away?.seller;
      if (back && act === 'keepOld') {
        if (p.seller) this.toast('toast.standinLeft', { name: `@staff.name${p.seller.nameId}` });
        p.seller = back;
      }
      p.away = null;
      this.save();
      this.changed();
      return true;
    }
    const s = p.seller;
    if (!s) return true;
    switch (act) {
      case 'fire':
        this.fireSeller(pointId);
        return true;
      case 'warn':
        s.warnings++;
        break;
      case 'train':
        if (this.S.coins < POINTS.TRAIN_COST) return false;
        this.S.coins -= POINTS.TRAIN_COST;
        this.D.expenses.training += POINTS.TRAIN_COST;
        s.skill = Math.min(1.1, Math.round((s.skill + POINTS.TRAIN_SKILL) * 100) / 100);
        // customers are treated well again from today
        p.issue = null;
        break;
      case 'agree':
        s.wage += POINTS.RAISE;
        p.issue = null;
        break;
      case 'refuse':
        p.issue = null;
        if (this.rng.chance(POINTS.QUIT_ON_REFUSE)) {
          p.seller = null;
          this.card('staff.quit', '👋', { name: `@staff.name${s.nameId}`, place: `@loc.${p.loc}.name` });
        }
        break;
      case 'chance':
        // they got away with it once: the next time is more likely
        s.honesty = Math.max(0, s.honesty - POINTS.SECOND_CHANCE_HONESTY);
        p.issue = null;
        break;
    }
    this.save();
    this.changed();
    return true;
  }

  /** A button on an event card. Returns true when the card can close. */
  cardChoice(card: CardInfo, act: string): boolean {
    if (card.point !== undefined) return this.workerChoice(card.point, act);
    if (card.id === 'outOfLemonade' && act === 'kitchen') this.openKitchen();
    return true;
  }

  // ---------------------------------------------------------------- evening

  openShop(): void {
    if (this.phase !== 'report') return;
    this.setPhase('shop');
    this.tip('shop');
    if (Object.values(this.S.condition).some((c) => (c ?? 100) < 60)) this.tip('maintenance');
  }

  canBuy(id: UpgradeId): { ok: boolean; reason?: 'owned' | 'rep' | 'store' | 'requires' | 'money' } {
    const u = UPGRADES[id];
    if (this.S.upgrades[id]) return { ok: false, reason: 'owned' };
    if (u.minRep && this.S.bestRep < u.minRep - 1e-9) return { ok: false, reason: 'rep' };
    if (u.storeOnly && !Object.keys(this.S.stores).length) return { ok: false, reason: 'store' };
    if (u.requires && !this.S.upgrades[u.requires]) return { ok: false, reason: 'requires' };
    if (this.S.coins < u.price) return { ok: false, reason: 'money' };
    return { ok: true };
  }

  buyUpgrade(id: UpgradeId): boolean {
    if (this.phase !== 'shop' || !this.canBuy(id).ok) {
      this.sfx('buzz');
      return false;
    }
    this.S.coins -= UPGRADES[id].price;
    this.S.upgrades[id] = true;
    if (id in EQUIPMENT) this.S.condition[id as EquipId] = 100;
    if (id === 'mixer_pro') restore(this.S, 'mixer');
    if (id === 'speaker') this.S.speakerOn = true;
    this.refreshInterest();
    this.sfx('buy');
    this.save();
    this.changed();
    return true;
  }

  sleep(): void {
    if (this.phase !== 'shop' && this.phase !== 'report') return;
    let spoiled = 0;
    for (const b of this.S.stock.lemons) b.age++;
    this.S.stock.lemons = this.S.stock.lemons.filter((b) => {
      if (b.age >= CONFIG.LEMON_SPOIL_AGE) {
        spoiled += b.n;
        return false;
      }
      return b.n > 0;
    });
    // pastries are fresh: of those left this share goes stale overnight
    const stale = Math.round(this.S.stock.pastries * MENU.PASTRY_STALE);
    this.S.stock.pastries -= stale;
    // worn equipment may break overnight; the player finds out in the morning
    const broke = rollBreaks(this.S, this.rng);
    // the freezer makes ice for tomorrow; a broken one makes none, and what was in it melts
    const iceBefore = this.S.stock.ice ?? 0;
    if (this.S.upgrades.freezer) {
      if (this.S.broken.freezer) this.S.stock.ice = 0;
      else this.S.stock.ice = Math.min(CONFIG.FREEZER_ICE_MAX, iceBefore + CONFIG.FREEZER_ICE_PER_NIGHT);
    }
    this.S.weatherHistory.push(this.D.weather);
    if (this.S.weatherHistory.length > 30) this.S.weatherHistory.shift();
    this.S.day++;
    this.startMorning(spoiled, broke);
    const iceMade = (this.S.stock.ice ?? 0) - iceBefore;
    if (iceMade > 0) this.toast('toast.iceMade', { n: iceMade, total: this.S.stock.ice ?? 0, max: CONFIG.FREEZER_ICE_MAX }, 'good');
    if (stale > 0) {
      this.toast('toast.pastryStale', { n: stale }, 'warn');
      this.tip('pastry_stale');
    }
  }

  /** Back to the main menu (the game stays saved at its last phase). */
  goTitle(): void {
    this.viewPoint = null;
    this.cleaner = null;
    this.phase = 'title';
    this.paused = false;
    this.midKitchen = false;
    this.servings = [null, null];
    this.making = null;
    this.bus.emit('phase', { phase: 'title' });
  }

  // ---------------------------------------------------------------- settings / debug

  updateSettings(patch: Partial<GameState['settings']>): void {
    Object.assign(this.S.settings, patch);
    this.save();
    this.changed();
  }

  setAgeMode(m: AgeMode): void {
    this.S.ageMode = m;
    this.save();
    this.changed();
  }

  setLang(l: Lang): void {
    this.S.lang = l;
    this.save();
    this.changed();
  }

  debugAddCoins(n: number): void {
    this.S.coins += n;
    this.changed();
  }

  /** The player decorates the food truck. */
  setTruckLook(look: Partial<TruckLook>): void {
    const cur = this.S.truck;
    if (look.skin !== undefined) cur.skin = clamp(Math.round(look.skin), 0, TRUCK_SKINS.length - 1);
    if (look.logo !== undefined) cur.logo = clamp(Math.round(look.logo), 0, TRUCK_LOGOS.length - 1);
    if (look.text !== undefined) cur.text = look.text.replace(/[<>]/g, '').trim().slice(0, TRUCK_TEXT_MAX);
    this.sfx('pop');
    this.save();
    this.changed();
  }

  /** Developer mode: coins as a top-up (not income, so the day report still adds up). */
  devGift(n: number): void {
    n = Math.max(-this.S.coins, Math.round(n));
    this.S.coins += n;
    this.D.coinsStart += n;
    this.save();
    this.changed();
  }

  /** Developer mode: set the reputation (places and upgrades open with it). */
  devSetRep(r: number): void {
    this.S.rep = clamp(r, 0, 5);
    this.S.bestRep = Math.max(this.S.bestRep, this.S.rep);
    this.refreshInterest();
    this.save();
    this.changed();
  }

  debugSetWeather(w: WeatherId): void {
    this.D.weather = w;
    this.D.forecast = w;
    this.refreshInterest();
    this.changed();
  }

  debugForceEvent(id: DayEventId): void {
    applyEvent(this, id, true);
    if (id === 'thief' && this.phase === 'sell') {
      this.D.thief.appeared = false;
      this.D.events.thiefAt = this.D.hour;
    }
    this.changed();
  }

  debugBreak(id: EquipId): void {
    this.S.broken[id] = true;
    this.S.condition[id] = 0;
    this.refreshInterest();
    this.card('broke', EQUIPMENT[id].icon, { item: equipName(id), cost: repairCost(this.S, id) }, id);
    this.changed();
  }
}
