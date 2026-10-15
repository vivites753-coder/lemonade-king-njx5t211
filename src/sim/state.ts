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
  cookies: number;
}

export interface Recipe {
  lemons: number;
  sugar: number;
}

export interface Settings {
  sound: boolean;
  /** Background music (the sound switch mutes it too). */
  music: boolean;
  /** Size of all the texts: 1 = normal (see FONT_SCALES). */
  fontScale: number;
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
export interface TruckLook {
  /** Colour scheme (see TRUCK_SKINS). */
  skin: number;
  /** Logo (see TRUCK_LOGOS). */
  logo: number;
  /** Text on the neon sign; empty = the default name. */
  text: string;
}

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
  /** How the food truck looks (chosen by the player). */
  truck: TruckLook;
  /** Extra stands at other places, run by sellers. */
  points: Point[];
  nextPointId: number;
  location: LocationId;
  price: number;
  /** Price of one cookie (cookies are sold together with lemonade). */
  cookiePrice: number;
  recipe: Recipe;
  speakerOn: boolean;
  seenTips: Record<string, true>;
  /** The player asked for no tutorial tips at all (the test profile). */
  noTips?: boolean;
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
  /** How busy each place is today (1 = usual). Missing (old saves, tests) means 1. */
  busy?: Partial<Record<LocationId, number>>;
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
  cookieSales: number;
  cookiesSold: number;
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
  /** Cups lost in accidents. */
  spilled: number;
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
  /** Part of `sales` that came from cookies. */
  cookieSales: number;
  cookiesSold: number;
  bonus: number;
  expenses: { ingredients: number; rent: number; flyers: number; stolen: number; wages: number; repairs: number; training: number };
  flyers: boolean;
  /** At least one helper today (kept for older saves and simple checks). */
  helper: boolean;
  /** Helpers hired today: 0, 1 or 2 (two need a stand with two counters). */
  helpers: number;
  /** The stand was open today (equipment wears out). */
  opened: boolean;
  kitchen: KitchenState;
  /** Jugs poured in the current kitchen visit (the first one also pays the set-up time). */
  kitchenJugs: number;
  /** The "lemonade is over" question was asked (asked again after the next refill). */
  outAsked: boolean;
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
  /** Today's accidents and lucky finds (rolled in the morning). */
  incidents: { id: string; kind: 'acc' | 'bonus'; at: number; done: boolean }[];
  /** A blackout: electric things do not work until this hour (0 = no blackout). */
  blackoutUntil: number;
  /** Stray dogs scare customers until this hour. */
  dogsUntil: number;
  /** Cups lost in accidents today. */
  spilled: number;
  report: DayReport | null;
}

export function emptyFunnel(): Funnel {
  return { passed: 0, inRange: 0, stopped: 0, tooExpensive: 0, queueFull: 0, soldOut: 0, joined: 0, sold: 0, impatient: 0 };
}

export function emptyEvents(): DayEvents {
  return { festival: false, thiefAt: null, sugarHike: false, cupsSoldOut: false, badLemons: false, trains: false, trackRepair: false, concert: false, mallSale: false, busy: {} };
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
    stock: { lemons: [], water: 0, sugar: 0, cups: 0, cookies: 0 },
    upgrades: {},
    condition: { mixer: 100 },
    broken: {},
    carryCups: 0,
    truck: { skin: 0, logo: 0, text: '' },
    points: [],
    nextPointId: 1,
    location: 'yard',
    price: 8,
    cookiePrice: 5,
    recipe: { lemons: CONFIG.IDEAL_LEMONS, sugar: CONFIG.IDEAL_SUGAR },
    speakerOn: true,
    seenTips: {},
    glossary: [],
    ageMode: o.ageMode,
    avatar: o.avatar,
    lang: o.lang,
    settings: { sound: true, music: true, fontScale: 1, reduceMotion: false, dyslexia: false, showZone: true },
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
    cookieSales: 0,
    cookiesSold: 0,
    bonus: 0,
    expenses: { ingredients: 0, rent: 0, flyers: 0, stolen: 0, wages: 0, repairs: 0, training: 0 },
    flyers: false,
    helper: false,
    helpers: 0,
    opened: false,
    kitchen: emptyKitchen(),
    kitchenJugs: 0,
    outAsked: false,
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
    incidents: [],
    blackoutUntil: 0,
    dogsUntil: 0,
    spilled: 0,
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
  S.settings = { ...fresh.settings, ...S.settings };
  S.bestRep = Math.max(S.bestRep, S.rep);
  S.stock.cookies ??= 0;
  for (const id of Object.keys(S.upgrades)) {
    const eq = id as keyof GameState['condition'];
    if (['umbrella', 'tent', 'juicer_hand', 'juicer_lever', 'speaker', 'bike', 'scooter', 'dispenser', 'tv'].includes(id) && S.condition[eq] === undefined) S.condition[eq] = 100;
  }
  const day = newDayState(S, D.weather ?? 'sunny', D.forecast ?? 'sunny');
  for (const k of Object.keys(day) as (keyof DayState)[]) {
    if (D[k] === undefined) (D as unknown as Record<string, unknown>)[k] = day[k];
  }
  D.expenses = { ...day.expenses, ...D.expenses };
  D.kitchen = { ...emptyKitchen(), ...D.kitchen };
  D.events = { ...emptyEvents(), ...D.events };
  S.truck = Object.assign({ skin: 0, logo: 0, text: '' }, S.truck);
  if (D.helpers === undefined || (D.helper && !D.helpers)) D.helpers = D.helper ? 1 : 0;
  // stands from before they had their own equipment: a sign, and what they cost then
  for (const p of S.points) {
    p.upgrades ??= { sign: true };
    p.invested ??= 400;
    p.away ??= null;
    p.helper ??= null;
  }
}

export function lemonsTotal(stock: Stock): number {
  return stock.lemons.reduce((s, b) => s + b.n, 0);
}

export function dayExpenses(d: DayState): number {
  const e = d.expenses;
  return e.ingredients + e.rent + e.flyers + e.stolen + e.wages + e.repairs + e.training;
}
