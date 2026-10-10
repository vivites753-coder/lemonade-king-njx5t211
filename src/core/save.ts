import type { Snapshot } from '../sim/game';

const KEY = 'lemonadeKing.save';
export const SAVE_VERSION = 1;

/** Local storage can be missing or blocked (private mode, WebView settings): never throw. */
export function writeSave(s: Snapshot): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function readSave(): Snapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
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
