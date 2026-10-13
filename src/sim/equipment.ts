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

/** Equipment that stays in the bag at an indoor place (an umbrella in a mall). */
export function unusedHere(S: GameState, id: UpgradeId | EquipId): boolean {
  return !!LOCATIONS[S.location].indoor && !!UPGRADES[id as UpgradeId]?.outdoorOnly;
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

/** The bike stays at home while a working scooter does its job: it neither wears out nor breaks. */
export function sparedByScooter(S: GameState, id: EquipId): boolean {
  return id === 'bike' && !!S.upgrades.scooter && !S.broken.scooter;
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
    if (id === 'mixer' ? !usedMixer : !opened || unusedHere(S, id) || sparedByScooter(S, id)) continue;
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
    if (S.broken[id] || sparedByScooter(S, id)) continue;
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
    if (id === 'mixer' || S.broken[id] || unusedHere(S, id) || sparedByScooter(S, id)) continue;
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
