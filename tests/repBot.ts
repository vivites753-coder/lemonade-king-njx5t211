// A headless player that plays for the reputation: the busiest place it can afford, as much lemonade as the forecast
// promises buyers, the fair price, helpers, the thief caught, and first the upgrades that bring more happy customers.
// Used by tests/repSpeed.test.ts. (Tried and dropped: flyers and online ads every day, or a price 10-20 % under the fair
// one: the levels come no sooner, and some games run out of money and stall.)
import { CONFIG } from '../src/core/config';
import type { EquipId, LocationId, UpgradeId } from '../src/core/types';
import { LOCATION_IDS, LOCATIONS } from '../src/data/locations';
import { UPGRADES } from '../src/data/upgrades';
import { expectedDay } from '../src/sim/economy';
import { ownedEquipment } from '../src/sim/equipment';
import { Game, type Cart } from '../src/sim/game';
import type { DayReport } from '../src/sim/state';

/** What a player who wants happy customers buys first: more people stop, they wait less, the cups taste better. */
const FOR_REP: UpgradeId[] = [
  'sign',
  'umbrella',
  'juicer_hand',
  'loyalty',
  'dispenser',
  'banner',
  'freezer',
  'tv',
  'speaker',
  'bike',
  'toolkit',
  'branded_cups',
  'big_stand',
  'mixer_pro',
  'mascot',
  'juicer_lever',
];
/** Coins kept for tomorrow's lemons and rent when buying upgrades. */
const RESERVE = 120;
export const LEVELS = [2, 3, 4, 5] as const;

/** The forecast's day at a place, at its fair price. */
function expected(g: Game, id: LocationId) {
  const loc = LOCATIONS[id];
  return expectedDay({ loc: id, weather: g.D.forecast, price: loc.fairPrice, upgrades: g.S.upgrades, rep: g.S.rep, from: g.openingHour(true, id), events: g.D.events });
}

/** The place with the most buyers by the forecast that the purse allows (its rent and a few pitchers). */
function bestPlace(g: Game): LocationId {
  let best: LocationId = 'yard';
  let most = -1;
  for (const id of LOCATION_IDS) {
    const loc = LOCATIONS[id];
    if (loc.store || !g.unlocked(id) || g.S.coins < loc.rent + 60) continue;
    const buyers = expected(g, id).buyers;
    if (buyers > most) {
      most = buyers;
      best = id;
    }
  }
  return best;
}

/** Every jug from scratch, mixed just right, with ice from the freezer. */
function cook(g: Game, pitchers: number): void {
  for (let i = 0; i < pitchers; i++) {
    g.kitchenRepeat();
    if (g.S.upgrades.freezer && g.D.kitchen.ice < CONFIG.ICE_PER_PITCHER) g.kitchenAdd('ice');
    if (!g.kitchenCanMix() || g.kitchenMaxPitchers() < 1) break;
    if (g.S.broken.mixer) while (!g.kitchenStir());
    else g.kitchenMix('perfect');
    if (!g.kitchenPour()) break;
  }
  if (g.phase === 'kitchen') g.leaveKitchen();
}

/** One whole day, morning to the evening shop: the day's report (none when the player rested). */
function playForRep(g: Game): DayReport | null {
  const loc = bestPlace(g);
  g.chooseLocation(loc);
  for (const id of Object.keys(g.S.broken) as EquipId[]) if (g.S.coins - g.repairCost(id) >= 60) g.repair(id);
  const want = Math.max(1, Math.min(12, Math.ceil(expected(g, loc).buyers / CONFIG.CUPS_PER_PITCHER) + 1));
  const reserve = LOCATIONS[loc].rent + 20;
  if (g.maxPitchersNow() < want && g.goMarket()) {
    for (let k = 0; k < want * 2 && g.pitchersWithCart() < want; k++) {
      const before: Cart = { ...g.cart };
      g.addPitcherKit();
      if (g.cartTotal() + reserve > g.S.coins) {
        g.cart = before;
        break;
      }
    }
    if (!g.pay()) g.leaveMarket();
  } else {
    g.skipMarket();
  }
  if (g.phase === 'kitchen') cook(g, want);
  if (g.phase === 'prepare') {
    g.setPrice(LOCATIONS[loc].fairPrice);
    const helpers = g.helperCap();
    if (helpers > 0 && g.S.coins > 100 + CONFIG.HELPER_WAGE * helpers) g.setHelpers(helpers);
    if (!g.startSelling()) g.restDay();
  } else if (g.phase !== 'report') {
    g.restDay();
  }
  if (g.phase === 'sell') g.setSpeed(4);
  let guard = 0;
  while (g.phase === 'sell' && guard++ < 300000) {
    g.update(0.05);
    if (g.street.thief) g.catchThief();
    if (!g.serving && !g.making) {
      if (g.D.cupsReady === 0 && g.canMakePitcher()) g.makePitcher();
      else g.serve();
    }
  }
  const report = g.D.report;
  g.openShop();
  for (const id of ownedEquipment(g.S)) {
    if (!g.S.broken[id] && (g.S.condition[id] ?? 100) < 50 && g.S.coins - g.maintenanceCost(id) >= 100) g.maintain(id);
  }
  for (const id of FOR_REP) if (g.canBuy(id).ok && g.S.coins - UPGRADES[id].price >= RESERVE) g.buyUpgrade(id);
  return report;
}

export interface RepRun {
  seed: number;
  /** The day each level was first reached (null: not within the days played). */
  day: Record<(typeof LEVELS)[number], number | null>;
  /** Cups sold and customers who left angry, all days together. */
  sold: number;
  angry: number;
}

/** Plays a new game until the top level (or `maxDays`). */
export function runForRep(seed: number, maxDays: number): RepRun {
  const g = new Game(seed);
  g.newGame({ ageMode: 'pro', avatar: 'girl', lang: 'uk', seed });
  const run: RepRun = { seed, day: { 2: null, 3: null, 4: null, 5: null }, sold: 0, angry: 0 };
  while (g.S.day <= maxDays && run.day[5] === null) {
    if (g.phase === 'report') g.openShop();
    if (g.phase !== 'morning') g.sleep();
    const r = playForRep(g);
    run.sold += r?.funnel.sold ?? 0;
    run.angry += r?.funnel.impatient ?? 0;
    for (const l of LEVELS) if (run.day[l] === null && g.S.bestRep >= l - 1e-9) run.day[l] = g.S.day;
    g.sleep();
  }
  return run;
}
