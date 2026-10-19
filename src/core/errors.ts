// Errors while the game runs: one error must not stop the game (the frame loop goes on), and the last ones are kept
// on this device (without repeats) so that a problem on a phone can be seen later in the developer mode.

const KEY = 'lemonadeKing.errors';
/** How many different errors are kept. */
const MAX = 12;

export interface ErrorEntry {
  /** Which part of the game it happened in (render, game, ui, window, promise ...). */
  where: string;
  msg: string;
  /** The first lines of the stack. */
  stack: string;
  /** How many times it happened, and when it happened last (ms since 1970). */
  n: number;
  at: number;
}

let list: ErrorEntry[] | null = null;
let flushing = false;

/** Text for something thrown that is not an Error (a string, an event, an object that cannot become JSON). */
function describe(e: unknown): string {
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e) ?? String(e);
  } catch {
    return String(e);
  }
}

function load(): ErrorEntry[] {
  if (list) return list;
  list = [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    if (Array.isArray(raw)) list = raw.filter((e): e is ErrorEntry => !!e && typeof (e as ErrorEntry).msg === 'string').slice(-MAX);
  } catch {
    // no storage or a broken entry: start a new list
  }
  return list;
}

/** Written at most once a second: an error in every frame must not make every frame slow too. */
function flushSoon(): void {
  if (flushing) return;
  flushing = true;
  setTimeout(() => {
    flushing = false;
    try {
      localStorage.setItem(KEY, JSON.stringify(load()));
    } catch {
      // full or private storage: the list lives until the page is closed
    }
  }, 1000);
}

/** Notes an error (the console shows each kind once). */
export function logError(where: string, e: unknown): void {
  const err = e instanceof Error ? e : new Error(describe(e));
  const msg = `${err.name}: ${err.message}`.slice(0, 300);
  const items = load();
  const same = items.find((x) => x.where === where && x.msg === msg);
  if (same) {
    same.n++;
    same.at = Date.now();
  } else {
    console.error(`[${where}]`, e);
    items.push({ where, msg, stack: (err.stack ?? '').split('\n').slice(0, 6).join('\n').slice(0, 900), n: 1, at: Date.now() });
    while (items.length > MAX) items.shift();
  }
  flushSoon();
}

/** The kept errors, the newest last. */
export function errorLog(): readonly ErrorEntry[] {
  return load();
}

export function clearErrors(): void {
  list = [];
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing kept anyway
  }
}

/** Errors nobody caught (a click handler, a timer, a promise) are noted too. */
export function installErrorLog(): void {
  window.addEventListener('error', (ev) => logError('window', ev.error ?? ev.message));
  window.addEventListener('unhandledrejection', (ev) => logError('promise', ev.reason));
}
