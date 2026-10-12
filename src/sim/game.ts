// The game controller: owns the state, runs the day loop and the selling simulation.
// No DOM here — the UI and renderer only listen to `bus` and call public methods, so tests can run it headless.
import { Bus } from '../core/bus';
import { CONFIG } from '../core/config';
import { RNG } from '../core/rng';
import type { AgeMode, Avatar, EquipId, GoodId, Lang, LocationId, MixResult, Params, Phase, UpgradeId, WeatherId } from '../core/types';
import { EQUIPMENT } from '../data/equipment';
import { BAD_LEMONS_SHARE, LOC_EVENTS, type DayEventId } from '../data/events';
import { COOKIES, COOKIE_TASTE, GOODS, GOOD_IDS, SUGAR_HIKE } from '../data/goods';
import { TIP_GLOSSARY } from '../data/glossary';
import { LOCATIONS, LOCATION_IDS, locationUnlocked } from '../data/locations';
import { PED_TYPES } from '../data/pedTypes';
import { UPGRADES } from '../data/upgrades';
import { WEATHER, WEATHER_ORDER } from '../data/weather';
import {
  attentionRadius,
  costPerCup,
  interestChance,
  lemonsConsumed,
  maxPitchers,
  pitcherCost,
  quality,
  repDelta,
  satisfaction,
  serveTime,
  stockValue,
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
  type PointReport,
  type TruckLook,
  type GameState,
  type Recipe,
} from './state';
import { ACCIDENTS, BONUSES, ELECTRIC, INCIDENT, type AccidentId, type BonusId } from '../data/incidents';
import { POINTS, type WorkerIssue } from '../data/staff';
import { TRUCK_LOGOS, TRUCK_SKINS, TRUCK_TEXT_MAX } from '../data/truck';
import {
  candidates,
  freePlaces,
  pointAt,
  pointsOpen,
  recordDay,
  rollMorningIssue,
  rollTheft,
  simulatePoint,
  type Point,
  type Seller,
} from './points';
import { Critters } from './critters';
import { Street, type Ped, type StreetHost } from './street';
import { placeEventStop } from './traffic';

export type SfxName = 'coin' | 'click' | 'pop' | 'buzz' | 'pour' | 'splash' | 'alarm' | 'fanfare' | 'buy' | 'mix' | 'break' | 'crash' | 'zap' | 'woof' | 'meow';

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
  sale: { x: number; y: number; amount: number; sat: number; free: boolean; cookie?: boolean };
  sfx: { name: SfxName };
  thief: { state: 'appear' | 'hit' | 'caught' | 'stole' | 'locked'; amount?: number };
  changed: Record<string, never>;
  save: Snapshot;
  /** The kitchen opened or closed while selling. */
  kitchen: { open: boolean };
  /** A lucky find was picked up. */
  found: { x: number; y: number; amount: number; icon: string };
};

