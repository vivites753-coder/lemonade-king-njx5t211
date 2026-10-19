// Equipment wear, breakdowns, repairs and maintenance.
import { CONFIG } from '../core/config';
import type { RNG } from '../core/rng';
import type { EquipId, UpgradeId, WeatherId } from '../core/types';
import { LOCATIONS } from '../data/locations';
import { BREAK_RISK_BELOW, EQUIPMENT, EQUIP_IDS, MIDDAY_RISK_BELOW, MIDDAY_RISK_PER_POINT, PRO_MIXER_WEAR } from '../data/equipment';
import { UPGRADES } from '../data/upgrades';
import type { Owned } from './economy';
import type { GameState } from './state';

/** Equipment the player has (the mixer always). */
export function ownedEquipment(S: GameState): EquipId[] {
  return EQUIP_IDS.filter((id) => {
    const up = EQUIPMENT[id].upgrade;
    return !up || !!S.upgrades[up];
  });
}

/** Equipment that stays at home here: an umbrella in a mall, the parts of the stand at the own store, the equipment of
 * the store anywhere else. */
export function unusedHere(S: GameState, id: UpgradeId | EquipId): boolean {
  const loc = LOCATIONS[S.location];
  const u = UPGRADES[id as UpgradeId];
  return (!!loc.indoor && !!u?.outdoorOnly) || (!!loc.store && !!u?.standOnly) || (!loc.store && !!u?.storeOnly);
}

/** Upgrades that work right now: broken equipment gives no bonus, an umbrella is useless indoors. */
export function activeUpgrades(S: GameState): Owned {
  const out: Owned = {};
  for (const id of Object.keys(S.upgrades) as UpgradeId[]) {
    if (S.broken[id as EquipId] || unusedHere(S, id)) continue;
    out[id] = true;
  }
  return out;
}

/** Older things that a better upgrade replaces while that one works: they are not used, so they neither wear out,
 * nor break, nor need maintenance. If the better one breaks, the old one is used again. */
const REPLACED_BY: Partial<Record<EquipId, (EquipId & UpgradeId)[]>> = { bike: ['scooter'], juicer_hand: ['juicer_lever'], umbrella: ['tent'] };
/** The truck has its own roof: the umbrella and the tent stay at home. */
const REPLACED_BY_TRUCK: EquipId[] = ['umbrella', 'tent'];

export function retired(S: GameState, id: EquipId): boolean {
  if (S.upgrades.truck && REPLACED_BY_TRUCK.includes(id)) return true;
  return (REPLACED_BY[id] ?? []).some((better) => !!S.upgrades[better] && !S.broken[better]);
}

/** Equipment the player has and really uses (what wears out and can be looked after in the shop). */
export function inUseEquipment(S: GameState): EquipId[] {
  return ownedEquipment(S).filter((id) => !retired(S, id));
}

export function mixerBroken(S: GameState): boolean {
  return !!S.broken.mixer;
}

function upgradeMult(S: GameState, field: 'wearMult' | 'repairMult'): number {
  let m = 1;
  for (const id of Object.keys(S.upgrades) as UpgradeId[]) m *= UPGRADES[id][field] ?? 1;
  return m;
}

export function repairCost(S: GameState, id: EquipId): number {
  return Math.max(1, Math.round(EQUIPMENT[id].repair * upgradeMult(S, 'repairMult')));
}

/** Preventive maintenance: cheaper than a repair, the more worn the dearer. */
export function maintenanceCost(S: GameState, id: EquipId): number {
  const cond = S.condition[id] ?? 100;
  if (cond >= 99) return 0;
  return Math.max(1, Math.ceil(repairCost(S, id) * CONFIG.MAINTENANCE_SHARE * ((100 - cond) / 100)));
}

/** End of a working day: equipment loses condition. */
export function applyWear(S: GameState, rng: RNG, weather: WeatherId, usedMixer: boolean, opened: boolean): void {
  const toolkit = upgradeMult(S, 'wearMult');
  for (const id of ownedEquipment(S)) {
    if (S.broken[id]) continue;
    if (id === 'mixer' ? !usedMixer : !opened || unusedHere(S, id) || retired(S, id)) continue;
    const def = EQUIPMENT[id];
    let wear = rng.range(def.wear[0], def.wear[1]) * (def.weather?.[weather] ?? 1) * toolkit;
    if (id === 'mixer' && S.upgrades.mixer_pro) wear *= PRO_MIXER_WEAR;
    S.condition[id] = Math.max(0, (S.condition[id] ?? 100) - wear);
  }
}

/** Overnight check: worn-out equipment may break. Returns what broke. */
export function rollBreaks(S: GameState, rng: RNG): EquipId[] {
  const out: EquipId[] = [];
  for (const id of ownedEquipment(S)) {
    if (S.broken[id] || retired(S, id)) continue;
    const cond = S.condition[id] ?? 100;
    const p = cond <= 0 ? 1 : cond < BREAK_RISK_BELOW ? (BREAK_RISK_BELOW - cond) / 80 : 0;
    if (p > 0 && rng.chance(p)) {
      S.broken[id] = true;
      out.push(id);
    }
  }
  return out;
}

/** During selling, roughly once per game hour: a worn item may break right now. */
export function rollMiddayBreak(S: GameState, rng: RNG, weather: WeatherId): EquipId | null {
  for (const id of ownedEquipment(S)) {
    if (id === 'mixer' || S.broken[id] || unusedHere(S, id) || retired(S, id)) continue;
    const cond = S.condition[id] ?? 100;
    if (cond >= MIDDAY_RISK_BELOW) continue;
    const p = (MIDDAY_RISK_BELOW - cond) * MIDDAY_RISK_PER_POINT * (EQUIPMENT[id].weather?.[weather] ?? 1);
    if (rng.chance(p)) {
      S.broken[id] = true;
      return id;
    }
  }
  return null;
}

export function restore(S: GameState, id: EquipId): void {
  delete S.broken[id];
  S.condition[id] = 100;
}
