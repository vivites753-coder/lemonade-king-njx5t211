// The game controller: owns the state, runs the day loop and the selling simulation.
// No DOM here — the UI and renderer only listen to `bus` and call public methods, so tests can run it headless.
import { Bus } from '../core/bus';
import { CONFIG } from '../core/config';
import { RNG } from '../core/rng';
import type { AgeMode, Avatar, EquipId, GoodId, Lang, LocationId, MixResult, Params, Phase, UpgradeId, WeatherId } from '../core/types';
import { EQUIPMENT } from '../data/equipment';
import { BAD_LEMONS_SHARE, LOC_EVENTS, type DayEventId } from '../data/events';
import { GOODS, GOOD_IDS, SUGAR_HIKE } from '../data/goods';
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
  type GameState,
  type Recipe,
} from './state';
import { Street, type Ped, type StreetHost } from './street';

export type SfxName = 'coin' | 'click' | 'pop' | 'buzz' | 'pour' | 'splash' | 'alarm' | 'fanfare' | 'buy' | 'mix' | 'break';

export interface CardInfo {
  id: string;
  icon: string;
  params?: Params;
  /** Offer to repair this equipment right from the card. */
  repair?: EquipId;
}

export type GameEvents = {
  phase: { phase: Phase };
  tip: { key: string };
  card: CardInfo;
  toast: { key: string; params?: Params; kind?: 'info' | 'warn' | 'good' };
  sale: { x: number; y: number; amount: number; sat: number; free: boolean };
  sfx: { name: SfxName };
  thief: { state: 'appear' | 'caught' | 'stole' | 'locked'; amount?: number };
  changed: Record<string, never>;
  save: Snapshot;
};

export interface Snapshot {
  v: 1;
  S: GameState;
  D: DayState;
  phase: Phase;
  rng: number;
  savedAt: number;
}

