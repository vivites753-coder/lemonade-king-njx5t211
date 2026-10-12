import { CONFIG } from '../core/config';
import type { AgeMode, Avatar, EquipId, Lang, LocationId, MixResult, Params, UpgradeId, WeatherId } from '../core/types';
import type { Point, PointDay } from './points';

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
  playerName: string;
  day: number;
  coins: number;
  rep: number;
  /** Highest reputation ever reached: places unlocked by reputation stay open. */
  bestRep: number;
  stock: Stock;
  upgrades: Partial<Record<UpgradeId, true>>;
  /** Equipment condition, 0–100. */
  condition: Partial<Record<EquipId, number>>;
  broken: Partial<Record<EquipId, true>>;
  /** Cups of lemonade kept in the cooler overnight. */
  carryCups: number;
  /** Extra stands at other places, run by sellers. */
  points: Point[];
  nextPointId: number;
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
  /** Station: trains from the big city (many people). */
  trains: boolean;
  /** Station: track repairs (few trains, few people). */
  trackRepair: boolean;
  /** Mall: a concert in the evening. */
  concert: boolean;
  /** Mall: a big sale (more shoppers all day). */
  mallSale: boolean;
}

/** The jug being made in the kitchen mini-game (nothing is used up until it is poured). */
export interface KitchenState {
  /** Parts of lemon juice (= recipe lemons). */
  juice: number;
  sugar: number;
  water: number;
  mix: MixResult;
  /** Stirred by hand because the mixer is broken (takes longer). */
  hand: boolean;
  stir: number;
}

export type PointReport = PointDay & { id: number; loc: LocationId; nameId: number | null };

export interface DayReport {
  sales: number;
  bonus: number;
  income: number;
  expenses: number;
  ingredients: number;
  rent: number;
  flyers: number;
  stolen: number;
  wages: number;
  repairs: number;
  training: number;
  profit: number;
  sold: number;
  freeCups: number;
  wastedCups: number;
  wasteCost: number;
  carriedCups: number;
  repStart: number;
  repEnd: number;
  funnel: Funnel;
  outOfRange: number;
  lesson: { key: string; params: Params };
  stockValue: number;
  spoilTomorrow: number;
  broke: EquipId[];
  /** Places that opened tonight (reputation milestone). */
  unlocked: LocationId[];
  /** The player's other stands today (already included in income and expenses). */
  points: PointReport[];
  pointsProfit: number;
  /** Tonight the reputation first reached the level for extra stands. */
  pointsUnlocked: boolean;
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
  /** Today's goods come by delivery (pricier, no trip). */
  delivery: boolean;
  sales: number;
  bonus: number;
  expenses: { ingredients: number; rent: number; flyers: number; stolen: number; wages: number; repairs: number; training: number };
  flyers: boolean;
  helper: boolean;
  /** The stand was open today (equipment wears out). */
  opened: boolean;
  kitchen: KitchenState;
  /** 0.85–1: how well the lemonade was mixed. */
  mixQuality: number;
  cupsReady: number;
  /** Cups that came from the cooler this morning (sold first). */
  carriedIn: number;
  pitchersMade: number;
  recipeUsed: Recipe;
  funnel: Funnel;
  freeCups: number;
  repStart: number;
  coinsStart: number;
  spoiledOvernight: number;
  rottenToday: number;
  thief: { appeared: boolean; caught: boolean; stolen: number };
  soldOutAt: number | null;
  marketCardsShown: boolean;
  brokeToday: EquipId[];
  lastRiskHour: number;
  report: DayReport | null;
}

export function emptyFunnel(): Funnel {
  return { passed: 0, inRange: 0, stopped: 0, tooExpensive: 0, queueFull: 0, soldOut: 0, joined: 0, sold: 0, impatient: 0 };
}

export function emptyEvents(): DayEvents {
  return { festival: false, thiefAt: null, sugarHike: false, cupsSoldOut: false, badLemons: false, trains: false, trackRepair: false, concert: false, mallSale: false };
}

export function emptyKitchen(): KitchenState {
  return { juice: 0, sugar: 0, water: 0, mix: 'none', hand: false, stir: 0 };
}

export function newGameState(seed: number, o: { ageMode: AgeMode; avatar: Avatar; lang: Lang; name?: string }): GameState {
  return {
    v: 1,
    seed,
    playerName: o.name ?? '',
    day: 1,
    coins: CONFIG.START_COINS,
    rep: CONFIG.START_REP,
    bestRep: CONFIG.START_REP,
    stock: { lemons: [], water: 0, sugar: 0, cups: 0 },
    upgrades: {},
    condition: { mixer: 100 },
    broken: {},
    carryCups: 0,
    points: [],
    nextPointId: 1,
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
    events: emptyEvents(),
    newsKey: 'news.calm0',
    hour: CONFIG.DAY_START,
    startHour: CONFIG.DAY_START,
    marketTrips: 0,
    delivery: false,
    sales: 0,
    bonus: 0,
    expenses: { ingredients: 0, rent: 0, flyers: 0, stolen: 0, wages: 0, repairs: 0, training: 0 },
    flyers: false,
    helper: false,
    opened: false,
    kitchen: emptyKitchen(),
    mixQuality: 1,
    cupsReady: 0,
    carriedIn: 0,
    pitchersMade: 0,
    recipeUsed: { ...s.recipe },
    funnel: emptyFunnel(),
    freeCups: 0,
    repStart: s.rep,
    coinsStart: s.coins,
    spoiledOvernight: 0,
    rottenToday: 0,
    thief: { appeared: false, caught: false, stolen: 0 },
    soldOutAt: null,
    marketCardsShown: false,
    brokeToday: [],
    lastRiskHour: CONFIG.DAY_START,
    report: null,
  };
}

/** Fills fields that older saves do not have (saves stay at format v1). */
export function normalizeState(S: GameState, D: DayState): void {
  const fresh = newGameState(S.seed, { ageMode: S.ageMode, avatar: S.avatar, lang: S.lang });
  for (const k of Object.keys(fresh) as (keyof GameState)[]) {
    if (S[k] === undefined) (S as unknown as Record<string, unknown>)[k] = fresh[k];
  }
  if (S.condition.mixer === undefined) S.condition.mixer = 100;
  S.bestRep = Math.max(S.bestRep, S.rep);
  for (const id of Object.keys(S.upgrades)) {
    const eq = id as keyof GameState['condition'];
    if (['umbrella', 'tent', 'juicer_hand', 'juicer_lever', 'speaker', 'bike', 'scooter', 'dispenser'].includes(id) && S.condition[eq] === undefined) S.condition[eq] = 100;
  }
  const day = newDayState(S, D.weather ?? 'sunny', D.forecast ?? 'sunny');
  for (const k of Object.keys(day) as (keyof DayState)[]) {
    if (D[k] === undefined) (D as unknown as Record<string, unknown>)[k] = day[k];
  }
  D.expenses = { ...day.expenses, ...D.expenses };
  D.kitchen = { ...emptyKitchen(), ...D.kitchen };
  D.events = { ...emptyEvents(), ...D.events };
}

export function lemonsTotal(stock: Stock): number {
  return stock.lemons.reduce((s, b) => s + b.n, 0);
}

export function dayExpenses(d: DayState): number {
  const e = d.expenses;
  return e.ingredients + e.rent + e.flyers + e.stolen + e.wages + e.repairs + e.training;
}
