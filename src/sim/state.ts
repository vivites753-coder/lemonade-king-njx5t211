import { CONFIG } from '../core/config';
import type { AgeMode, Avatar, Lang, LocationId, Params, UpgradeId, WeatherId } from '../core/types';

export interface LemonBatch {
  n: number;
  /** Nights since purchase. */
  age: number;
}

export interface Stock {
  lemons: LemonBatch[];
  water: number;
  /** Spoons. */
  sugar: number;
  cups: number;
}

export interface Recipe {
  lemons: number;
  sugar: number;
}

export interface Settings {
  sound: boolean;
  reduceMotion: boolean;
  dyslexia: boolean;
  showZone: boolean;
}

export interface DayHistory {
  day: number;
  profit: number;
  sold: number;
  location: LocationId;
  weather: WeatherId;
}

/** Everything that survives between days. */
export interface GameState {
  v: 1;
  seed: number;
  day: number;
  coins: number;
  rep: number;
  stock: Stock;
  upgrades: Partial<Record<UpgradeId, true>>;
  location: LocationId;
  price: number;
  recipe: Recipe;
  speakerOn: boolean;
  seenTips: Record<string, true>;
  glossary: string[];
  ageMode: AgeMode;
  avatar: Avatar;
  lang: Lang;
  settings: Settings;
  totals: { earned: number; sold: number };
  weatherHistory: WeatherId[];
  history: DayHistory[];
  stageDone: boolean;
}

export interface Funnel {
  /** Pedestrians who walked by while the stand was open. */
  passed: number;
  /** Came close enough to notice the stand. */
  inRange: number;
  stopped: number;
  tooExpensive: number;
  queueFull: number;
  soldOut: number;
  joined: number;
  sold: number;
  impatient: number;
}

export interface DayEvents {
  festival: boolean;
  thiefAt: number | null;
  sugarHike: boolean;
  cupsSoldOut: boolean;
  badLemons: boolean;
}

export interface DayReport {
  sales: number;
  bonus: number;
  income: number;
  expenses: number;
  ingredients: number;
  rent: number;
  flyers: number;
  stolen: number;
  profit: number;
  sold: number;
  wastedCups: number;
  wasteCost: number;
  repStart: number;
  repEnd: number;
  funnel: Funnel;
  outOfRange: number;
  lesson: { key: string; params: Params };
  stockValue: number;
  spoilTomorrow: number;
  stageGoalReached: boolean;
}

/** Everything about the current day. Saved too, so a reload can continue the day. */
export interface DayState {
  weather: WeatherId;
  forecast: WeatherId;
  events: DayEvents;
  newsKey: string;
  /** Current game hour (8.0 … 20.0). */
  hour: number;
  startHour: number;
  marketTrips: number;
  sales: number;
  bonus: number;
  expenses: { ingredients: number; rent: number; flyers: number; stolen: number };
  flyers: boolean;
  pitchersPlanned: number;
  cupsReady: number;
  pitchersMade: number;
  recipeUsed: Recipe;
  funnel: Funnel;
  repStart: number;
  coinsStart: number;
  spoiledOvernight: number;
  rottenToday: number;
  thief: { appeared: boolean; caught: boolean; stolen: number };
  soldOutAt: number | null;
  marketCardsShown: boolean;
  report: DayReport | null;
}

export function emptyFunnel(): Funnel {
  return { passed: 0, inRange: 0, stopped: 0, tooExpensive: 0, queueFull: 0, soldOut: 0, joined: 0, sold: 0, impatient: 0 };
}

export function newGameState(seed: number, o: { ageMode: AgeMode; avatar: Avatar; lang: Lang }): GameState {
  return {
    v: 1,
    seed,
    day: 1,
    coins: CONFIG.START_COINS,
    rep: CONFIG.START_REP,
    stock: { lemons: [], water: 0, sugar: 0, cups: 0 },
    upgrades: {},
    location: 'yard',
    price: 8,
    recipe: { lemons: CONFIG.IDEAL_LEMONS, sugar: CONFIG.IDEAL_SUGAR },
    speakerOn: true,
    seenTips: {},
    glossary: [],
    ageMode: o.ageMode,
    avatar: o.avatar,
    lang: o.lang,
    settings: { sound: true, reduceMotion: false, dyslexia: false, showZone: true },
    totals: { earned: 0, sold: 0 },
    weatherHistory: [],
    history: [],
    stageDone: false,
  };
}

export function newDayState(s: GameState, weather: WeatherId, forecast: WeatherId): DayState {
  return {
    weather,
    forecast,
    events: { festival: false, thiefAt: null, sugarHike: false, cupsSoldOut: false, badLemons: false },
    newsKey: 'news.calm0',
    hour: CONFIG.DAY_START,
    startHour: CONFIG.DAY_START,
    marketTrips: 0,
    sales: 0,
    bonus: 0,
    expenses: { ingredients: 0, rent: 0, flyers: 0, stolen: 0 },
    flyers: false,
    pitchersPlanned: 0,
    cupsReady: 0,
    pitchersMade: 0,
    recipeUsed: { ...s.recipe },
    funnel: emptyFunnel(),
    repStart: s.rep,
    coinsStart: s.coins,
    spoiledOvernight: 0,
    rottenToday: 0,
    thief: { appeared: false, caught: false, stolen: 0 },
    soldOutAt: null,
    marketCardsShown: false,
    report: null,
  };
}

export function lemonsTotal(stock: Stock): number {
  return stock.lemons.reduce((s, b) => s + b.n, 0);
}

export function dayExpenses(d: DayState): number {
  const e = d.expenses;
  return e.ingredients + e.rent + e.flyers + e.stolen;
}
