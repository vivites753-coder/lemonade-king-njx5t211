// Saves live in localStorage, one per player profile:
//   lemonadeKing.profiles      — the list of profiles and which one is playing
//   lemonadeKing.save.<id>     — that profile's game
// A save from before profiles existed (lemonadeKing.save) becomes the first profile automatically.
import type { Snapshot } from '../sim/game';
import type { Avatar } from './types';

const INDEX_KEY = 'lemonadeKing.profiles';
const LEGACY_KEY = 'lemonadeKing.save';
export const SAVE_VERSION = 1;

export interface ProfileInfo {
  id: string;
  name: string;
  avatar: Avatar;
  createdAt: number;
  day?: number;
  coins?: number;
  savedAt?: number;
}

interface ProfilesIndex {
  v: 1;
  active: string | null;
  list: ProfileInfo[];
}

const saveKey = (id: string) => `lemonadeKing.save.${id}`;

/** Local storage can be missing or blocked (private mode, WebView settings): never throw. */
function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

const BUILD_KEY = 'lemonadeKing.build';
/** Kept through updates: the developer-mode switch of this device. */
const KEEP = new Set(['lemonadeKing.dev']);

/**
 * Every update of the game wipes all players and saves, so nobody plays with data from an older
 * version. Returns true when something was wiped. Set WIPE_ON_UPDATE to false to keep progress.
 */
export const WIPE_ON_UPDATE = true;
export function wipeOnUpdate(buildId: string): boolean {
  const last = get(BUILD_KEY);
  if (last === buildId) return false;
  let wiped = false;
  if (WIPE_ON_UPDATE && last !== null) {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('lemonadeKing.') && !KEEP.has(k) && k !== BUILD_KEY) keys.push(k);
      }
      for (const k of keys) remove(k);
      wiped = keys.length > 0;
    } catch {
      /* storage blocked */
    }
  }
  set(BUILD_KEY, buildId);
  return wiped;
}

function newId(): string {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
}

function readIndex(): ProfilesIndex {
  const raw = get(INDEX_KEY);
  if (raw) {
    try {
      const idx = JSON.parse(raw) as ProfilesIndex;
      if (idx && Array.isArray(idx.list)) return idx;
    } catch {
      /* broken index: rebuild below */
    }
  }
  const idx: ProfilesIndex = { v: 1, active: null, list: [] };
  // migrate the single save from older versions into a profile
  const legacy = parseSave(get(LEGACY_KEY) ?? '');
  if (legacy) {
    const id = newId();
    idx.list.push({
      id,
      name: legacy.S.playerName || 'Гравець 1',
      avatar: legacy.S.avatar,
      createdAt: Date.now(),
      day: legacy.S.day,
      coins: legacy.S.coins,
      savedAt: legacy.savedAt,
    });
    idx.active = id;
    set(saveKey(id), JSON.stringify(legacy));
    remove(LEGACY_KEY);
  }
  writeIndex(idx);
  return idx;
}

function writeIndex(idx: ProfilesIndex): void {
  set(INDEX_KEY, JSON.stringify(idx));
}

export function listProfiles(): ProfileInfo[] {
  return readIndex().list;
}

export function activeProfile(): ProfileInfo | null {
  const idx = readIndex();
  return idx.list.find((p) => p.id === idx.active) ?? null;
}

export function setActiveProfile(id: string): void {
  const idx = readIndex();
  if (!idx.list.some((p) => p.id === id)) return;
  idx.active = id;
  writeIndex(idx);
}

export function createProfile(name: string, avatar: Avatar): ProfileInfo {
  const idx = readIndex();
  const p: ProfileInfo = { id: newId(), name: name.trim().slice(0, 20) || `Гравець ${idx.list.length + 1}`, avatar, createdAt: Date.now() };
  idx.list.push(p);
  idx.active = p.id;
  writeIndex(idx);
  return p;
}

export function deleteProfile(id: string): void {
  const idx = readIndex();
  idx.list = idx.list.filter((p) => p.id !== id);
  if (idx.active === id) idx.active = null;
  writeIndex(idx);
  remove(saveKey(id));
}

/** Saves the game of the active profile and refreshes the profile card (day, coins). */
export function writeSave(s: Snapshot): void {
  const idx = readIndex();
  let p = idx.list.find((x) => x.id === idx.active);
  if (!p) {
    p = { id: newId(), name: s.S.playerName || `Гравець ${idx.list.length + 1}`, avatar: s.S.avatar, createdAt: Date.now() };
    idx.list.push(p);
    idx.active = p.id;
  }
  p.day = s.S.day;
  p.coins = s.S.coins;
  p.savedAt = s.savedAt;
  p.avatar = s.S.avatar;
  if (s.S.playerName) p.name = s.S.playerName;
  set(saveKey(p.id), JSON.stringify(s));
  writeIndex(idx);
}

export function readSave(id?: string): Snapshot | null {
  const pid = id ?? readIndex().active;
  if (!pid) return null;
  return parseSave(get(saveKey(pid)) ?? '');
}

/** Clears the active profile's game (the profile itself stays). */
export function clearSave(): void {
  const idx = readIndex();
  if (!idx.active) return;
  remove(saveKey(idx.active));
  const p = idx.list.find((x) => x.id === idx.active);
  if (p) {
    delete p.day;
    delete p.coins;
    delete p.savedAt;
  }
  writeIndex(idx);
}

/** Text of a save file (used to move progress to another browser or phone). */
export function serializeSave(s: Snapshot): string {
  return JSON.stringify(s);
}

/** Parses the text of a save file. Returns null when it is not a valid Lemonade King save. */
export function parseSave(text: string): Snapshot | null {
  try {
    if (!text || text.length > 2_000_000) return null;
    return migrate(JSON.parse(text));
  } catch {
    return null;
  }
}

export function migrate(o: unknown): Snapshot | null {
  if (!o || typeof o !== 'object') return null;
  const snap = o as Snapshot;
  if (snap.v !== SAVE_VERSION || !snap.S || !snap.D) return null;
  // Future versions: transform older snapshots here, field by field.
  // The read-aloud setting was removed (browser text-to-speech sounded wrong).
  if (snap.S.settings) delete (snap.S.settings as unknown as Record<string, unknown>).readAloud;
  return snap;
}
