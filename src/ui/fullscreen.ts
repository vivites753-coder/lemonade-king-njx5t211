// Full screen: on phones the first tap makes the game fill the whole screen (where the browser allows it).
// The player can switch it off in the settings; the choice is remembered on this device.
const OFF_KEY = 'lk.noFullscreen';

function storedOff(): boolean {
  try {
    return localStorage.getItem(OFF_KEY) === '1';
  } catch {
    return false;
  }
}

function storeOff(off: boolean): void {
  try {
    if (off) localStorage.setItem(OFF_KEY, '1');
    else localStorage.removeItem(OFF_KEY);
  } catch {
    /* private mode: nothing to remember */
  }
}

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };

export function isFullscreen(): boolean {
  const d = document as FsDoc;
  return !!(d.fullscreenElement ?? d.webkitFullscreenElement);
}

async function enter(): Promise<void> {
  const el = document.documentElement as FsEl;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else el.webkitRequestFullscreen?.();
  } catch {
    return;
  }
}

/** The settings button: full screen on or off. */
export function toggleFullscreen(): void {
  if (isFullscreen()) {
    storeOff(true);
    const d = document as FsDoc;
    if (d.exitFullscreen) void d.exitFullscreen();
    else d.webkitExitFullscreen?.();
  } else {
    storeOff(false);
    void enter();
  }
}

/** Tracks the real height of the screen (phone browsers have bars that come and go) and, when askFull, asks for full
 * screen on the first tap. */
export function initFullscreen(askFull = true): void {
  const setH = () => document.documentElement.style.setProperty('--app-h', `${window.innerHeight}px`);
  setH();
  window.addEventListener('resize', setH);
  window.addEventListener('orientationchange', () => setTimeout(setH, 250));
  document.addEventListener('fullscreenchange', () => setTimeout(setH, 100));
  // a phone or a tablet; Samsung devices report their touch screen as a touchpad ("fine" pointer), so the screen
  // size of a touch device counts too
  const touch = window.matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) < 700);
  if (!askFull || !touch) return;
  // one try on the first tap only: a refused request must never be repeated on every tap
  let tried = false;
  const ask = () => {
    if (tried || isFullscreen() || storedOff()) return;
    tried = true;
    void enter();
  };
  window.addEventListener('pointerup', ask, { passive: true });
}