export type Cart = Record<GoodId, number>;
export const emptyCart = (): Cart => ({ lemon: 0, lemon_cheap: 0, water: 0, sugar: 0, cups: 0, cups_super: 0 });
export type KitchenItem = 'lemon' | 'water' | 'sugar';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
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
  serving: { ped: Ped; t: number; dur: number } | null = null;
  making: { t: number; dur: number } | null = null;
  cart: Cart = emptyCart();
  interest: ReturnType<typeof interestChance>;
  radius: number = CONFIG.BASE_RADIUS;
  /** Real seconds the helper has been idle with a customer waiting. */
  private helperIdle = 0;

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
      servingPed: () => this.serving?.ped ?? null,
      onSpawnCounted: () => {
        this.D.funnel.passed++;
      },
      onInRange: (p) => this.onInRange(p),
      onImpatient: (p) => this.onImpatient(p),
    };
  }

  /** Upgrades that work right now (broken equipment gives no bonus). */
  active(): Owned {
    return activeUpgrades(this.S);
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
    this.serving = null;
    this.making = null;
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

  private card(id: string, icon: string, params?: Params, repair?: EquipId): void {
    this.bus.emit('card', { id, icon, params, repair });
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
    if (this.S.day === 1) this.S.location = 'yard';
    this.serving = null;
    this.making = null;
    this.paused = false;
    this.speed = 1;
    this.cart = emptyCart();
    this.refreshInterest();
    this.street.reset(true);
    const gift = this.grandmaHelp();
    this.setPhase('morning');
    if (gift > 0) this.card('grandmaHelp', '👵', { n: gift });
    if (this.S.day === 1) this.tip('welcome');
    this.tip('morning');
    if (this.S.day >= 2) this.tip('location');
    if (spoiled > 0) this.tip('spoiled');
    if (this.D.carriedIn > 0) this.toast('toast.carried', { n: this.D.carriedIn }, 'good');
    for (const id of broke) this.card('broke', EQUIPMENT[id].icon, { item: equipName(id), cost: repairCost(this.S, id) }, id);
    if (broke.length) this.tip('breakdown');
    if (this.D.events.festival) this.card('festival', '🎉');
    for (const e of LOC_EVENTS) if (this.D.events[e.id]) this.card(`ev.${e.id}`, e.icon);
  }

  /** Places open for the player (some need a better reputation). */
  unlocked(id: LocationId): boolean {
    return locationUnlocked(this.S.bestRep, id);
  }

  /** Soft safety net: if coins and stock cannot make even one pitcher, grandma helps. Counts as income (a gift). */
  private grandmaHelp(): number {
    const onePitcher = Math.ceil(pitcherCost(this.S.recipe, this.active())) + CONFIG.CUPS_PER_PITCHER;
    if (this.S.coins + stockValue(this.S.stock) + this.D.cupsReady >= onePitcher) return 0;
    const gift = this.S.ageMode === 'kid' ? CONFIG.GRANDMA_GIFT_KID : CONFIG.GRANDMA_GIFT;
    this.S.coins += gift;
    this.D.bonus += gift;
    return gift;
  }

  chooseLocation(id: LocationId): boolean {
    if (this.phase !== 'morning') return false;
    if (this.S.day === 1 && id !== 'yard') {
      this.toast('toast.day1yard', undefined, 'warn');
      return false;
    }
    if (!this.unlocked(id)) {
      this.toast('toast.locLocked', { n: LOCATIONS[id].minRep ?? 0 }, 'warn');
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

  tripHours(delivery = false): number {
    if (delivery) return 0;
    return this.active().bike ? UPGRADES.bike.tripHours ?? 1 : CONFIG.MARKET_TRIP_H;
  }

  travelHours(id: LocationId = this.S.location): number {
    const reduce = this.active().bike ? UPGRADES.bike.travelReduce ?? 0 : 0;
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
    this.setPhase('kitchen');
    this.tip('kitchen');
    if (mixerBroken(this.S)) this.tip('hand_stir');
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
    if (this.phase !== 'kitchen') return 'no';
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
    this.changed();
    return 'ok';
  }

  kitchenReset(): void {
    if (this.phase !== 'kitchen') return;
    this.D.kitchen = emptyKitchen();
    this.changed();
  }

  /** Fills the jug with yesterday's recipe (as far as the stock allows). Mixing is still needed. */
  kitchenRepeat(): void {
    if (this.phase !== 'kitchen') return;
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
    if (this.phase !== 'kitchen' || !this.kitchenCanMix() || mixerBroken(this.S)) return;
    const k = this.D.kitchen;
    k.mix = this.S.upgrades.mixer_pro ? 'perfect' : result;
    k.hand = false;
    this.sfx(k.mix === 'over' ? 'splash' : 'mix');
    if (k.mix === 'over') this.tip('mix_over');
    this.changed();
  }

  /** Stir by hand when the mixer is broken. Returns true when the lemonade is mixed. */
  kitchenStir(): boolean {
    if (this.phase !== 'kitchen' || !this.kitchenCanMix()) return false;
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

  /** Pour the jug into n pitchers: uses the ingredients and kitchen time. */
  kitchenPour(n: number): boolean {
    if (this.phase !== 'kitchen') return false;
    const k = this.D.kitchen;
    if (k.mix === 'none' || !this.kitchenCanMix()) {
      this.toast('toast.mixFirst', undefined, 'warn');
      this.sfx('buzz');
      return false;
    }
    const max = this.kitchenMaxPitchers();
    n = clamp(Math.round(n), 0, max);
    if (n < 1) {
      this.toast('toast.noIngredients', undefined, 'warn');
      this.sfx('buzz');
      return false;
    }
    const hours = this.kitchenHours(n, k.hand);
    if (this.D.hour + hours + this.travelHours() >= CONFIG.DAY_END - 0.5) {
      this.toast('toast.tooLate', undefined, 'warn');
      this.sfx('buzz');
      return false;
    }
    const recipe = this.kitchenRecipe();
    this.S.recipe = recipe;
    this.D.recipeUsed = { ...recipe };
    this.D.mixQuality = CONFIG.MIX_QUALITY[k.mix];
    for (let i = 0; i < n; i++) {
      this.consumePitcher(recipe);
      this.D.cupsReady += CONFIG.CUPS_PER_PITCHER;
      this.D.pitchersMade++;
    }
    this.D.hour += hours;
    this.D.kitchen = emptyKitchen();
    this.sfx('pour');
    this.goPrepare();
    return true;
  }

  /** From the kitchen to the stand without making more (only if there is lemonade). */
  leaveKitchen(): void {
    if (this.phase === 'kitchen' && this.D.cupsReady > 0) this.goPrepare();
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

  setHelper(on: boolean): void {
    if (this.phase !== 'prepare') return;
    this.D.helper = on;
    this.changed();
  }

  /** Coins needed today before opening (rent, flyers, the helper's wage). */
  openingCosts(): number {
    return LOCATIONS[this.S.location].rent + (this.D.flyers ? CONFIG.FLYERS_COST : 0) + (this.D.helper ? CONFIG.HELPER_WAGE : 0);
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
    if (D.helper) {
      this.S.coins -= CONFIG.HELPER_WAGE;
      D.expenses.wages += CONFIG.HELPER_WAGE;
    }
    if (D.events.thiefAt !== null) D.events.thiefAt = Math.max(D.events.thiefAt, D.startHour + 1);
    this.serving = null;
    this.making = null;
    this.helperIdle = 0;
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
      event: this.placeEventBoost(),
    });
  }

  /** A place event that makes people stop more often (a concert at the mall). */
  private placeEventBoost(): { key: string; mult: number } | undefined {
    const e = LOC_EVENTS.find((x) => x.loc === this.S.location && x.stop && this.D.events[x.id]);
    return e ? { key: `why.ev.${e.id}`, mult: e.stop! } : undefined;
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
    if (this.paused) return;
    const sim = rdt * this.speed;
    const n = Math.max(1, Math.ceil(sim / 0.05));
    for (let i = 0; i < n && this.phase === 'sell'; i++) this.stepSell(sim / n, rdt / n);
  }

  private stepSell(dt: number, rdt: number): void {
    const D = this.D;
    D.hour += dt / CONFIG.HOUR_SEC;
    this.refreshInterest();
    this.street.update(dt);

    if (this.serving) {
      this.serving.t += dt;
      if (this.serving.t >= this.serving.dur) this.completeServe();
    }
    if (this.making) {
      this.making.t += dt;
      if (this.making.t >= this.making.dur) {
        this.making = null;
        D.cupsReady += CONFIG.CUPS_PER_PITCHER;
        this.sfx('splash');
        this.toast('toast.pitcherReady', undefined, 'good');
      }
    }

    // the helper serves and makes pitchers by himself
    if (D.helper && !this.serving && !this.making) {
      if (D.cupsReady === 0 && this.canMakePitcher()) this.makePitcher();
      else if (this.street.frontReady() && D.cupsReady > 0) {
        this.helperIdle += rdt;
        if (this.helperIdle >= CONFIG.HELPER_DELAY) this.serve();
      } else this.helperIdle = 0;
    }

    if (D.events.thiefAt !== null && !D.thief.appeared && D.hour >= D.events.thiefAt && D.hour < CONFIG.DAY_END - 0.5) {
      D.thief.appeared = true;
      this.street.spawnThief();
      this.bus.emit('thief', { state: 'appear' });
      this.sfx('alarm');
      this.tip('thief');
    }
    if (this.street.thief && this.street.updateThief(rdt) === 'steal') this.thiefSteals();

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
      if (this.street.queue.length) this.street.sendAwayQueue('😢');
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
    } else if (this.street.queue.length >= CONFIG.MAX_QUEUE) {
      f.queueFull++;
      this.street.setEmote(p, '⏳', 2);
      this.tip('queue');
    } else {
      f.joined++;
      this.street.joinQueue(p);
    }
  }

  private onImpatient(p: Ped): void {
    this.D.funnel.impatient++;
    this.S.rep = clamp(this.S.rep + CONFIG.REP_ANGRY, 0, 5);
    this.street.leave(p, '😠');
    this.tip('queue');
  }

  /** Player taps to pour a cup for the first customer in line (the helper calls it too). */
  serve(): 'ok' | 'busy' | 'making' | 'noCustomer' | 'noCups' | 'no' {
    if (this.phase !== 'sell' || this.paused) return 'no';
    if (this.serving) return 'busy';
    if (this.making) return 'making';
    const p = this.street.frontReady();
    if (!p) return 'noCustomer';
    if (this.D.cupsReady <= 0) {
      this.toast(this.canMakePitcher() ? 'toast.needPitcher' : 'toast.soldOut', undefined, 'warn');
      this.sfx('buzz');
      return 'noCups';
    }
    this.helperIdle = 0;
    this.serving = { ped: p, t: 0, dur: serveTime(this.active(), this.D.helper) };
    this.sfx('pour');
    return 'ok';
  }

  private completeServe(): void {
    const p = this.serving!.ped;
    this.serving = null;
    if (!this.street.queue.includes(p)) return;
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
    this.sfx('coin');
    this.tip('first_sale');
    if (free) this.tip('loyalty');
    if (q < 0.6) this.tip('taste_bad');
    if (S.totals.sold >= 20) this.tip('reputation');
  }

  /** Make a new pitcher while selling (costs time, no serving meanwhile; twice as long by hand). */
  makePitcher(): boolean {
    if (this.phase !== 'sell' || this.making || this.serving || this.paused) return false;
    if (!this.canMakePitcher()) {
      this.toast('toast.noIngredients', undefined, 'warn');
      this.sfx('buzz');
      return false;
    }
    this.consumePitcher(this.D.recipeUsed);
    this.D.pitchersMade++;
    this.making = { t: 0, dur: CONFIG.PITCHER_TIME * (mixerBroken(this.S) ? 2 : 1) };
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

  catchThief(): boolean {
    if (!this.street.catchThief()) return false;
    this.D.thief.caught = true;
    this.S.coins += CONFIG.THIEF_REWARD;
    this.D.bonus += CONFIG.THIEF_REWARD;
    this.bus.emit('thief', { state: 'caught', amount: CONFIG.THIEF_REWARD });
    this.sfx('fanfare');
    this.card('thiefCaught', '🦊', { n: CONFIG.THIEF_REWARD });
    return true;
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
    this.serving = null;
    this.making = null;
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
    const income = D.sales + D.bonus;
    const expenses = dayExpenses(D);
    const f = { ...D.funnel };
    const report: DayReport = {
      sales: D.sales,
      bonus: D.bonus,
      income,
      expenses,
      ingredients: D.expenses.ingredients,
      rent: D.expenses.rent,
      flyers: D.expenses.flyers,
      stolen: D.expenses.stolen,
      wages: D.expenses.wages,
      repairs: D.expenses.repairs,
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
      stageGoalReached: false,
    };
    // reputation milestones open new places for good
    const before = S.bestRep;
    S.bestRep = Math.max(S.bestRep, S.rep);
    report.unlocked = LOCATION_IDS.filter((id) => !locationUnlocked(before, id) && locationUnlocked(S.bestRep, id));
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
  }

  // ---------------------------------------------------------------- evening

  openShop(): void {
    if (this.phase !== 'report') return;
    this.setPhase('shop');
    this.tip('shop');
    if (Object.values(this.S.condition).some((c) => (c ?? 100) < 60)) this.tip('maintenance');
  }

  canBuy(id: UpgradeId): { ok: boolean; reason?: 'owned' | 'requires' | 'money' } {
    const u = UPGRADES[id];
    if (this.S.upgrades[id]) return { ok: false, reason: 'owned' };
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
    this.serving = null;
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
