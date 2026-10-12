// A simple scripted player used by tests: plays whole days without any UI.
import { Game, type Cart } from '../src/sim/game';
import { LOCATIONS } from '../src/data/locations';
import { UPGRADES } from '../src/data/upgrades';
import { CONFIG } from '../src/core/config';
import type { EquipId, LocationId, UpgradeId } from '../src/core/types';
import { ownedEquipment } from '../src/sim/equipment';

export interface BotDay {
  day: number;
  loc: LocationId;
  weather: string;
  profit: number;
  coins: number;
  rep: number;
  sold: number;
}

export interface BotResult {
  reached: boolean;
  days: number;
  coins: number;
  rep: number;
  log: BotDay[];
}

export interface BotOpts {
  catchThief?: boolean;
  buyUpgrades?: boolean;
  helper?: boolean;
  maintain?: boolean;
}

/** A thrifty player buys only what pays off quickly while saving for the stage goal. */
const BOT_UPGRADES: UpgradeId[] = ['sign', 'umbrella', 'juicer_hand', 'banner', 'dispenser', 'speaker', 'bike'];

function chooseLocation(g: Game): LocationId {
  if (g.S.day === 1) return 'yard';
  const w = g.D.forecast;
  if (w === 'rain' || w === 'cold') return 'yard';
  if ((w === 'hot' || w === 'sunny') && g.S.coins >= 170) return 'beach';
  if (g.S.coins >= 90) return 'park';
  return 'yard';
}

const WANT: Record<LocationId, number> = { yard: 2, park: 4, school: 3, beach: 6 };

/** Makes lemonade in the kitchen like a careful player. */
export function cook(g: Game, pitchers: number): boolean {
  if (g.phase !== 'kitchen') return false;
  g.kitchenRepeat();
  if (!g.kitchenCanMix()) return false;
  if (g.S.broken.mixer) while (!g.kitchenStir());
  else g.kitchenMix('perfect');
  return g.kitchenPour(Math.min(pitchers, g.kitchenMaxPitchers()));
}

/** Plays one full day (morning → shop). */
export function playDay(g: Game, opts: BotOpts = {}): BotDay {
  const loc = chooseLocation(g);
  g.chooseLocation(loc);
  // fix broken equipment first if it is affordable
  for (const id of Object.keys(g.S.broken) as EquipId[]) if (g.S.coins - g.repairCost(id) >= 60) g.repair(id);
  const wanted = g.D.forecast === 'rain' ? 1 : WANT[loc];
  const reserve = LOCATIONS[loc].rent + 30;
  if (g.maxPitchersNow() < wanted && g.goMarket()) {
    for (let k = 0; k < wanted && g.pitchersWithCart() < wanted; k++) {
      const before: Cart = { ...g.cart };
      g.addPitcherKit();
      if (g.cartTotal() + reserve > g.S.coins) {
        g.cart = before;
        break;
      }
    }
    g.pay();
  } else {
    g.skipMarket();
  }
  if (!cook(g, wanted)) {
    if (g.maxPitchersNow() < 1 && g.goMarket()) {
      // e.g. the lemons were rotten: one more trip to the market
      g.addPitcherKit();
      if (g.cartTotal() > g.S.coins) g.leaveMarket();
      else g.pay();
      cook(g, 1);
    }
  }
  if (g.phase === 'kitchen') g.leaveKitchen();
  if (g.phase === 'prepare') {
    g.setPrice(LOCATIONS[g.S.location].fairPrice);
    const goodDay = loc === 'park' || loc === 'beach';
    if (opts.helper !== false && goodDay && g.S.day >= 4 && g.S.coins > 200) g.setHelper(true);
    if (!g.startSelling()) g.restDay();
  } else if (g.phase !== 'report') {
    g.restDay();
  }
  if (g.phase === 'sell') g.setSpeed(4);
  let guard = 0;
  while (g.phase === 'sell' && guard++ < 200000) {
    g.update(0.05);
    if (g.street.thief && opts.catchThief) g.catchThief();
    if (!g.serving && !g.making) {
      if (g.D.cupsReady === 0 && g.canMakePitcher()) g.makePitcher();
      else g.serve();
    }
  }
  const r = g.D.report!;
  const day: BotDay = { day: g.S.day, loc, weather: g.D.weather, profit: r.profit, coins: g.S.coins, rep: g.S.rep, sold: r.sold };
  g.openShop();
  for (const id of opts.maintain === false ? [] : ownedEquipment(g.S)) {
    if (!g.S.broken[id] && (g.S.condition[id] ?? 100) < 50 && g.S.coins - g.maintenanceCost(id) >= 100) g.maintain(id);
  }
  if (opts.buyUpgrades !== false) {
    for (const id of BOT_UPGRADES) {
      if (g.canBuy(id).ok && g.S.coins - UPGRADES[id].price >= 150) g.buyUpgrade(id);
    }
  }
  return day;
}

export function runBot(seed: number, maxDays = 30): BotResult {
  const g = new Game(seed);
  g.newGame({ ageMode: 'pro', avatar: 'boy', lang: 'uk', seed });
  const log: BotDay[] = [];
  while (g.S.day <= maxDays) {
    if (g.phase === 'report') g.openShop();
    if (g.phase !== 'morning') g.sleep();
    log.push(playDay(g, { catchThief: g.S.day % 2 === 0 }));
    if (g.S.coins >= CONFIG.GOAL_COINS && g.S.rep >= CONFIG.GOAL_REP) {
      return { reached: true, days: g.S.day, coins: g.S.coins, rep: g.S.rep, log };
    }
    g.sleep();
  }
  return { reached: false, days: maxDays, coins: g.S.coins, rep: g.S.rep, log };
}
