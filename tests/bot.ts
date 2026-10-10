// A simple scripted player used by tests: plays whole days without any UI.
import { Game, type Cart } from '../src/sim/game';
import { LOCATIONS } from '../src/data/locations';
import { UPGRADE_ORDER, UPGRADES } from '../src/data/upgrades';
import { CONFIG } from '../src/core/config';
import type { LocationId } from '../src/core/types';

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

function chooseLocation(g: Game): LocationId {
  if (g.S.day === 1) return 'yard';
  const w = g.D.forecast;
  if (w === 'rain' || w === 'cold') return 'yard';
  if ((w === 'hot' || w === 'sunny') && g.S.coins >= 170) return 'beach';
  if (g.S.coins >= 90) return 'park';
  return 'yard';
}

const WANT: Record<LocationId, number> = { yard: 2, park: 4, school: 3, beach: 6 };

/** Plays one full day (morning → shop). Returns the report profit. */
export function playDay(g: Game, opts: { catchThief?: boolean; buyUpgrades?: boolean } = {}): BotDay {
  const loc = chooseLocation(g);
  g.chooseLocation(loc);
  const wanted = g.D.forecast === 'rain' ? 1 : WANT[loc];
  const reserve = LOCATIONS[loc].rent;
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
  g.setPrice(LOCATIONS[g.S.location].fairPrice);
  g.setPitchers(g.maxPitchersNow());
  if (g.maxPitchersNow() < 1 && g.goMarket()) {
    // e.g. the lemons were rotten: one more trip to the market
    g.addPitcherKit();
    if (g.cartTotal() > g.S.coins) g.leaveMarket();
    else g.pay();
    g.setPitchers(g.maxPitchersNow());
  }
  if (!g.startSelling()) g.restDay();
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
  if (opts.buyUpgrades !== false) {
    for (const id of UPGRADE_ORDER) {
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