export interface Serving {
  ped: Ped;
  t: number;
  dur: number;
  /** Poured by a helper (faster), not by the player. */
  helper: boolean;
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
export const emptyCart = (): Cart => ({ lemon: 0, lemon_cheap: 0, water: 0, sugar: 0, cups: 0, cups_super: 0, cookies: 0 });
export type KitchenItem = 'lemon' | 'water' | 'sugar';

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
  making: { t: number; dur: number; jugs: number } | null = null;
  /** The kitchen mini-game is open in the middle of the selling day (the world waits). */
  midKitchen = false;
  /** Actors of accidents and lucky finds (only for the show). */
  readonly critters = new Critters();
  cart: Cart = emptyCart();
  interest: ReturnType<typeof interestChance>;
  radius: number = CONFIG.BASE_RADIUS;
  /** Real seconds each counter's helper has waited with a customer in front. */
  private helperIdle = [0, 0];

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
    };
  }

  /** Upgrades that work right now (broken equipment gives no bonus; nothing electric works in a blackout). */
  active(): Owned {
    const up = activeUpgrades(this.S);
    if (this.D && this.D.blackoutUntil > this.D.hour) for (const id of ELECTRIC) delete up[id];
    return up;
  }

  // ---------------------------------------------------------------- setup / save

  newGame(o: { ageMode: AgeMode; avatar: Avatar; lang: Lang; seed?: number; name?: string }): void {
    const seed = o.seed ?? (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    this.setRng(seed);
    this.S = newGameState(seed, o);
    this.speed = 1;
    this.paused = false;
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
    this.phase = snap.phase === 'title' ? 'morning' : snap.phase;
    this.street.reset(true);
    // the new crowd used the RNG; rewind so the simulation continues exactly from the snapshot
    this.rng.state = snap.rng;
    this.refreshInterest();
    if (this.phase === 'sell') this.D.funnel.passed += this.street.markAllCounted();
    this.bus.emit('phase', { phase: this.phase });
  }

  private save(): void {
    if (this.phase === 'title') return;
    this.bus.emit('save', this.snapshot());
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.save();
    this.bus.emit('phase', { phase: p });
  }

  /** Shows a Lemi tip once per game and unlocks its glossary cards. */
  tip(key: string): void {
    if (this.S.seenTips[key]) return;
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
   * Soft safety net: when the purse is (almost) empty, or coins and stock cannot make even one pitcher,
   * grandma or the parents help. Counts as income (a gift).
   */
  private grandmaHelp(): number {
    const onePitcher = Math.ceil(pitcherCost(this.S.recipe, this.active())) + CONFIG.CUPS_PER_PITCHER;
    const broke = this.S.coins <= CONFIG.FAMILY_HELP_BELOW;
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
    if (this.S.location === id) return true;
    this.S.location = id;
    if (LOCATIONS[id].indoor) this.tip('indoor');
    this.street.reset(true);
    this.refreshInterest();
    this.sfx('pop');
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
    const c = this.cart;
    const s = this.S.stock;
    return {
      lemons: lemonsTotal(s) + c.lemon + c.lemon_cheap,
      water: s.water + c.water,
      sugar: s.sugar + c.sugar * GOODS.sugar.pack,
      cups: s.cups + c.cups * GOODS.cups.pack + c.cups_super * GOODS.cups_super.pack,
    };
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

  /** Adds exactly what is missing for one more pitcher. */
  addPitcherKit(): void {
    const target = this.pitchersWithCart() + 1;
    const r = this.S.recipe;
    const u = this.stockWithCart();
    const need = {
      lemons: target * lemonsConsumed(r, this.active()) - u.lemons,
      water: target * CONFIG.WATER_PER_PITCHER - u.water,
      sugar: target * r.sugar - u.sugar,
      cups: target * CONFIG.CUPS_PER_PITCHER - u.cups,
    };
    if (need.lemons > 0) this.cart.lemon += need.lemons;
    if (need.water > 0) this.cart.water += need.water;
    if (need.sugar > 0) this.cart.sugar += Math.ceil(need.sugar / GOODS.sugar.pack);
    if (need.cups > 0) {
      const id: GoodId = this.goodAvailable('cups') ? 'cups' : 'cups_super';
      this.cart[id] += Math.ceil(need.cups / GOODS[id].pack);
    }
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
        const bad = g.rotten ? this.rng.binomial(n, g.rotten) : this.D.events.badLemons ? this.rng.binomial(n, BAD_LEMONS_SHARE) : 0;
        this.addLemons(n - bad);
        if (g.rotten) {
          rottenCheap += bad;
          boughtCheap += n;
        } else rotten += bad;
      } else {
        this.S.stock[g.stock] += n * g.pack;
      }
    }
    this.D.rottenToday += rotten + rottenCheap;
    this.cart = emptyCart();
    this.sfx('coin');
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

  /** Ingredients still free in the stock for one more unit in the jug. */
  kitchenCanAdd(item: KitchenItem): 'ok' | 'full' | 'noStock' {
    const k = this.D.kitchen;
    const st = this.S.stock;
    if (item === 'lemon') {
      if (k.juice >= CONFIG.KITCHEN_MAX_JUICE) return 'full';
      return lemonsConsumed({ lemons: k.juice + 1, sugar: k.sugar }, this.active()) <= lemonsTotal(st) ? 'ok' : 'noStock';
    }
    if (item === 'water') {
      if (k.water >= CONFIG.WATER_PER_PITCHER) return 'full';
      return st.water >= k.water + 1 ? 'ok' : 'noStock';
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
    if (item === 'lemon') k.juice++;
    else if (item === 'water') k.water++;
    else k.sugar++;
    // anything added after mixing has to be mixed again
    k.mix = 'none';
    k.stir = 0;
    this.sfx(item === 'lemon' ? 'splash' : item === 'water' ? 'pour' : 'pop');
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
    for (let i = 0; i < r.lemons; i++) if (this.kitchenCanAdd('lemon') === 'ok') this.D.kitchen.juice++;
    for (let i = 0; i < r.sugar; i++) if (this.kitchenCanAdd('sugar') === 'ok') this.D.kitchen.sugar++;
    this.sfx('pour');
    this.changed();
  }

  kitchenRecipe(): Recipe {
    return { lemons: this.D.kitchen.juice, sugar: this.D.kitchen.sugar };
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
    this.sfx(k.mix === 'over' ? 'splash' : 'mix');
    if (k.mix === 'over') this.tip('mix_over');
    this.changed();
  }

  /** Stir by hand when the mixer is broken. Returns true when the lemonade is mixed. */
  kitchenStir(): boolean {
    if (!this.inKitchen() || !this.kitchenCanMix()) return false;
    const k = this.D.kitchen;
    if (k.mix !== 'none') return true;
    k.stir++;
    this.sfx('click');
    if (k.stir >= CONFIG.STIR_TAPS) {
      k.mix = 'perfect';
      k.hand = true;
      this.sfx('mix');
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
    this.D.recipeUsed = { ...recipe };
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
      } else this.making = { t: 0, dur, jugs: 1 };
    } else {
      this.D.cupsReady += CONFIG.CUPS_PER_PITCHER;
      this.D.hour += hours;
    }
    this.D.kitchen = emptyKitchen();
    this.sfx('pour');
    this.toast('toast.jugReady', { n: this.D.kitchenJugs }, 'good');
    if (this.D.kitchenJugs === 1) this.tip('kitchen_more');
    this.changed();
    return true;
  }

  /** From the kitchen to the stand (only if there is lemonade). */
  leaveKitchen(): void {
    if (this.phase === 'kitchen' && this.D.cupsReady > 0) this.goPrepare();
    else if (this.midKitchen) this.closeKitchen();
  }

  // ---------------------------------------------------------------- prepare

  private goPrepare(): void {
    this.setPhase('prepare');
    this.tip('prepare_cost');
    this.tip('price');
    if (this.S.day >= 2) this.tip('helper');
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
    if (this.phase !== 'prepare') return;
    this.D.helpers = clamp(Math.round(n), 0, this.helperCap());
    this.D.helper = this.D.helpers > 0;
    this.changed();
  }

  /** Serving counters of the stand (the big stand and the truck have two). */
  counters(): number {
    let n = 1;
    for (const id of Object.keys(this.active()) as UpgradeId[]) n = Math.max(n, UPGRADES[id].counters ?? 1);
    return n;
  }

  /** A helper serves this counter by himself. One helper takes the second counter, two helpers take both. */
  autoCounter(c: number): boolean {
    const h = this.D.helpers;
    if (h <= 0 || c >= this.counters()) return false;
    if (this.counters() === 1) return c === 0;
    return c === 1 || h >= 2;
  }

  /** Coins needed today before opening (rent, flyers, the helper's wage). */
  openingCosts(): number {
    return LOCATIONS[this.S.location].rent + (this.D.flyers ? CONFIG.FLYERS_COST : 0) + this.D.helpers * CONFIG.HELPER_WAGE;
  }

  canStartSelling(): { ok: boolean; reason?: string } {
    if (this.D.cupsReady < 1) return { ok: false, reason: 'toast.noLemonade' };
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
    if (D.flyers) {
      this.S.coins -= CONFIG.FLYERS_COST;
      D.expenses.flyers += CONFIG.FLYERS_COST;
    }
    // the helpers' wages (a stand with one counter has room for one helper)
    D.helpers = Math.min(D.helpers, this.helperCap());
    D.helper = D.helpers > 0;
    if (D.helpers > 0) {
      this.S.coins -= CONFIG.HELPER_WAGE * D.helpers;
      D.expenses.wages += CONFIG.HELPER_WAGE * D.helpers;
    }
    if (D.events.thiefAt !== null) D.events.thiefAt = Math.max(D.events.thiefAt, D.startHour + 1);
    this.servings = [null, null];
    this.making = null;
    this.helperIdle = [0, 0];
    this.speed = 1;
    this.refreshInterest();
    D.funnel.passed += this.street.markAllCounted();
    this.setPhase('sell');
    this.tip('sell_start');
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
  }

  // ---------------------------------------------------------------- selling

  calcInterest(): ReturnType<typeof interestChance> {
    return interestChance({
      upgrades: this.active(),
      speakerOn: this.S.speakerOn,
      flyers: this.D.flyers,
      weather: this.D.weather,
      rep: this.S.rep,
      // the city festival is outdoors; indoor places have their own events
      festival: this.D.events.festival && !LOCATIONS[this.S.location].indoor,
      location: this.S.location,
      event: placeEventStop(this.S.location, this.D.events),
      scare: this.D.dogsUntil > this.D.hour ? { key: 'why.dogs', mult: INCIDENT.DOGS_STOP } : undefined,
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
        D.cupsReady += CONFIG.CUPS_PER_PITCHER * this.making.jugs;
        this.making = null;
        D.outAsked = false;
        this.sfx('splash');
        this.toast('toast.pitcherReady', undefined, 'good');
      }
    }

    // helpers serve their counters by themselves; making more lemonade is the player's decision
    for (let c = 0; c < this.counters(); c++) {
      if (!this.autoCounter(c) || this.servings[c] || this.making) continue;
      if (this.street.frontReady(c) && D.cupsReady > 0) {
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
      this.street.spawnThief();
      this.bus.emit('thief', { state: 'appear' });
      this.sfx('alarm');
      this.tip('thief');
    }
    if (this.street.thief && this.street.updateThief(rdt) === 'steal') this.thiefSteals();
    this.stepIncidents(rdt);

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
    return this.D.cupsReady <= 0 && !this.making && !this.canMakePitcher();
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
    } else if (this.S.price > p.maxPrice) {
      f.tooExpensive++;
      this.street.setEmote(p, '💸', 2.4);
      this.tip('expensive');
    } else {
      // people pick the shorter queue
      let best = -1;
      for (let c = 0; c < this.counters(); c++) {
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

  /** Pour a cup at one counter (by the player or by that counter's helper). */
  serveAt(c: number, byHelper: boolean): 'ok' | 'busy' | 'making' | 'noCustomer' | 'noCups' | 'no' {
    if (this.phase !== 'sell' || this.paused) return 'no';
    if (this.servings[c]) return 'busy';
    if (this.making) return 'making';
    const p = this.street.frontReady(c);
    if (!p) return 'noCustomer';
    if (this.D.cupsReady <= 0) {
      if (!byHelper) {
        this.toast(this.canMakePitcher() ? 'toast.needPitcher' : 'toast.soldOut', undefined, 'warn');
        this.sfx('buzz');
      }
      return 'noCups';
    }
    this.helperIdle[c] = 0;
    // a counter that a helper looks after pours at the helper's speed
    this.servings[c] = { ped: p, t: 0, dur: serveTime(this.active(), byHelper || this.autoCounter(c)), helper: byHelper };
    this.sfx('pour');
    return 'ok';
  }

  private completeServe(c = 0): void {
    const p = this.servings[c]!.ped;
    this.servings[c] = null;
    if (!this.street.inQueue(p)) return;
    const S = this.S;
    const D = this.D;
    const up = this.active();
    D.cupsReady--;
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
    const sat = satisfaction(q, paid, p.maxPrice, p.waited, p.patienceMax);
    S.rep = clamp(S.rep + repDelta(sat, S.rep, up), 0, 5);
    const bal = tasteBalance(D.recipeUsed);
    const emote = free ? '🎁' : sat >= 0.75 ? '😍' : sat >= 0.5 ? '🙂' : bal >= 2 ? '😝' : bal <= -2 ? '🥴' : '😐';
    this.street.serveDone(p, emote);
    this.bus.emit('sale', { x: p.x, y: p.y, amount: paid, sat, free });
    this.maybeSellCookie(p);
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
    this.making = { t: 0, dur: CONFIG.PITCHER_TIME * (mixerBroken(this.S) ? 2 : 1), jugs: 1 };
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
    this.critters.clear();
    if (this.midKitchen) this.closeKitchen();
    this.street.sendAwayQueue();
    if (this.street.thief && (this.street.thief.state === 'run' || this.street.thief.state === 'grab')) this.street.thief = null;
    // unsold lemonade: poured out, or kept for tomorrow in the cooler (cups from the cooler are sold first)
    let wasted = D.cupsReady;
    let carried = 0;
    if (this.active().cooler) {
      const oldLeft = Math.max(0, D.carriedIn - D.funnel.sold);
      wasted = Math.min(oldLeft, D.cupsReady);
      carried = D.cupsReady - wasted;
    }
    S.carryCups = carried;
    D.cupsReady = 0;
    applyWear(S, this.rng, D.weather, D.pitchersMade > 0, D.opened);
    const points = this.eveningPoints();
    const pointsIncome = points.reduce((n, p) => n + p.revenue, 0);
    const pointsCosts = points.reduce((n, p) => n + p.ingredients + p.rent + p.wage + p.stolen, 0);
    const pointsProfit = pointsIncome - pointsCosts;
    S.coins += pointsProfit;
    const income = D.sales + D.bonus + pointsIncome;
    const expenses = dayExpenses(D) + pointsCosts;
    const f = { ...D.funnel };
    const report: DayReport = {
      sales: D.sales,
      cookieSales: D.cookieSales,
      cookiesSold: D.cookiesSold,
      bonus: D.bonus,
      income,
      expenses,
      ingredients: D.expenses.ingredients,
      rent: D.expenses.rent,
      flyers: D.expenses.flyers,
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
      points,
      pointsProfit,
      pointsUnlocked: false,
      stageGoalReached: false,
    };
    // reputation milestones open new places for good
    const before = S.bestRep;
    S.bestRep = Math.max(S.bestRep, S.rep);
    report.unlocked = LOCATION_IDS.filter((id) => !locationUnlocked(before, id) && locationUnlocked(S.bestRep, id));
    report.pointsUnlocked = before < POINTS.MIN_REP - 1e-9 && pointsOpen(S);
    report.lesson = pickLesson(S, D, report);
    if (!S.stageDone && S.coins >= CONFIG.GOAL_COINS && S.rep >= CONFIG.GOAL_REP) {
      report.stageGoalReached = true;
      S.stageDone = true;
    }
    S.history.push({ day: S.day, profit: report.profit, sold: f.sold, location: S.location, weather: D.weather });
    if (S.history.length > 60) S.history.shift();
    D.report = report;
    this.setPhase('report');
    this.tip('report');
    if (report.stageGoalReached) this.sfx('fanfare');
    if (report.unlocked.length) {
      this.card('locUnlocked', '🔓', { list: report.unlocked.map((id) => `@loc.${id}.name`).join(', ') });
      this.sfx('fanfare');
    }
    if (report.pointsUnlocked) {
      this.card('pointsUnlocked', '🏪');
      this.sfx('fanfare');
    }
    for (const p of S.points) if (p.issue === 'stole' && p.seller) this.staffCard(p);
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
        if (D.cupsReady <= 0) return;
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
    if (this.S.points.length >= POINTS.MAX) return { ok: false, reason: 'max' };
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
    const p: Point = { id: this.S.nextPointId++, loc, opened: this.S.day, seller: null, issue: null, last: null, history: [], total: 0 };
    this.S.points.push(p);
    this.sfx('buy');
    this.tip('points');
    this.save();
    this.changed();
    return p;
  }

  closePoint(id: number): boolean {
    const i = this.S.points.findIndex((p) => p.id === id);
    if (i < 0 || this.phase !== 'shop') return false;
    this.S.points.splice(i, 1);
    this.S.coins += Math.round(POINTS.COST * POINTS.SELL_BACK);
    this.sfx('coin');
    this.save();
    this.changed();
    return true;
  }

  /** Hiring and firing: any time except while selling. */
  canManageStaff(): boolean {
    return this.phase !== 'sell' && this.phase !== 'title';
  }

  candidates(pointId: number): Seller[] {
    return candidates(this.S, pointId);
  }

  hireSeller(pointId: number, index: number): boolean {
    const p = this.pointById(pointId);
    if (!p || p.seller || !this.canManageStaff()) return false;
    const c = candidates(this.S, pointId)[index];
    if (!c) return false;
    p.seller = c;
    p.issue = null;
    this.sfx('pop');
    this.tip('hire');
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
      p.issue = rollMorningIssue(this.S, p, this.rng);
      if (p.issue) this.staffCard(p);
    }
  }

  /** Evening: every stand's day in numbers; a dishonest seller may take money from the till. */
  private eveningPoints(): PointReport[] {
    const out: PointReport[] = [];
    for (const p of this.S.points) {
      const d = simulatePoint(this.S, p, this.D.weather, this.D.events, this.rng);
      p.issue = rollTheft(p, d, this.rng) > 0 ? 'stole' : null;
      recordDay(p, d);
      out.push({ ...d, id: p.id, loc: p.loc, nameId: p.seller?.nameId ?? null });
    }
    return out;
  }

  /** A card about a problem with a seller, with the choices the player has. */
  private staffCard(p: Point): void {
    const s = p.seller;
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
        break;
    }
    this.card(`staff.${issue}`, ISSUE_ICON[issue], params, undefined, { point: p.id, choices });
  }

  /** The player's answer on a seller card. Returns true when the card can close. */
  workerChoice(pointId: number, act: string): boolean {
    const p = this.pointById(pointId);
    const s = p?.seller;
    if (!p || !s) return true;
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

  canBuy(id: UpgradeId): { ok: boolean; reason?: 'owned' | 'rep' | 'requires' | 'money' } {
    const u = UPGRADES[id];
    if (this.S.upgrades[id]) return { ok: false, reason: 'owned' };
    if (u.minRep && this.S.bestRep < u.minRep - 1e-9) return { ok: false, reason: 'rep' };
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
    // worn equipment may break overnight; the player finds out in the morning
    const broke = rollBreaks(this.S, this.rng);
    this.S.weatherHistory.push(this.D.weather);
    if (this.S.weatherHistory.length > 30) this.S.weatherHistory.shift();
    this.S.day++;
    this.startMorning(spoiled, broke);
  }

  /** Back to the main menu (the game stays saved at its last phase). */
  goTitle(): void {
    this.phase = 'title';
    this.paused = false;
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
